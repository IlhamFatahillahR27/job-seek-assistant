/**
 * Email Template Generator and Iterative Refinement Service
 * Connects to Google Gemini API adhering strictly to AI_ASSISTANT_GUARDRAILS.md
 * (Templates 2 & 3), supports multi-language generation (id, en, auto),
 * executes runtime post-generation guardrail spot-checks, and provides high-fidelity demo mocks.
 */

import type {
  EmailTone,
  EmailLanguage,
  GeneratedEmailTemplate,
  EmailRefinementResult,
  RawEmailTemplatesResponse,
  RawEmailRefinementResponse,
} from '@/types/email'
import type { JobDetails } from '@/types/job'
import { GeminiClientError } from './geminiClient'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_MODEL = 'gemini-2.0-flash'
const REQUEST_TIMEOUT_MS = 45000

export class EmailGeneratorService {
  /**
   * System Prompt for Email Template Generation (Template 2)
   * Strictly adheres to plans/AI_ASSISTANT_GUARDRAILS.md
   */
  private static SYSTEM_PROMPT_GENERATION = `Anda adalah "Executive Career Pitch Writer" profesional. Tugas Anda adalah membuat draf email lamaran kerja atau pesan pengantar ke recruiter berdasarkan data lowongan (<job_posting>), profil asli kandidat (<candidate_cv>), dan target bahasa yang ditentukan (<target_language>).

ATURAN UTAMA (BATASAN KONTEKS, INTEGRITAS & BAHASA):
1. Anda DILARANG KERAS mencantumkan klaim pengalaman, perusahaan sebelumnya, atau keterampilan teknis yang TIDAK ADA di dalam <candidate_cv>.
2. Jika posisi membutuhkan kualifikasi yang tidak dimiliki kandidat, fokuskan email pada kekuatan asli kandidat dan kemampuannya mempelajari hal baru, TANPA pernah berbohong bahwa kandidat menguasai keahlian yang hilang tersebut.
3. Gunakan bahasa yang ditentukan pada <target_language> (misalnya: "id" untuk Bahasa Indonesia, "en" untuk English, atau deteksi otomatis sesuai bahasa pada <job_posting>). Pastikan tata bahasa, salam pembuka, dan etika profesional sesuai dengan standar bahasa tersebut. JANGAN menerjemahkan istilah teknologi atau judul peran secara harfiah (contoh: tetap gunakan "Frontend Developer", "Continuous Integration", "TypeScript").
4. Buatlah 3 opsi email dengan gaya komunikasi berbeda:
   - "formal": Gaya bahasa sopan, terstruktur, cocok untuk perusahaan korporat.
   - "impact_focused": Berorientasi pada hasil dan pencapaian proyek nyata dari CV.
   - "concise_pitch": Singkat, padat (di bawah 150 kata), langsung menonjolkan kecocokan utama.
5. Berikan Subject Line yang jelas, profesional, dan relevan dengan posisi lowongan dalam bahasa yang dipilih.
6. Output WAJIB dalam format JSON valid.

SKEMA JSON OUTPUT:
{
  "templates": [
    {
      "id": "formal" | "impact_focused" | "concise_pitch",
      "title": string,
      "language": string,
      "subject": string,
      "body": string,
      "highlighted_cv_points": [string]
    }
  ]
}`

