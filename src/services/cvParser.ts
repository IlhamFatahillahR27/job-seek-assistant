/**
 * CV Parser Service
 * Extracts text from PDF ArrayBuffers (via PDF.js with fallback) and Google Docs text,
 * and parses raw text into structured CVProfile models (skills, experience, education).
 */

import * as pdfjsLib from 'pdfjs-dist'
import type {
  CVProfile,
  CVSkillCategory,
  CVExperience,
  CVEducation,
} from '@/types/cv'

// TC39 Polyfills required by modern PDF.js (v6+) across all browser and test environments
if (typeof (Uint8Array.prototype as any).toHex !== 'function') {
  ;(Uint8Array.prototype as any).toHex = function (): string {
    let hex = ''
    for (let i = 0; i < this.length; i++) {
      hex += this[i].toString(16).padStart(2, '0')
    }
    return hex
  }
}

if (typeof (Math as any).sumPrecise !== 'function') {
  ;(Math as any).sumPrecise = function (items: Iterable<number>): number {
    let sum = 0
    for (const n of items) {
      sum += Number(n) || 0
    }
    return sum
  }
}

// Common Skill Taxonomy for intelligent heuristic categorization
const SKILL_TAXONOMY: Record<string, string[]> = {
  'Frontend & UI': [
    'Vue.js',
    'Vue 3',
    'Vue',
    'React.js',
    'React',
    'TypeScript',
    'JavaScript',
    'Tailwind CSS',
    'Tailwind',
    'HTML5',
    'HTML',
    'CSS3',
    'CSS',
    'Vite',
    'Webpack',
    'Next.js',
    'Nuxt.js',
    'Svelte',
    'Pinia',
    'Redux',
    'Figma',
    'UI/UX',
    'Responsive Design',
    'Web Accessibility',
  ],
  'Backend & APIs': [
    'Node.js',
    'Express.js',
    'Express',
    'NestJS',
    'Nest.js',
    'Python',
    'Django',
    'FastAPI',
    'Golang',
    'Go',
    'Java',
    'Spring Boot',
    'PHP',
    'Laravel',
    'REST API',
    'REST APIs',
    'GraphQL',
    'gRPC',
    'WebSockets',
    'Microservices',
  ],
  'Databases & Storage': [
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Redis',
    'SQLite',
    'Supabase',
    'Firebase',
    'Elasticsearch',
    'DynamoDB',
    'SQL',
    'ERD',
  ],
  'Cloud, DevOps & Tooling': [
    'Google Cloud Platform',
    'Google Cloud',
    'GCP',
    'AWS',
    'Amazon Web Services',
    'Docker',
    'Kubernetes',
    'CI/CD',
    'GitHub Actions',
    'Git',
    'GitLab',
    'Linux',
    'Terraform',
    'Vercel',
  ],
  'Testing & Quality': [
    'Vitest',
    'Jest',
    'Playwright',
    'Cypress',
    'Unit Testing',
    'Integration Testing',
    'TDD',
    'E2E Testing',
    'Automated UI Testing',
  ],
  'Leadership & Methodologies': [
    'Agile',
    'Scrum',
    'Code Review',
    'Technical Leadership',
    'Mentoring',
    'Sprint Planning',
    'Cross-functional Collaboration',
    'System Analyst',
    'Requirement Engineering',
    'BPMN',
  ],
}

export class CVParserService {
  /**
   * Extract plain text from PDF ArrayBuffer using pdfjs-dist with fallback
   */
  static async extractTextFromPdf(data: ArrayBuffer | Uint8Array): Promise<string> {
    // Ensure data is converted to an isolated, pure ArrayBuffer & Uint8Array (PDF.js rejects Node Buffers)
    let rawBytes: Uint8Array
    try {
      if (data instanceof Uint8Array) {
        const ab = new ArrayBuffer(data.byteLength)
        rawBytes = new Uint8Array(ab)
        rawBytes.set(data)
      } else if (data instanceof ArrayBuffer) {
        const ab = new ArrayBuffer(data.byteLength)
        rawBytes = new Uint8Array(ab)
        rawBytes.set(new Uint8Array(data))
      } else {
        const anyData = data as any
        const byteLen = anyData?.byteLength || anyData?.length || 0
        const ab = new ArrayBuffer(byteLen)
        rawBytes = new Uint8Array(ab)
        if (anyData) rawBytes.set(new Uint8Array(anyData))
      }
    } catch {
      rawBytes = new Uint8Array(data as any)
    }

    try {
      // In web extension environment, configure worker from extension assets if available
      if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        if (typeof window !== 'undefined' && (window as any).chrome?.runtime?.getURL) {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = (window as any).chrome.runtime.getURL('assets/pdf.worker.mjs')
          } catch {
            pdfjsLib.GlobalWorkerOptions.workerSrc = ''
          }
        } else {
          pdfjsLib.GlobalWorkerOptions.workerSrc = ''
        }
      }

