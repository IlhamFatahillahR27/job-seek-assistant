import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmailGeneratorService } from '@/services/emailGenerator'
import type { JobDetails } from '@/types/job'

const mockJob: JobDetails = {
  id: 'job_test_1',
  url: 'https://example.com/job/1',
  title: 'Senior Frontend Engineer',
  company: 'Tech Titan Nusantara',
  location: 'Jakarta, Indonesia',
  workplaceType: 'Hybrid',
  description: 'Kami membuka lowongan untuk Senior Frontend Engineer dengan kualifikasi Vue 3 dan TypeScript. Bertanggung jawab atas performa platform.',
  requirements: 'Pengalaman 5+ tahun, memahami arsitektur micro-frontend.',
  recruiterEmail: 'recruiter@techtitan.id',
  platform: 'custom',
  extractedAt: new Date().toISOString(),
}

const mockJobEnglish: JobDetails = {
  id: 'job_test_2',
  url: 'https://example.com/job/2',
  title: 'Staff Software Engineer',
  company: 'Global Cloud Systems',
  location: 'San Francisco, CA',
  workplaceType: 'Remote',
  description: 'We are seeking a Staff Software Engineer to architect web systems using Vue 3, TypeScript, and modern design systems.',
  requirements: 'Minimum 5 years of production web development.',
  platform: 'linkedin',
  extractedAt: new Date().toISOString(),
}

const mockCvText = `ILHAM FATAHILLAH
Senior Frontend Engineer & Web Architect
Keahlian: Vue.js 3, TypeScript, Tailwind CSS, Vite, Vitest.
Pengalaman:
Tech Titan Nusantara (2022 - Sekarang)
- Memimpin pengembangan frontend platform enterprise dengan 100k DAU.
- Meningkatkan Web Vitals sebesar 45% dan memangkas bundle size 30%.`

