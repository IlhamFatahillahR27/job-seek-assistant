/**
 * Google Gemini API Client Service
 * Handles ModelService.ListModels, API key validation, model generation,
 * automatic model discovery, error mapping, and fallback demo modes.
 * Implements context boundary isolation and zero-hallucination prompts.
 */

import type {
  GeminiRawAnalysisResponse,
  ConnectionValidationResult,
  GeminiModelInfo,
} from '@/types/analysis'
import type { JobDetails } from '@/types/job'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_MODEL = 'gemini-2.0-flash'
const REQUEST_TIMEOUT_MS = 45000

export class GeminiClientError extends Error {
  public status?: number
  public isRateLimit: boolean
  public isAuthError: boolean
  public isModelNotFoundError: boolean

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GeminiClientError'
    this.status = status
    this.isRateLimit = status === 429
    this.isAuthError = status === 400 || status === 401 || status === 403
    this.isModelNotFoundError =
      status === 404 ||
      message.includes('not found') ||
      message.includes('not supported for generateContent')
  }
}

export class GeminiClientService {
  /**
   * System Prompt strictly adhering to plans/AI_ASSISTANT_GUARDRAILS.md (Template 1)
   */
  private static SYSTEM_PROMPT = `Anda adalah "Job Match Analyst" objektif dan berbasis fakta. Tugas Anda adalah mengevaluasi kecocokan antara profil kandidat (<candidate_cv>) dan lowongan kerja yang sedang dibuka (<job_posting>).

ATURAN UTAMA (BATASAN KONTEKS & NOL HALUSINASI):
1. Anda HANYA boleh mengambil fakta mengenai pengalaman, keahlian, dan kualifikasi dari data yang terdapat di dalam <candidate_cv>. DILARANG KERAS menambahkan, mengarang, atau mengasumsikan keterampilan yang tidak tertulis.
2. Jika lowongan membutuhkan keahlian yang tidak terdapat di <candidate_cv>, Anda WAJIB mencantumkannya sebagai "missing_skills" (kesenjangan kualifikasi), BUKAN mengklaim kandidat memilikinya.
3. Evaluasi skor relevansi (0 - 100%) secara realistis dan adil berdasarkan persentase syarat lowongan yang benar-benar dipenuhi oleh CV kandidat.
4. Jangan berasumsi metrik atau dampak kuantitatif jika tidak tercantum di CV.
5. Output WAJIB dalam format JSON yang valid dan mematuhi skema yang ditentukan tanpa teks pengantar markdown tambahan.

SKEMA JSON OUTPUT:
{
  "relevance_score": number, // Nilai integer 0 - 100
  "match_level": "High" | "Moderate" | "Low",
  "match_summary": string, // Ringkasan singkat 2-3 kalimat mengenai kecocokan utama
  "matched_skills": [
    {
      "skill": string,
      "cv_evidence": string // Cuplikan bukti dari CV pengguna
    }
  ],
  "missing_skills": [
    {
      "requirement": string,
      "importance": "Crucial" | "Preferred",
      "recommendation": string // Saran cara menyikapi gap ini (misal: transferable skill)
    }
  ],
  "interview_highlights": [
    string // 2-3 poin pengalaman terkuat kandidat yang paling bernilai jual untuk posisi ini
  ]
}`