  /**
   * System Prompt for Iterative Refinement (Template 3)
   * Strictly adheres to plans/AI_ASSISTANT_GUARDRAILS.md
   */
  private static SYSTEM_PROMPT_REFINEMENT = `Anda adalah "Email Refinement Assistant". Tugas Anda adalah memodifikasi draf email lamaran yang ada berdasarkan masukan/instruksi spesifik dari pengguna (<user_feedback>), data lowongan (<job_posting>), profil asli kandidat (<candidate_cv>), dan target bahasa (<target_language>).

ATURAN UTAMA (BATASAN KONTEKS & INTEGRITAS):
1. Anda DILARANG menambahkan klaim keahlian atau pengalaman kerja baru di luar fakta yang tercantum dalam <candidate_cv>, meskipun pengguna secara tidak sengaja meminta hal tersebut.
2. Fokuskan revisi pada penyesuaian nada bicara (tone), struktur kalimat, penekanan proyek tertentu, panjang-pendeknya teks, atau perubahan bahasa sesuai arahan di <user_feedback> dan <target_language>.
3. Kembalikan versi revisi lengkap yang siap digunakan beserta ringkasan singkat perubahan yang telah diterapkan.
4. Output WAJIB dalam format JSON valid.

SKEMA JSON OUTPUT:
{
  "revised_subject": string,
  "revised_body": string,
  "language": string,
  "changes_summary": string
}`

  /**
   * Helper to detect dominant language of a job posting
   */
  static detectJobLanguage(text: string): 'id' | 'en' {
    if (!text || !text.trim()) return 'id'
    const lower = text.toLowerCase()
    const idKeywords = [
      'lowongan', 'posisi', 'kualifikasi', 'tanggung jawab', 'pengalaman',
      'persyaratan', 'kami', 'perusahaan', 'keahlian', 'kemampuan',
      'bidang', 'bekerja', 'kirim', 'surat', 'lamaran', 'minimal', 'lokasi',
      'mencari', 'untuk', 'dengan', 'yang', 'dalam', 'dan', 'adalah', 'membangun',
    ]

    let idScore = 0
    for (const kw of idKeywords) {
      if (lower.includes(kw)) idScore++
    }

    return idScore >= 2 ? 'id' : 'en'
  }

  /**
   * Resolve target language based on selection and job text
   */
  static resolveLanguage(selected: EmailLanguage, job: JobDetails): 'id' | 'en' {
    if (selected === 'id') return 'id'
    if (selected === 'en') return 'en'
    return this.detectJobLanguage(`${job.title} ${job.description} ${job.requirements || ''}`)
  }

  /**
   * Spot-check text against missing skills for anti-hallucination guardrail
   */
  static spotCheckMissingSkills(text: string, missingSkills?: string[]): string[] {
    if (!missingSkills || missingSkills.length === 0 || !text) return []
    const warnings: string[] = []
    const lowerText = text.toLowerCase()

    for (const rawReq of missingSkills) {
      const cleanReq = rawReq.toLowerCase().trim()
      if (cleanReq.length < 3) continue

      // Break requirement into significant keywords
      const tokens = cleanReq
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !['pengalaman', 'keahlian', 'kemampuan', 'experience', 'knowledge', 'skills'].includes(w))

      for (const token of tokens) {
        if (lowerText.includes(token)) {
          const warningMsg = `Periksa draf: Disebutkan kualifikasi "${rawReq}" yang sebelumnya teridentifikasi sebagai Skill Gap di luar CV Anda.`
          if (!warnings.includes(warningMsg)) {
            warnings.push(warningMsg)
          }
        }
      }
    }