describe('EmailGeneratorService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should accurately detect job posting language', () => {
    expect(EmailGeneratorService.detectJobLanguage(mockJob.description)).toBe('id')
    expect(EmailGeneratorService.detectJobLanguage(mockJobEnglish.description)).toBe('en')
    expect(EmailGeneratorService.detectJobLanguage('')).toBe('id')
  })

  it('should resolve target language correctly based on user choice', () => {
    expect(EmailGeneratorService.resolveLanguage('id', mockJobEnglish)).toBe('id')
    expect(EmailGeneratorService.resolveLanguage('en', mockJob)).toBe('en')
    expect(EmailGeneratorService.resolveLanguage('auto', mockJob)).toBe('id')
    expect(EmailGeneratorService.resolveLanguage('auto', mockJobEnglish)).toBe('en')
  })

  it('should spot-check ungrounded missing skills and flag warnings', () => {
    const missingSkills = ['Golang microservices', 'AWS Solutions Architect']
    const cleanText = 'Saya memiliki pengalaman mendalam dalam arsitektur Vue 3 dan TypeScript.'
    const dirtyText = 'Saya sangat menguasai Golang microservices dan AWS cloud platform.'

    expect(EmailGeneratorService.spotCheckMissingSkills(cleanText, missingSkills)).toHaveLength(0)

    const warnings = EmailGeneratorService.spotCheckMissingSkills(dirtyText, missingSkills)
    expect(warnings.length).toBeGreaterThanOrEqual(1)
    expect(warnings[0]).toContain('Golang')
  })

  it('should generate 3 distinct mock templates in Indonesian', () => {
    const templates = EmailGeneratorService.generateMockTemplates(mockJob, mockCvText, 'id')

    expect(templates).toHaveLength(3)
    const tones = templates.map((t) => t.id)
    expect(tones).toContain('formal')
    expect(tones).toContain('impact_focused')
    expect(tones).toContain('concise_pitch')

    const formal = templates.find((t) => t.id === 'formal')!
    expect(formal.language).toBe('id')
    expect(formal.subject).toContain('Lamaran Posisi Senior Frontend Engineer')
    expect(formal.body).toContain('Vue 3')
    expect(formal.body).toContain('TypeScript')
  })

  it('should generate 3 distinct mock templates in English', () => {
    const templates = EmailGeneratorService.generateMockTemplates(mockJobEnglish, mockCvText, 'en')

    expect(templates).toHaveLength(3)
    const formal = templates.find((t) => t.id === 'formal')!
    expect(formal.language).toBe('en')
    expect(formal.subject).toContain('Application for Staff Software Engineer')
    expect(formal.body).toContain('Dear Hiring Team')
  })

  it('should handle mock refinement instructions (Iterative Refinement)', () => {
    const initialSubject = 'Lamaran Posisi Senior Frontend Engineer - Ilham'
    const initialBody = 'Yth. Tim Rekrutmen,\n\nSaya ingin melamar posisi ini.\n\nHormat saya,\nIlham'

    // Test tone refinement
    const friendlyResult = EmailGeneratorService.refineMockDraft(
      initialSubject,
      initialBody,
      'Buat salam pembuka lebih ramah dan santai',
      'id'
    )
    expect(friendlyResult.revisedBody).toContain('Halo Tim Rekrutmen')
    expect(friendlyResult.changesSummary).toContain('ramah')

    // Test language switch refinement
    const enResult = EmailGeneratorService.refineMockDraft(
      initialSubject,
      initialBody,
      'Terjemahkan ke bahasa inggris',
      'en'
    )
    expect(enResult.revisedSubject).toContain('Application')
    expect(enResult.revisedBody).toContain('Dear Hiring Team')
    expect(enResult.changesSummary).toContain('Inggris')
  })

  it('should call Gemini API for template generation with correct prompt structure', async () => {
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  templates: [
                    {
                      id: 'formal',
                      title: 'Formal Tone',
                      language: 'en',
                      subject: 'Application for Senior Frontend Engineer',
                      body: 'Dear Team, I am applying for the role.',
                      highlighted_cv_points: ['Vue 3'],
                    },
                    {
                      id: 'impact_focused',
                      title: 'Impact Tone',
                      language: 'en',
                      subject: 'Impact Pitch: Senior Frontend Engineer',
                      body: 'Hi Team, My project improved Web Vitals by 45%.',
                      highlighted_cv_points: ['45% boost'],
                    },
                    {
                      id: 'concise_pitch',
                      title: 'Concise Pitch',
                      language: 'en',
                      subject: 'Senior Frontend Engineer: Candidate',
                      body: 'Hi, Ready to connect.',
                      highlighted_cv_points: ['Short pitch'],
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    const templates = await EmailGeneratorService.generateTemplates({
      apiKey: 'test_key_123',
      cvText: mockCvText,
      job: mockJob,
      language: 'en',
    })

    expect(templates).toHaveLength(3)
    expect(templates[0].id).toBe('formal')
    expect(templates[0].subject).toBe('Application for Senior Frontend Engineer')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('generateContent'),
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('should call Gemini API for iterative refinement with correct structure', async () => {
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  revised_subject: 'Revised: Senior Frontend Engineer Application',
                  revised_body: 'Dear Team, Here is the revised body focusing on architecture.',
                  language: 'en',
                  changes_summary: 'Focused emphasis on component architecture.',
                }),
              },
            ],
          },
        },
      ],
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    const result = await EmailGeneratorService.refineDraft({
      apiKey: 'test_key_123',
      cvText: mockCvText,
      job: mockJob,
      currentSubject: 'Initial Subject',
      currentBody: 'Initial Body',
      feedback: 'Focus more on component architecture',
      language: 'en',
    })

    expect(result.revisedSubject).toBe('Revised: Senior Frontend Engineer Application')
    expect(result.changesSummary).toBe('Focused emphasis on component architecture.')
  })
})
