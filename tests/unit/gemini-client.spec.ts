import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiClientService, GeminiClientError } from '@/services/geminiClient'
import type { JobDetails } from '@/types/job'

describe('GeminiClientService Unit Tests', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('validateApiKey & listModels', () => {
    it('should reject empty API key without making network requests', async () => {
      const result = await GeminiClientService.validateApiKey('')
      expect(result.valid).toBe(false)
      expect(result.errorMessage).toContain('tidak boleh kosong')
    })

    it('should return valid true and model list on HTTP 200 filtering for generateContent', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [
            {
              name: 'models/gemini-2.0-flash',
              displayName: 'Gemini 2.0 Flash',
              supportedGenerationMethods: ['generateContent', 'countTokens'],
            },
            {
              name: 'models/gemini-2.0-flash-thinking-exp',
              displayName: 'Gemini 2.0 Flash Thinking Exp',
              supportedGenerationMethods: ['generateContent'],
            },
            {
              name: 'models/gemini-1.5-flash-latest',
              displayName: 'Gemini 1.5 Flash Latest',
              supportedGenerationMethods: ['generateContent'],
            },
            {
              name: 'models/imagen-3.0-generate-002',
              displayName: 'Imagen 3.0',
              supportedGenerationMethods: ['generateContent', 'generateImages'],
            },
            {
              name: 'models/veo-2.0-generate-001',
              displayName: 'Veo Video Generator',
              supportedGenerationMethods: ['generateContent'],
            },
            {
              name: 'models/gemini-audio-speech-001',
              displayName: 'Gemini Speech TTS',
              supportedGenerationMethods: ['generateContent'],
            },
            {
              name: 'models/text-embedding-004',
              displayName: 'Text Embedding',
              supportedGenerationMethods: ['embedContent'],
            },
            {
              name: 'models/aqa',
              displayName: 'Attributed QA',
              supportedGenerationMethods: ['generateAnswer'],
            },
          ],
        }),
      } as any)

      const result = await GeminiClientService.validateApiKey('valid-test-key-123')
      expect(result.valid).toBe(true)
      expect(result.models).toContain('gemini-2.0-flash')
      expect(result.models).toContain('gemini-2.0-flash-thinking-exp')
      expect(result.models).toContain('gemini-1.5-flash-latest')

      // Ensure all non-reasoning / multimedia models are strictly excluded
      expect(result.models).not.toContain('imagen-3.0-generate-002')
      expect(result.models).not.toContain('veo-2.0-generate-001')
      expect(result.models).not.toContain('gemini-audio-speech-001')
      expect(result.models).not.toContain('text-embedding-004')
      expect(result.models).not.toContain('aqa')

      // Only the 3 logical reasoning models should be returned
      expect(result.availableModels).toHaveLength(3)

      // Verify thinking tag and top priority
      const thinkingModel = result.availableModels?.find((m) => m.id === 'gemini-2.0-flash-thinking-exp')
      expect(thinkingModel?.isThinking).toBe(true)
      expect(result.availableModels?.[0].id).toBe('gemini-2.0-flash-thinking-exp')
    })

    it('should handle HTTP 400/403 invalid API key gracefully', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: { message: 'API key not valid. Please pass a valid API key.' },
        }),
      } as any)

      const result = await GeminiClientService.validateApiKey('invalid-bad-key')
      expect(result.valid).toBe(false)
      expect(result.errorMessage).toContain('API Key Gemini tidak valid')
    })

    it('should handle HTTP 429 rate limit error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          error: { message: 'Resource has been exhausted (e.g. check quota).' },
        }),
      } as any)

      const result = await GeminiClientService.validateApiKey('rate-limited-key')
      expect(result.valid).toBe(false)
      expect(result.errorMessage).toContain('Rate Limit')
    })

    it('should handle network timeout/abort', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue({
        name: 'AbortError',
        message: 'The operation was aborted',
      })

      const result = await GeminiClientService.validateApiKey('timeout-key')
      expect(result.valid).toBe(false)
      expect(result.errorMessage).toContain('timeout')
    })
  })

  describe('analyzeJobMatch', () => {
    const mockJob: JobDetails = {
      id: 'job-test-1',
      title: 'Frontend Developer',
      company: 'Tech Corp',
      location: 'Jakarta',
      workplaceType: 'Remote',
      description: 'Mencari Vue 3 developer berpengalaman.',
      requirements: 'Kuasai TypeScript dan Tailwind CSS.',
      extractedAt: new Date().toISOString(),
    }

    const mockCv = `
Test User
Frontend Engineer
Pengalaman: 4 tahun mengembangkan aplikasi dengan Vue 3, TypeScript, dan Tailwind CSS.
Pendidikan: S1 Teknik Informatika.
    `

    it('should throw error when API key is missing', async () => {
      await expect(
        GeminiClientService.analyzeJobMatch({
          apiKey: '',
          cvText: mockCv,
          job: mockJob,
        })
      ).rejects.toThrow(GeminiClientError)
    })

    it('should throw error when CV text is missing', async () => {
      await expect(
        GeminiClientService.analyzeJobMatch({
          apiKey: 'test-key',
          cvText: '',
          job: mockJob,
        })
      ).rejects.toThrow(GeminiClientError)
    })

    it('should parse valid JSON response from Gemini API', async () => {
      const mockApiResponse = {
        relevance_score: 85,
        match_level: 'High',
        match_summary: 'Kandidat sangat cocok dengan kebutuhan posisi ini.',
        matched_skills: [
          { skill: 'Vue 3', cv_evidence: 'Pengalaman: 4 tahun mengembangkan aplikasi dengan Vue 3' },
          { skill: 'TypeScript', cv_evidence: 'mengembangkan aplikasi dengan Vue 3, TypeScript' },
        ],
        missing_skills: [
          {
            requirement: 'Arsitektur Cloud AWS',
            importance: 'Preferred',
            recommendation: 'Sebutkan transferable skill pemahaman deployment CI/CD.',
          },
        ],
        interview_highlights: [
          'Pengalaman 4 tahun pada stack frontend modern.',
        ],
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockApiResponse) }],
              },
            },
          ],
        }),
      } as any)

      const result = await GeminiClientService.analyzeJobMatch({
        apiKey: 'test-key-123',
        model: 'gemini-2.0-flash',
        cvText: mockCv,
        job: mockJob,
      })

      expect(result.relevance_score).toBe(85)
      expect(result.match_level).toBe('High')
      expect(result.matched_skills).toHaveLength(2)
      expect(result.missing_skills).toHaveLength(1)
      expect(result.interview_highlights).toHaveLength(1)
    })

    it('should strip markdown code fence ```json when model includes them', async () => {
      const rawTextWithFences = '```json\n{"relevance_score": 90, "match_level": "High", "match_summary": "Cocok", "matched_skills": [], "missing_skills": [], "interview_highlights": []}\n```'

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: rawTextWithFences }],
              },
            },
          ],
        }),
      } as any)

      const result = await GeminiClientService.analyzeJobMatch({
        apiKey: 'test-key-123',
        cvText: mockCv,
        job: mockJob,
      })

      expect(result.relevance_score).toBe(90)
      expect(result.match_level).toBe('High')
    })

    it('should auto-fallback when requested model is not found in v1beta', async () => {
      const mockSuccessOutput = {
        relevance_score: 80,
        match_level: 'High',
        match_summary: 'Analisis fallback berhasil.',
        matched_skills: [],
        missing_skills: [],
        interview_highlights: [],
      }

      // First call: fail with model not found
      // Second call (ListModels): return available models
      // Third call: succeed with fallback model
      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        callCount++
        if (callCount === 1) {
          return {
            ok: false,
            status: 404,
            json: async () => ({
              error: {
                message:
                  'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ModelService.ListModels to see the list of available models and their supported methods.',
              },
            }),
          }
        }
        if (url.includes('/models?')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              models: [
                {
                  name: 'models/gemini-2.0-flash',
                  supportedGenerationMethods: ['generateContent'],
                },
              ],
            }),
          }
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(mockSuccessOutput) }],
                },
              },
            ],
          }),
        }
      })

      const result = await GeminiClientService.analyzeJobMatch({
        apiKey: 'test-key-123',
        model: 'gemini-1.5-flash',
        cvText: mockCv,
        job: mockJob,
      })

      expect(result.relevance_score).toBe(80)
      expect(result.usedModel).toBe('gemini-2.0-flash')
    })

    it('should throw GeminiClientError with isRateLimit=true on HTTP 429', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          error: { message: 'Quota exceeded for quota metric...' },
        }),
      } as any)

      try {
        await GeminiClientService.analyzeJobMatch({
          apiKey: 'test-key-123',
          cvText: mockCv,
          job: mockJob,
        })
        expect.unreachable('Should have thrown an error')
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeminiClientError)
        expect(err.isRateLimit).toBe(true)
        expect(err.message).toContain('Rate Limit 429')
      }
    })
  })

  describe('generateMockAnalysis', () => {
    it('should generate grounded mock analysis according to detected keywords in CV', () => {
      const job: JobDetails = {
        id: 'mock-1',
        title: 'Senior Vue Developer',
        company: 'Vite Corp',
        extractedAt: new Date().toISOString(),
      }
      const cv = 'Berpengalaman dalam Vue 3, TypeScript, dan Tailwind CSS selama 5 tahun.'

      const mockResult = GeminiClientService.generateMockAnalysis(job, cv)

      expect(mockResult.relevance_score).toBeGreaterThanOrEqual(75)
      expect(mockResult.match_level).toBe('High')
      expect(mockResult.matched_skills.some((m) => m.skill === 'Vue 3')).toBe(true)
      expect(mockResult.missing_skills.length).toBeGreaterThan(0)
      expect(mockResult.interview_highlights.length).toBeGreaterThan(0)
    })
  })

  describe('extractJobWithAI & generateMockJobExtraction', () => {
    it('should extract structured job details using Gemini generateContent', async () => {
      const mockApiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'Senior DevOps Specialist',
                    company: 'PT Cloud Nusantara',
                    location: 'Jakarta (Hybrid)',
                    workplaceType: 'Hybrid',
                    description: 'Bertanggung jawab atas otomatisasi CI/CD dan cluster Kubernetes.',
                    requirements: 'Minimal 4 tahun pengalaman Kubernetes, Docker, dan Terraform.',
                    recruiterEmail: 'hr@cloudnusantara.id',
                  }),
                },
              ],
            },
          },
        ],
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      } as any)

      const result = await GeminiClientService.extractJobWithAI({
        apiKey: 'valid-gemini-key',
        pageText: 'Lowongan Kerja PT Cloud Nusantara mencari Senior DevOps Specialist...',
        url: 'https://www.jobstreet.co.id/id/job/12345',
        pageTitle: 'Senior DevOps Specialist - Jobstreet',
      })

      expect(result.title).toBe('Senior DevOps Specialist')
      expect(result.company).toBe('PT Cloud Nusantara')
      expect(result.workplaceType).toBe('Hybrid')
      expect(result.description).toContain('Kubernetes')
      expect(result.requirements).toContain('Terraform')
      expect(result.recruiterEmail).toBe('hr@cloudnusantara.id')
      expect(result.platform).toBe('jobstreet')
      expect(result.extractionMethod).toBe('ai')
    })

    it('should fallback to mock job extraction in Demo Mode or when API key is empty', async () => {
      const mockText = `PT Solusi Mega Teknologi
Senior Software Engineer
Jakarta, Indonesia
Kami mencari Senior Software Engineer yang handal dalam Vue 3 dan Golang.`

      const result = await GeminiClientService.extractJobWithAI({
        apiKey: '',
        pageText: mockText,
        url: 'https://glints.com/id/opportunities/jobs/dev-1',
        forceDemo: true,
      })

      expect(result.title).toBeDefined()
      expect(result.company).toBeDefined()
      expect(result.extractionMethod).toBe('ai')
      expect(result.platform).toBe('glints')
    })
  })
})