  /**
   * Query ModelService.ListModels to fetch available models supporting generateContent
   */
  static async listModels(apiKey: string): Promise<GeminiModelInfo[]> {
    const trimmedKey = apiKey.trim()
    if (!trimmedKey) {
      throw new GeminiClientError('API Key tidak boleh kosong.', 401)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    try {
      const url = `${GEMINI_API_BASE}/models?key=${encodeURIComponent(trimmedKey)}`
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        let errMessage = `Koneksi gagal (${res.status} ${res.statusText})`
        try {
          const errData = await res.json()
          if (errData?.error?.message) {
            errMessage = errData.error.message
          }
        } catch {
          // ignore
        }
        throw new GeminiClientError(errMessage, res.status)
      }

      const data = await res.json()
      const models: GeminiModelInfo[] = []

      if (Array.isArray(data?.models)) {
        for (const m of data.models) {
          const rawName: string = m.name || ''
          const id = rawName.replace(/^models\//, '')
          const supported: string[] = Array.isArray(m.supportedGenerationMethods)
            ? m.supportedGenerationMethods
            : []

          // Check if model supports content generation
          const supportsGenerate =
            supported.includes('generateContent') ||
            (supported.length === 0 && id.includes('gemini'))
          const isExcluded =
            id.includes('embedding') ||
            id.includes('aqa') ||
            id.includes('imagen')

          if (supportsGenerate && !isExcluded) {
            models.push({
              id,
              name: rawName,
              displayName: m.displayName || id,
              description: m.description,
              supportedGenerationMethods: supported,
            })
          }
        }
      }

      // Sort models: Flash models first, then Pro models, newest versions first
      models.sort((a, b) => {
        const scoreModel = (m: GeminiModelInfo) => {
          let score = 0
          if (m.id.includes('flash')) score += 100
          if (m.id.includes('2.5')) score += 40
          else if (m.id.includes('2.0')) score += 30
          else if (m.id.includes('1.5')) score += 20
          if (m.id.includes('latest')) score += 5
          if (m.id.includes('lite') || m.id.includes('8b')) score -= 10
          if (m.id.includes('pro')) score += 50
          return score
        }
        return scoreModel(b) - scoreModel(a)
      })

      return models
    } catch (err: any) {
      if (err instanceof GeminiClientError) throw err
      const isTimeout = err.name === 'AbortError'
      throw new GeminiClientError(
        isTimeout
          ? 'Waktu koneksi habis (timeout) saat memuat daftar model.'
          : (err.message || 'Gagal terhubung ke ModelService.ListModels.'),
        504
      )
    }
  }

  /**
   * Determine the best default model from an available models list
   */
  static getBestDefaultModel(models: GeminiModelInfo[]): string {
    if (!models || models.length === 0) return DEFAULT_MODEL
    const flash = models.find(
      (m) =>
        m.id.includes('flash') &&
        !m.id.includes('lite') &&
        !m.id.includes('8b')
    )
    if (flash) return flash.id
    const anyFlash = models.find((m) => m.id.includes('flash'))
    if (anyFlash) return anyFlash.id
    return models[0].id
  }

  /**
   * Test API key validity instantly by querying ModelService.ListModels
   * Does not consume generation tokens.
   */
  static async validateApiKey(apiKey: string): Promise<ConnectionValidationResult> {
    const trimmedKey = apiKey.trim()
    const now = new Date().toISOString()

    if (!trimmedKey) {
      return {
        valid: false,
        errorMessage: 'API Key tidak boleh kosong.',
        testedAt: now,
      }
    }

    try {
      const models = await this.listModels(trimmedKey)
      const modelIds = models.map((m) => m.id)

      return {
        valid: true,
        models: modelIds.length > 0 ? modelIds : [DEFAULT_MODEL, 'gemini-1.5-flash'],
        availableModels: models,
        testedAt: now,
      }
    } catch (err: any) {
      let msg = err.message || 'Gagal terhubung ke Google Gemini API.'
      if (err.status === 400 || err.status === 403) {
        msg = 'API Key Gemini tidak valid atau tidak memiliki akses ke Google AI Studio.'
      } else if (err.status === 429) {
        msg = 'Batas permintaan (Rate Limit) tercapai. Silakan coba lagi sebentar lagi.'
      }

      return {
        valid: false,
        errorMessage: msg,
        testedAt: now,
      }
    }
  }

  /**
   * Request Gemini to analyze Job Match against candidate CV.
   * Includes automatic recovery if the requested model is not found in v1beta.
   */
  static async analyzeJobMatch(options: {
    apiKey: string
    model?: string
    cvText: string
    job: JobDetails
  }): Promise<GeminiRawAnalysisResponse & { usedModel?: string }> {
    const apiKey = options.apiKey.trim()
    let model = (options.model || DEFAULT_MODEL).replace(/^models\//, '').trim() || DEFAULT_MODEL
    const { cvText, job } = options

    if (!apiKey) {
      throw new GeminiClientError('Gemini API Key belum dikonfigurasi. Kunjungi tab Pengaturan.', 401)
    }
    if (!cvText.trim()) {
      throw new GeminiClientError('Data CV kandidat belum tersedia. Pilih atau unggah CV terlebih dahulu di tab Profil CV.')
    }
    if (!job.title.trim() && !job.description.trim()) {
      throw new GeminiClientError('Informasi lowongan kerja masih kosong. Ekstrak halaman atau input secara manual.')
    }

    const userPrompt = this.buildAnalysisPrompt(cvText, job)

    try {
      const result = await this.executeGenerateContent(apiKey, model, userPrompt)
      return { ...result, usedModel: model }
    } catch (err: any) {
      // Check if error is "model not found" or "not supported for generateContent"
      const isNotFound =
        err instanceof GeminiClientError && err.isModelNotFoundError

      if (isNotFound) {
        console.warn(
          `[GeminiClient] Model "${model}" is not found or not supported for generateContent. Querying ModelService.ListModels for fallback...`
        )
        try {
          const availableModels = await this.listModels(apiKey)
          const fallbackModel = this.getBestDefaultModel(availableModels)

          if (fallbackModel && fallbackModel !== model) {
            console.info(`[GeminiClient] Retrying with available model: "${fallbackModel}"`)
            const retryResult = await this.executeGenerateContent(apiKey, fallbackModel, userPrompt)
            return { ...retryResult, usedModel: fallbackModel }
          }
        } catch {
          // If fallback fails, re-throw the original error
        }
      }

      throw err
    }
  }

  /**
   * Raw POST request to Gemini generateContent endpoint
   */
  private static async executeGenerateContent(
    apiKey: string,
    model: string,
    userPrompt: string
  ): Promise<GeminiRawAnalysisResponse> {
    const cleanModel = model.replace(/^models\//, '')
    const payload = {
      systemInstruction: {
        parts: [{ text: this.SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(apiKey)}`

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
        let errorMsg = `Gemini API Error: HTTP ${res.status}`
        try {
          const errData = await res.json()
          if (errData?.error?.message) {
            errorMsg = errData.error.message
          }
        } catch {
          // ignore
        }

        if (res.status === 429) {
          throw new GeminiClientError(
            'Batas kuota Gemini API (Rate Limit 429) tercapai. Silakan tunggu 30-60 detik atau periksa kuota harian di Google AI Studio.',
            429
          )
        }
        if (res.status === 400 || res.status === 403) {
          throw new GeminiClientError(`API Key tidak valid atau izin ditolak: ${errorMsg}`, res.status)
        }
        if (res.status >= 500) {
          throw new GeminiClientError(
            'Server Google Gemini mengalami gangguan sementara. Silakan coba beberapa saat lagi.',
            res.status
          )
        }

        throw new GeminiClientError(errorMsg, res.status)
      }

      const responseData = await res.json()
      const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!rawText) {
        throw new GeminiClientError('Model Gemini tidak mengembalikan teks jawaban yang valid.')
      }

      return this.parseJsonResponse(rawText)
    } catch (err: any) {
      if (err instanceof GeminiClientError) {
        throw err
      }
      if (err.name === 'AbortError') {
        throw new GeminiClientError(
          'Permintaan ke Gemini API melebihi batas waktu (timeout). Silakan periksa koneksi internet Anda.'
        )
      }
      throw new GeminiClientError(err.message || 'Terjadi kesalahan saat memanggil Gemini API.')
    }
  }

  /**
   * Constructs prompt with strict context isolation XML tags
   */
  private static buildAnalysisPrompt(cvText: string, job: JobDetails): string {
    return `Evaluasi kesesuaian antara kandidat dan lowongan berikut sesuai aturan anti-halusinasi:

<candidate_cv>
${cvText.trim()}
</candidate_cv>

<job_posting>
Judul Posisi: ${job.title || 'Tidak ditentukan'}
Nama Perusahaan: ${job.company || 'Tidak ditentukan'}
Lokasi: ${job.location || 'Tidak ditentukan'}
Model Kerja: ${job.workplaceType || 'Tidak ditentukan'}

Deskripsi Lowongan:
${job.description || 'Tidak ada deskripsi'}

Persyaratan & Kualifikasi:
${job.requirements || 'Lihat deskripsi pekerjaan'}
</job_posting>

Berikan hasil evaluasi lengkap dalam format JSON yang valid.`
  }

  /**
   * Safely parse JSON from raw text response, cleaning any code block wrappers
   */
  public static parseJsonResponse(rawText: string): GeminiRawAnalysisResponse {
    let cleaned = rawText.trim()

    // Remove markdown code fences if present
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '')
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/i, '')
    }
    cleaned = cleaned.trim()

    try {
      const parsed = JSON.parse(cleaned)

      // Normalize fields if needed
      return {
        relevance_score:
          typeof parsed.relevance_score === 'number'
            ? Math.round(parsed.relevance_score)
            : 50,
        match_level: ['High', 'Moderate', 'Low'].includes(parsed.match_level)
          ? parsed.match_level
          : parsed.relevance_score >= 75
            ? 'High'
            : parsed.relevance_score >= 50
              ? 'Moderate'
              : 'Low',
        match_summary: parsed.match_summary || 'Evaluasi kecocokan kandidat dengan lowongan.',
        matched_skills: Array.isArray(parsed.matched_skills) ? parsed.matched_skills : [],
        missing_skills: Array.isArray(parsed.missing_skills) ? parsed.missing_skills : [],
        interview_highlights: Array.isArray(parsed.interview_highlights)
          ? parsed.interview_highlights
          : [],
      }
    } catch (parseError: any) {
      throw new GeminiClientError(`Gagal mem-parsing output JSON dari model: ${parseError.message}`)
    }
  }

  /**
   * High-fidelity Mock Analysis for Demo Mode & Offline Testing
   */
  static generateMockAnalysis(job: JobDetails, cvText: string): GeminiRawAnalysisResponse {
    const cvLower = cvText.toLowerCase()
    const jobTitle = job.title || 'Software Engineer'
    const company = job.company || 'Tech Company'

    const possibleSkills = [
      {
        name: 'Vue 3',
        match: cvLower.includes('vue'),
        snippet: 'Pengalaman dalam arsitektur Vue 3 & Composition API',
      },
      {
        name: 'TypeScript',
        match: cvLower.includes('typescript'),
        snippet: 'Pengembangan kode type-safe dengan TypeScript',
      },
      {
        name: 'Tailwind CSS',
        match: cvLower.includes('tailwind'),
        snippet: 'Desain UI modern & responsif dengan Tailwind CSS',
      },
      {
        name: 'Vite & Vitest',
        match: cvLower.includes('vite'),
        snippet: 'Setup build pipeline dan automated testing',
      },
      {
        name: 'REST API',
        match: cvLower.includes('rest') || cvLower.includes('api'),
        snippet: 'Integrasi layanan backend RESTful APIs',
      },
    ]

    const matched = possibleSkills
      .filter((s) => s.match)
      .map((s) => ({
        skill: s.name,
        cv_evidence: s.snippet,
      }))

    if (matched.length === 0) {
      matched.push({
        skill: 'Software Development Foundation',
        cv_evidence: 'Memiliki riwayat pengalaman di industri teknologi.',
      })
    }

    const missing = [
      {
        requirement: 'Pengalaman integrasi Cloud Native Architecture skala besar',
        importance: 'Preferred' as const,
        recommendation:
          'Jelaskan pemahaman konseptual dan pengalaman deployment CI/CD yang relevan sebagai transferable skill.',
      },
      {
        requirement: 'Sertifikasi Keahlian Khusus Industri Terkait',
        importance: 'Preferred' as const,
        recommendation:
          'Tunjukkan portfolio proyek nyata yang mendemonstrasikan kompetensi praktis tanpa sertifikasi formal.',
      },
    ]

    const score = matched.length >= 3 ? 85 : matched.length >= 2 ? 72 : 55
    const matchLevel = score >= 75 ? 'High' : score >= 50 ? 'Moderate' : 'Low'

    return {
      relevance_score: score,
      match_level: matchLevel,
      match_summary: `Profil Anda memiliki kecocokan ${matchLevel.toLowerCase()} dengan posisi ${jobTitle} di ${company}. Keahlian utama Anda selaras dengan kebutuhan peran ini, dengan beberapa kualifikasi sekunder yang dapat diantisipasi saat wawancara.`,
      matched_skills: matched,
      missing_skills: missing,
      interview_highlights: [
        `Rekam jejak kepemimpinan arsitektur frontend dan pengembangan modular pada proyek sebelumnya.`,
        `Keahlian mendalam dalam teknologi utama (${matched.map((m) => m.skill).slice(0, 3).join(', ')}).`,
        `Komitmen tinggi pada kualitas pengujian otomatis dan performa aplikasi.`,
      ],
    }
  }
}