      // Clone a clean copy for PDF.js getDocument
      const ab = new ArrayBuffer(rawBytes.byteLength)
      const pdfData = new Uint8Array(ab)
      pdfData.set(rawBytes)

      const loadingTask = pdfjsLib.getDocument({
        data: pdfData,
        useWorkerFetch: false,
        useSystemFonts: true,
      })

      const pdf = await loadingTask.promise
      const textPieces: string[] = []

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()

        let lastY: number | null = null
        let pageStr = ''

        for (const item of textContent.items as any[]) {
          if ('str' in item) {
            // Check vertical coordinate to insert line breaks appropriately
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
              pageStr += '\n'
            } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
              pageStr += ' '
            }
            pageStr += item.str
            lastY = item.transform[5]
          }
        }

        if (pageStr.trim()) {
          textPieces.push(pageStr.trim())
        }
      }

      const combined = textPieces.join('\n\n')
      if (combined.trim().length > 0) {
        return combined
      }
    } catch (pdfError) {
      console.warn('[CVParserService] PDF.js extraction encountered an issue, falling back to binary string extractor:', pdfError)
    }

    // Binary text fallback: extracts printable ASCII / UTF-8 characters from binary stream
    return this.fallbackBinaryTextExtractor(rawBytes)
  }

  /**
   * Fallback text extractor from binary stream if PDF.js fails
   */
  private static fallbackBinaryTextExtractor(data: ArrayBuffer | Uint8Array): string {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    let raw = ''
    try {
      raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    } catch {
      for (let i = 0; i < bytes.length; i++) {
        raw += String.fromCharCode(bytes[i])
      }
    }

    // Match text segments inside stream objects or BT...ET operators
    const textMatches: string[] = []
    const btRegex = /BT[\s\S]*?ET/g
    let match: RegExpExecArray | null

    while ((match = btRegex.exec(raw)) !== null) {
      const block = match[0]
      const stringMatches = block.match(/\(([^)]+)\)|\[([^\]]+)\]/g)
      if (stringMatches) {
        for (const sm of stringMatches) {
          const cleaned = sm.replace(/[()[\]\\]/g, ' ').trim()
          if (cleaned.length > 1) {
            textMatches.push(cleaned)
          }
        }
      }
    }

    if (textMatches.length > 10) {
      return textMatches.join(' ')
    }

    // If still empty, grab all printable character sequences
    const printableMatches = raw.match(/[A-Za-z0-9\s.,;:\-_/@()]{4,}/g)
    return printableMatches ? printableMatches.join('\n') : 'Dokumen PDF tidak berisi teks yang dapat diekstrak.'
  }

  /**
   * Parse plain text into a structured CVProfile object
   */
  static parseTextToProfile(
    rawText: string,
    metadata: {
      fileName: string
      fileId?: string
      source: 'google_drive' | 'manual_paste'
      mimeType?: string
      checksum?: string
      driveModifiedTime?: string
      fileSize?: number
    }
  ): CVProfile {
    const cleanedText = rawText.replace(/\r\n/g, '\n').trim()
    const lines = cleanedText.split('\n').map((l) => l.trim()).filter(Boolean)

    const headline = this.extractHeadline(lines)
    const skills = this.extractSkills(cleanedText)
    const experiences = this.extractExperiences(cleanedText)
    const educations = this.extractEducations(cleanedText)
    const certifications = this.extractCertifications(cleanedText)
    const summary = this.extractSummary(cleanedText, lines)

    return {
      id: `cv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fileName: metadata.fileName,
      fileId: metadata.fileId,
      source: metadata.source,
      mimeType: metadata.mimeType,
      checksum: metadata.checksum,
      driveModifiedTime: metadata.driveModifiedTime,
      lastModified: metadata.driveModifiedTime || new Date().toISOString(),
      parsedAt: new Date().toISOString(),
      rawText: cleanedText,
      headline,
      summary,
      skills,
      experiences,
      educations,
      certifications,
      fileSize: metadata.fileSize,
    }
  }

  /**
   * Extract likely candidate headline / job role from early lines
   */
  private static extractHeadline(lines: string[]): string {
    if (!lines.length) return 'Software Engineer'

    // First line is often name; second or third is often title/headline
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i]
      if (
        /engineer|developer|architect|designer|manager|lead|specialist|analyst|programmer/i.test(
          line
        ) &&
        line.length < 120
      ) {
        // Strip trailing location or contact info separated by | or •
        const parts = line.split(/[|•]/)
        const rolePart = parts[0]?.trim()
        if (rolePart && rolePart.length > 3) {
          return rolePart
        }
        return line.trim()
      }
    }

    const fallback = lines[1] && lines[1].length < 80 ? lines[1].split(/[|•]/)[0]?.trim() : ''
    return fallback || 'Profesional / Pelamar Kerja'
  }

  /**
   * Extract skills categorized into groups based on taxonomy dictionary
   */
  private static extractSkills(text: string): CVSkillCategory[] {
    const categories: CVSkillCategory[] = []

    for (const [categoryName, keywords] of Object.entries(SKILL_TAXONOMY)) {
      const matchedItems: string[] = []

      for (const keyword of keywords) {
        // Word boundary regex for accurate keyword detection
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(^|[^a-zA-Z0-9_#+])${escaped}([^a-zA-Z0-9_#+]|$)`, 'i')

        if (regex.test(text)) {
          if (!matchedItems.includes(keyword)) {
            matchedItems.push(keyword)
          }
        }
      }

      if (matchedItems.length > 0) {
        categories.push({
          category: categoryName,
          items: matchedItems,
        })
      }
    }

    // Default fallback skills if none detected
    if (categories.length === 0) {
      categories.push({
        category: 'Keahlian Umum',
        items: ['Komunikasi', 'Pemecahan Masalah', 'Kerjasama Tim'],
      })
    }

    return categories
  }

  /**
   * Extract work experience blocks based on date patterns and role headers
   */
  private static extractExperiences(text: string): CVExperience[] {
    const experiences: CVExperience[] = []
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

    // Date range pattern e.g. "2022 - Sekarang", "Jan 2020 - Dec 2021", "Jan 2022 - Apr 2023", "2019 - 2022"
    const dateRegex =
      /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)?\s*\b(?:19|20)\d{2}\b)\s*[-–—to]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)?\s*\b(?:19|20)\d{2}\b|present|sekarang|current)/i

    let inExpSection = false
    let passedExpSection = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lower = line.toLowerCase()

      if (/^(?:professional experience|work experience|pengalaman kerja|pengalaman profesional)\b/i.test(lower)) {
        inExpSection = true
        continue
      }

      if (inExpSection && /^(?:education|pendidikan|areas of expertise|technical proficiencies|keahlian|sertifikasi|certifications?|training|pelatihan)\b/i.test(lower)) {
        passedExpSection = true
        break
      }

      const dateMatch = line.match(dateRegex)
      if (dateMatch) {
        if (passedExpSection) break

        const startDate = dateMatch[1].trim()
        const endDate = dateMatch[2].trim()

        let role = 'Software Engineer'
        let company = 'Perusahaan'

        const textBeforeDate = line.substring(0, line.indexOf(dateMatch[0])).trim()
        const prevLine = lines[i - 1] || ''

        if (textBeforeDate.length > 2) {
          // e.g. "Full Stack Engineer Jan 2023 - Present"
          role = textBeforeDate.replace(/[|•–—,-]/g, ' ').trim()
          if (prevLine && prevLine.length > 2 && prevLine.length < 80) {
            // prevLine e.g. "Universitas Dinamika  Surabaya, Indonesia"
            const compParts = prevLine.split(/\s{2,}|[,|•]/)
            company = compParts[0]?.trim() || prevLine.trim()
          }
        } else {
          // Date is on standalone line, candidateLine is prevLine
          const candidateLine = prevLine.length > 2 && prevLine.length < 90 ? prevLine : line
          const parts = candidateLine.split(/[|•–—,-]/)
          if (parts.length >= 2) {
            role = parts[0].replace(dateRegex, '').trim()
            company = parts[1].replace(dateRegex, '').trim()
          } else if (candidateLine.trim()) {
            role = candidateLine.replace(dateRegex, '').trim()
          }
        }

        // Collect description sentences that follow
        const descLines: string[] = []
        for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
          if (lines[j].match(dateRegex)) break
          if (/^(?:professional experience|work experience|pengalaman|education|pendidikan|areas of expertise|technical proficiencies)\b/i.test(lines[j])) break
          if (lines[j].length > 5) {
            descLines.push(lines[j].replace(/^[-*•]\s*/, '').trim())
          }
        }

        experiences.push({
          id: `exp_${experiences.length + 1}`,
          role: role || 'Tenaga Ahli',
          company: company || 'Organisasi / Perusahaan',
          startDate,
          endDate,
          description: descLines.slice(0, 2).join(' '),
          keyAchievements: descLines.slice(0, 4),
        })

        if (experiences.length >= 5) break
      }
    }

    return experiences
  }

  /**
   * Extract education records based on degree terms
   */
  private static extractEducations(text: string): CVEducation[] {
    const educations: CVEducation[] = []
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

    const degreeRegex =
      /\b(bachelor|master|doctor|sarjana|magister|diploma|s\.kom|s\.t|b\.sc|m\.sc|ph\.d|d3|d4|s1|s2)\b/i

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (degreeRegex.test(line)) {
        let institution = 'Universitas'
        const prevLine = lines[i - 1] || ''
        const nextLine = lines[i + 1] || ''

        if (/universitas|institute|university|politeknik|college|sekolah|academy/i.test(prevLine)) {
          const compParts = prevLine.split(/\s{2,}|[,|•]/)
          institution = compParts[0]?.trim() || prevLine.trim()
        } else if (/universitas|institute|university|politeknik|college|sekolah|academy/i.test(nextLine)) {
          const compParts = nextLine.split(/\s{2,}|[,|•]/)
          institution = compParts[0]?.trim() || nextLine.trim()
        } else if (/universitas|institute|university|politeknik|college/i.test(line)) {
          const parts = line.split(/[|–—,-]/)
          if (parts.length > 1) {
            institution = parts[1].trim()
          }
        }

        const dateRangeRegex = /\b(?:19|20)\d{2}\s*[-–—to]\s*(?:\b(?:19|20)\d{2}\b|present|sekarang|current)?/i
        const yearMatch = (line + ' ' + nextLine).match(dateRangeRegex) || (line + ' ' + nextLine).match(/\b(19|20)\d{2}\b/)
        const cleanDegree = line.replace(dateRangeRegex, '').replace(/^[-*•]\s*/, '').trim()

        educations.push({
          id: `edu_${educations.length + 1}`,
          degree: cleanDegree.substring(0, 60),
          institution: institution.substring(0, 70),
          graduationYear: yearMatch ? yearMatch[0] : undefined,
        })

        if (educations.length >= 3) break
      }
    }

    return educations
  }

  /**
   * Extract certifications from text
   */
  private static extractCertifications(text: string): string[] {
    const certs: string[] = []
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

    let inCertSection = false
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (/(?:professional\s+)?training|pelatihan|sertifikasi|certifications?|licens(e|es)|courses?|kursus/i.test(line) && line.length < 50) {
        inCertSection = true
        continue
      }
      if (inCertSection) {
        if (/^(?:pengalaman|pendidikan|keahlian|experience|education|skills|areas of expertise)\b/i.test(line)) {
          break
        }
        if (line.length > 5 && line.length < 120 && !line.startsWith('http')) {
          certs.push(line.replace(/^[-*•]\s*/, '').trim())
        }
      }
    }

    return certs.slice(0, 5)
  }

  /**
   * Extract professional summary snippet
   */
  private static extractSummary(text: string, lines: string[]): string {
    const lower = text.toLowerCase()
    const summaryIndex = lower.indexOf('ringkasan') !== -1 
      ? lower.indexOf('ringkasan') 
      : lower.indexOf('summary')

    if (summaryIndex !== -1) {
      const sub = text.substring(summaryIndex, summaryIndex + 300)
      const clean = sub.split('\n').slice(1, 4).join(' ').trim()
      if (clean.length > 20) return clean
    }

    // Default: grab first non-heading sentence
    for (const line of lines.slice(1, 8)) {
      if (line.length > 40 && !line.includes('|') && !line.includes('@')) {
        return line
      }
    }

    return 'Profil profesional yang terdaftar dalam berkas CV.'
  }
}