    return warnings
  }

  /**
   * Generate 3 email templates based on CV, Job, and Language
   */
  static async generateTemplates(options: {
    apiKey: string
    model?: string
    cvText: string
    job: JobDetails
    language?: EmailLanguage
    isDemo?: boolean
    missingSkills?: string[]
  }): Promise<GeneratedEmailTemplate[]> {
    const { apiKey, cvText, job, language = 'auto', isDemo = false, missingSkills = [] } = options
    const resolvedLang = this.resolveLanguage(language, job)

    if (isDemo || !apiKey?.trim()) {
      return this.generateMockTemplates(job, cvText, resolvedLang, missingSkills)
    }

    const model = (options.model || DEFAULT_MODEL).replace(/^models\//, '').trim() || DEFAULT_MODEL
    const safeCv = (cvText || '')
      .replace(/<\/?candidate_cv[^>]*>/gi, '[candidate_cv]')
      .replace(/<\/?job_posting[^>]*>/gi, '[job_posting]')
      .trim()
    const safeDesc = (job.description || '')
      .replace(/<\/?job_posting[^>]*>/gi, '[job_posting]')
      .trim()
    const safeReq = (job.requirements || '')
      .replace(/<\/?job_posting[^>]*>/gi, '[job_posting]')
      .trim()

    const userPrompt = `Buatlah 3 template email lamaran kerja berdasarkan data berikut:

<target_language>
${resolvedLang === 'id' ? 'Bahasa Indonesia (id)' : 'English (en)'}
</target_language>

<candidate_cv>
${safeCv}
</candidate_cv>

<job_posting>
Judul Posisi: ${job.title || 'Tidak ditentukan'}
Nama Perusahaan: ${job.company || 'Tidak ditentukan'}
Lokasi: ${job.location || 'Tidak ditentukan'}

Deskripsi Pekerjaan:
${safeDesc || 'Tidak ada deskripsi'}

Persyaratan:
${safeReq || 'Lihat deskripsi'}
</job_posting>

Berikan 3 opsi gaya (formal, impact_focused, concise_pitch) dalam format JSON valid sesuai skema.`

    const payload = {
      systemInstruction: {
        parts: [{ text: this.SYSTEM_PROMPT_GENERATION }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`
        try {
          const errData = await res.json()
          if (errData?.error?.message) errorMsg = errData.error.message
        } catch {
          // ignore
        }
        throw new GeminiClientError(`Gagal membuat template email: ${errorMsg}`, res.status)
      }

      const responseData = await res.json()
      const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!rawText) {
        throw new GeminiClientError('Model tidak mengembalikan respon teks yang valid.')
      }

      const parsed: RawEmailTemplatesResponse = this.parseJsonSafe(rawText)
      const templates = parsed.templates || []

      return templates.map((t) => {
        const warnings = this.spotCheckMissingSkills(`${t.subject} ${t.body}`, missingSkills)
        let toneId: EmailTone = 'formal'
        if (t.id === 'impact_focused' || t.id === 'project') toneId = 'impact_focused'
        else if (t.id === 'concise_pitch' || t.id === 'concise') toneId = 'concise_pitch'

        return {
          id: toneId,
          title: t.title || (toneId === 'formal' ? 'Formal & Professional' : toneId === 'impact_focused' ? 'Impact & Project-Focused' : 'Concise Pitch'),
          language: t.language || resolvedLang,
          subject: t.subject,
          body: t.body,
          highlightedCvPoints: t.highlighted_cv_points,
          hallucinationWarnings: warnings.length > 0 ? warnings : undefined,
        }
      })
    } catch (err: any) {
      if (err instanceof GeminiClientError) throw err
      if (err.name === 'AbortError') {
        throw new GeminiClientError('Waktu permintaan habis saat membuat template email.')
      }
      throw new GeminiClientError(err.message || 'Terjadi kesalahan saat memanggil Gemini API.')
    }
  }

  /**
   * Refine an existing email draft based on user feedback (Template 3)
   */
  static async refineDraft(options: {
    apiKey: string
    model?: string
    cvText: string
    job: JobDetails
    currentSubject: string
    currentBody: string
    feedback: string
    language?: EmailLanguage
    isDemo?: boolean
    missingSkills?: string[]
  }): Promise<EmailRefinementResult> {
    const {
      apiKey,
      cvText,
      job,
      currentSubject,
      currentBody,
      feedback,
      language = 'auto',
      isDemo = false,
      missingSkills = [],
    } = options

    const resolvedLang = this.resolveLanguage(language, job)

    if (isDemo || !apiKey?.trim()) {
      return this.refineMockDraft(currentSubject, currentBody, feedback, resolvedLang, missingSkills)
    }

    const model = (options.model || DEFAULT_MODEL).replace(/^models\//, '').trim() || DEFAULT_MODEL
    const safeCv = (cvText || '')
      .replace(/<\/?candidate_cv[^>]*>/gi, '[candidate_cv]')
      .replace(/<\/?job_posting[^>]*>/gi, '[job_posting]')
      .trim()
    const safeSubject = (currentSubject || '').replace(/[\r\n]+/g, ' ').trim()
    const safeBody = (currentBody || '').replace(/<\/?current_draft[^>]*>/gi, '[current_draft]').trim()
    const safeFeedback = (feedback || '').replace(/<\/?user_feedback[^>]*>/gi, '[user_feedback]').trim()

    const userPrompt = `Modifikasi draf email lamaran berikut berdasarkan instruksi masukan pengguna:

<target_language>
${resolvedLang === 'id' ? 'Bahasa Indonesia (id)' : 'English (en)'}
</target_language>

<candidate_cv>
${safeCv}
</candidate_cv>

<job_posting>
Posisi: ${job.title || 'Tidak ditentukan'}
Perusahaan: ${job.company || 'Tidak ditentukan'}
</job_posting>

<current_draft>
Subject: ${safeSubject}

Body:
${safeBody}
</current_draft>

<user_feedback>
${safeFeedback}
</user_feedback>

Berikan versi revisi lengkap dalam format JSON valid sesuai skema.`

    const payload = {
      systemInstruction: {
        parts: [{ text: this.SYSTEM_PROMPT_REFINEMENT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`
        try {
          const errData = await res.json()
          if (errData?.error?.message) errorMsg = errData.error.message
        } catch {
          // ignore
        }
        throw new GeminiClientError(`Gagal merevisi email: ${errorMsg}`, res.status)
      }

      const responseData = await res.json()
      const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!rawText) {
        throw new GeminiClientError('Model tidak mengembalikan respon revisi yang valid.')
      }

      const parsed: RawEmailRefinementResponse = this.parseJsonSafe(rawText)
      const warnings = this.spotCheckMissingSkills(
        `${parsed.revised_subject} ${parsed.revised_body}`,
        missingSkills
      )

      return {
        revisedSubject: parsed.revised_subject || currentSubject,
        revisedBody: parsed.revised_body || currentBody,
        language: parsed.language || resolvedLang,
        changesSummary: parsed.changes_summary || 'Perubahan draf telah diterapkan sesuai instruksi Anda.',
        hallucinationWarnings: warnings.length > 0 ? warnings : undefined,
      }
    } catch (err: any) {
      if (err instanceof GeminiClientError) throw err
      if (err.name === 'AbortError') {
        throw new GeminiClientError('Waktu permintaan habis saat merevisi template email.')
      }
      throw new GeminiClientError(err.message || 'Terjadi kesalahan saat memanggil Gemini API.')
    }
  }

  /**
   * Helper to parse JSON from AI response cleanly
   */
  private static parseJsonSafe(rawText: string): any {
    let cleaned = (rawText || '').trim()

    // Extract content from markdown code fences if present
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim()
    } else {
      // If no fence, isolate outermost JSON object bounds { ... }
      const firstBrace = cleaned.indexOf('{')
      const lastBrace = cleaned.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1).trim()
      }
    }
    return JSON.parse(cleaned)
  }

  /**
   * High-fidelity Demo Mock Templates generator
   */
  static generateMockTemplates(
    job: JobDetails,
    cvText: string,
    lang: 'id' | 'en',
    missingSkills?: string[]
  ): GeneratedEmailTemplate[] {
    const jobTitle = job.title || 'Senior Frontend Engineer'
    const company = job.company || 'Tech Titan Nusantara'
    const firstLine = (cvText || '').split('\n').map((l) => l.trim()).find((l) => l.length > 0) || ''
    const candidateName =
      firstLine &&
      !firstLine.includes('@') &&
      !firstLine.includes('http') &&
      !firstLine.includes('+') &&
      firstLine.length < 50
        ? firstLine
        : 'Test User'

    if (lang === 'en') {
      const formalBody = `Dear Hiring Team at ${company},

I am writing to express my enthusiastic interest in the ${jobTitle} position at ${company}. With over 5 years of professional experience in modern web architecture, Vue 3, and TypeScript, I have consistently built and scaled high-performance web applications.

In my previous roles, I led frontend architectural refactoring that improved Core Web Vitals by 45% and reduced application bundle size by 30%. Given ${company}'s dedication to product excellence, I am confident that my technical background in modular design systems and automated testing aligns directly with your team's needs.

Attached is my complete CV for your review. I would welcome the opportunity to discuss how my skill set and experience can support your upcoming product milestones.

Thank you for your time and consideration.

Warm regards,
${candidateName}`

      const impactBody = `Hi ${company} Hiring Team,

I've been following ${company}'s recent technical milestones and would love to bring my frontend engineering experience to the ${jobTitle} role.

Key highlights from my recent projects include:
- Leading the enterprise UI architecture serving over 100,000 daily active users using Vue 3 and TypeScript.
- Improving render performance by 45% with Vite code-splitting and optimizing web vitals.
- Mentoring engineers and establishing end-to-end automated testing pipelines with Vitest.

I have attached my resume for further details and look forward to the possibility of discussing how I can deliver immediate impact to ${company}'s frontend ecosystem.

Best regards,
${candidateName}`

      const conciseBody = `Hi ${company} Recruitment Team,

I'm applying for the ${jobTitle} position at ${company}. With 5+ years of engineering experience specializing in Vue 3, TypeScript, and high-scale web platforms, I have a proven record of optimizing web performance and driving clean component architectures.

Please find my resume attached. I'd love to connect for a quick 15-minute introductory conversation.

Thanks and best regards,
${candidateName}`

      return [
        {
          id: 'formal',
          title: 'Formal & Professional',
          language: 'en',
          subject: `Application for ${jobTitle} - ${candidateName}`,
          body: formalBody,
          highlightedCvPoints: ['5+ years web architecture', 'Vue 3 & TypeScript specialization'],
          hallucinationWarnings: this.spotCheckMissingSkills(formalBody, missingSkills),
        },
        {
          id: 'impact_focused',
          title: 'Impact & Project-Focused',
          language: 'en',
          subject: `${jobTitle} Application: Delivering High-Performance Web Solutions for ${company}`,
          body: impactBody,
          highlightedCvPoints: ['45% Core Web Vitals boost', 'Enterprise 100k DAU platform'],
          hallucinationWarnings: this.spotCheckMissingSkills(impactBody, missingSkills),
        },
        {
          id: 'concise_pitch',
          title: 'Concise Pitch',
          language: 'en',
          subject: `${jobTitle} Application - ${candidateName}`,
          body: conciseBody,
          highlightedCvPoints: ['Quick recruiter pitch', 'Ready to connect'],
          hallucinationWarnings: this.spotCheckMissingSkills(conciseBody, missingSkills),
        },
      ]
    }

    // Default Indonesian templates
    const formalBodyId = `Yth. Tim Rekrutmen ${company},

Perkenalkan, saya ${candidateName}, seorang software engineer dengan pengalaman lebih dari 5 tahun dalam membangun aplikasi web modern berskala besar menggunakan Vue 3 dan TypeScript. Melalui email ini, saya bermaksud untuk mengajukan diri pada posisi ${jobTitle} di ${company}.

Berdasarkan kualifikasi yang dicantumkan, rekam jejak saya dalam memimpin refaktor arsitektur frontend—yang berhasil meningkatkan Web Vitals sebesar 45% dan menurunkan bundle size hingga 30%—sangat selaras dengan target keandalan sistem produk di ${company}.

Bersama email ini, saya melampirkan berkas CV lengkap untuk bahan pertimbangan. Saya sangat terbuka untuk berdiskusi lebih mendalam mengenai bagaimana kompetensi saya dapat memberikan kontribusi nyata bagi tim Anda.

Atas perhatian dan kesempatan yang diberikan, saya sampaikan terima kasih.

Hormat saya,
${candidateName}`

    const impactBodyId = `Yth. Hiring Manager ${company},

Saya mengagumi inovasi teknologi yang terus dikembangkan oleh tim ${company}. Melalui email ini, saya mengajukan lamaran untuk posisi ${jobTitle} guna menghadirkan keahlian arsitektur web modern yang berorientasi pada performa.

Beberapa pencapaian relevan yang telah saya selesaikan:
- Memimpin pengembangan platform enterprise berbasis Vue 3 dan TypeScript yang melayani lebih dari 100.000 pengguna harian.
- Mengoptimalkan build pipeline dengan Vite dan automated testing Vitest yang memangkas waktu load hingga 45%.
- Mengarsiteki komponen UI modular yang diadopsi lintas divisi produk.

CV lengkap telah saya lampirkan. Saya siap berdiskusi lebih lanjut untuk memaparkan bagaimana pengalaman ini dapat mempercepat pencapaian tujuan ${company}.

Salam hangat,
${candidateName}`

    const conciseBodyId = `Halo Tim Rekrutmen ${company},

Saya tertarik untuk mengisi posisi ${jobTitle} di ${company}. Saya memiliki pengalaman 5+ tahun dalam pengembangan frontend dengan Vue 3, TypeScript, dan arsitektur aplikasi berskala besar.

Portofolio dan CV lengkap telah saya lampirkan. Saya sangat antusias untuk berdiskusi singkat apabila profil saya sesuai dengan kriteria yang dibutuhkan tim.

Terima kasih atas waktu Anda.

Salam,
${candidateName}`

    return [
      {
        id: 'formal',
        title: 'Formal & Baku',
        language: 'id',
        subject: `Lamaran Posisi ${jobTitle} - ${candidateName}`,
        body: formalBodyId,
        highlightedCvPoints: ['Pengalaman arsitektur Vue 3', 'Peningkatan Web Vitals 45%'],
        hallucinationWarnings: this.spotCheckMissingSkills(formalBodyId, missingSkills),
      },
      {
        id: 'impact_focused',
        title: 'Fokus Dampak & Proyek',
        language: 'id',
        subject: `Lamaran ${jobTitle}: Membawa Keahlian Performa Web untuk ${company}`,
        body: impactBodyId,
        highlightedCvPoints: ['Platform 100k DAU', 'Optimasi Vite & Vitest'],
        hallucinationWarnings: this.spotCheckMissingSkills(impactBodyId, missingSkills),
      },
      {
        id: 'concise_pitch',
        title: 'Ringkas & Langsung',
        language: 'id',
        subject: `Aplikasi ${jobTitle}: ${candidateName}`,
        body: conciseBodyId,
        highlightedCvPoints: ['Ringkas di bawah 150 kata', 'Langsung ke inti kualifikasi'],
        hallucinationWarnings: this.spotCheckMissingSkills(conciseBodyId, missingSkills),
      },
    ]
  }

  /**
   * High-fidelity Demo Refinement generator
   */
  static refineMockDraft(
    currentSubject: string,
    currentBody: string,
    feedback: string,
    lang: 'id' | 'en',
    missingSkills?: string[]
  ): EmailRefinementResult {
    const lowerFb = feedback.toLowerCase()
    const matchName = currentBody.match(/(?:Warm regards|Best regards|Hormat saya|Salam hangat|Salam)[\s,]*\n+([^\n]+)$/i)
    const candidateName = matchName ? matchName[1].trim() : 'Test User'
    let revisedSubject = currentSubject
    let revisedBody = currentBody
    let summary = 'Draf email telah diperbarui berdasarkan masukan Anda.'

    if (lowerFb.includes('inggris') || lowerFb.includes('english') || lowerFb.includes('translate to en')) {
      revisedSubject = currentSubject.replace('Lamaran Posisi', 'Application for').replace('Aplikasi', 'Application:')
      revisedBody = `Dear Hiring Team,\n\nI am writing to express my interest in this position. Based on my technical experience in scalable frontend architecture, Vue 3, and TypeScript, I look forward to bringing high-impact contributions to your team.\n\nPlease find my resume attached.\n\nBest regards,\n${candidateName}`
      summary = 'Bahasa email berhasil dialihkan ke Bahasa Inggris profesional.'
    } else if (lowerFb.includes('indonesia') || lowerFb.includes('bahasa indonesia')) {
      revisedSubject = currentSubject.replace('Application for', 'Lamaran Posisi')
      revisedBody = `Yth. Tim Rekrutmen,\n\nMelalui email ini saya bermaksud mengajukan diri untuk posisi yang sedang dibuka. Berbekal pengalaman dalam arsitektur web modern, Vue 3, dan TypeScript, saya siap memberikan kontribusi optimal bagi tim Anda.\n\nTerlampir CV lengkap saya untuk bahan pertimbangan.\n\nHormat saya,\n${candidateName}`
      summary = 'Bahasa email berhasil dialihkan ke Bahasa Indonesia formal.'
    } else if (lowerFb.includes('singkat') || lowerFb.includes('concise') || lowerFb.includes('pendek')) {
      revisedBody = currentBody.split('\n\n').slice(0, 3).join('\n\n') + '\n\nTerima kasih atas perhatiannya.'
      summary = 'Teks email dipadatkan agar lebih ringkas dan langsung ke inti.'
    } else if (lowerFb.includes('ramah') || lowerFb.includes('santai') || lowerFb.includes('friendly')) {
      if (currentBody.includes('Yth.') || currentBody.includes('Hormat saya')) {
        revisedBody = currentBody.replace(/Yth\.\s+Tim Rekrutmen/gi, 'Halo Tim Rekrutmen yang luar biasa')
          .replace(/Hormat saya/gi, 'Salam hangat dan penuh semangat')
      } else {
        revisedBody = currentBody.replace(/Dear\s+([^\n,]+)/gi, 'Hello and warm greetings to $1')
          .replace(/Warm regards/gi, 'Warmest regards and great enthusiasm')
          .replace(/Best regards/gi, 'Warmest regards')
          .replace(/Hi\s+([^\n,]+)/gi, 'Hello and warm greetings to $1')
      }
      if (revisedBody === currentBody) {
        revisedBody = `Warm greetings!\n\n${currentBody}\n\nLooking forward to speaking with you with great enthusiasm!`
      }
      summary = 'Salam pembuka dan penutup disesuaikan agar lebih hangat dan ramah.'
    } else if (lowerFb.includes('metrik') || lowerFb.includes('proyek') || lowerFb.includes('impact')) {
      revisedBody = currentBody + '\n\nP.S. Saya juga melampirkan portofolio metrik optimasi performa web yang relevan dengan kebutuhan proyek ini.'
      summary = 'Penekanan metrik proyek dan portofolio telah ditambahkan ke dalam draf.'
    } else {
      revisedBody = `${currentBody}\n\nCatatan Tambahan: Saya sangat antusias untuk mendiskusikan implementasi spesifik terkait ${feedback}.`
      summary = `Instruksi "${feedback.slice(0, 40)}..." telah diakomodasi ke dalam draf.`
    }

    const warnings = this.spotCheckMissingSkills(`${revisedSubject} ${revisedBody}`, missingSkills)

    return {
      revisedSubject,
      revisedBody,
      language: lang,
      changesSummary: summary,
      hallucinationWarnings: warnings.length > 0 ? warnings : undefined,
    }
  }
}
