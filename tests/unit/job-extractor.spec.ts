import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupChromeMock } from '../mocks/chrome'
import { useJobExtractor } from '@/composables/useJobExtractor'
import { initializeStorageState } from '@/composables/useStorageState'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import type { JobDetails } from '@/types/job'

describe('useJobExtractor Composable Unit Tests', () => {
  let chromeMock: any

  beforeEach(async () => {
    chromeMock = setupChromeMock()
    await storageService.clear()
    await initializeStorageState()
  })

  it('should successfully extract job details from active tab and persist to storage', async () => {
    const { currentJob, extractFromActiveTab, successMessage, extractionError } = useJobExtractor()

    const extracted = await extractFromActiveTab()

    expect(chromeMock.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true })
    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(101, { type: 'SCRAPE_JOB_PAGE' })

    expect(extracted.title).toBe('Senior Frontend Engineer')
    expect(extracted.company).toBe('TechCorp Indonesia')
    expect(currentJob.value?.title).toBe('Senior Frontend Engineer')
    expect(successMessage.value).toContain('Senior Frontend Engineer')
    expect(extractionError.value).toBeNull()

    // Verify persisted to storage
    const savedInStorage = await storageService.get<JobDetails | null>(STORAGE_KEYS.CURRENT_JOB, null)
    expect(savedInStorage?.title).toBe('Senior Frontend Engineer')
  })

  it('should reject extraction on browser internal URLs (chrome://) with friendly error', async () => {
    chromeMock.tabs.query.mockResolvedValueOnce([
      { id: 102, url: 'chrome://settings', active: true, currentWindow: true },
    ])

    const { extractFromActiveTab, extractionError } = useJobExtractor()

    await expect(extractFromActiveTab()).rejects.toThrow('Halaman sistem internal peramban tidak dapat diekstrak')
    expect(extractionError.value).toContain('Halaman sistem internal peramban tidak dapat diekstrak')
  })

  it('should update and persist edited job details', async () => {
    const { currentJob, updateJob, successMessage } = useJobExtractor()

    const customJob: JobDetails = {
      id: 'job_edited_123',
      url: 'https://example.com/careers/lead',
      title: 'Principal Engineer',
      company: 'Tech Innovators',
      location: 'Jakarta',
      workplaceType: 'Remote',
      description: 'Custom description',
      requirements: 'Custom requirements',
      platform: 'custom',
      extractedAt: new Date().toISOString(),
    }

    await updateJob(customJob)

    expect(currentJob.value?.title).toBe('Principal Engineer')
    expect(successMessage.value).toBe('Data lowongan berhasil disimpan.')

    const saved = await storageService.get<JobDetails | null>(STORAGE_KEYS.CURRENT_JOB, null)
    expect(saved?.company).toBe('Tech Innovators')
  })

  it('should clear stored job on resetJob', async () => {
    const { currentJob, updateJob, resetJob } = useJobExtractor()

    const job: JobDetails = {
      id: 'job_to_clear',
      url: 'https://test.com',
      title: 'QA Tester',
      company: 'Testing Corp',
      description: 'Testing apps',
      platform: 'custom',
      extractedAt: new Date().toISOString(),
    }

    await updateJob(job)
    expect(currentJob.value).not.toBeNull()

    await resetJob()
    expect(currentJob.value).toBeNull()

    const saved = await storageService.get<JobDetails | null>(STORAGE_KEYS.CURRENT_JOB, null)
    expect(saved).toBeNull()
  })

  it('should automatically fallback to AI extraction when DOM description is incomplete', async () => {
    chromeMock.tabs.sendMessage.mockResolvedValueOnce({
      type: 'SCRAPE_JOB_SUCCESS',
      payload: {
        id: 'job_dom_incomplete',
        url: 'https://www.jobstreet.co.id/id/job/999',
        title: 'Full Stack Engineer',
        company: 'PT Global Tech',
        description: 'Deskripsi pekerjaan tidak ditemukan',
        requirements: '',
        platform: 'jobstreet',
        extractedAt: new Date().toISOString(),
        rawPageText: 'PT Global Tech membuka lowongan Full Stack Engineer. Tanggung jawab: Mengembangkan web app dengan Vue dan Laravel. Kualifikasi: 3 tahun pengalaman.',
      },
    })

    const { extractFromActiveTab, currentJob, successMessage } = useJobExtractor()
    const result = await extractFromActiveTab()

    expect(result.extractionMethod).toBe('ai')
    expect(currentJob.value?.extractionMethod).toBe('ai')
    expect(successMessage.value).toContain('Gemini AI')
  })

  it('should support force AI extraction via extractWithAI', async () => {
    chromeMock.tabs.sendMessage.mockResolvedValueOnce({
      type: 'SCRAPE_JOB_SUCCESS',
      payload: {
        id: 'job_dom_1',
        url: 'https://glints.com/id/opportunities/jobs/ai-1',
        title: 'Software Developer',
        company: 'Tech Asia',
        description: 'Teks dari DOM scraper',
        requirements: 'Syarat',
        platform: 'glints',
        extractedAt: new Date().toISOString(),
        rawPageText: 'Tech Asia mencari Software Developer untuk membangun sistem baru.',
      },
    })

    const { extractWithAI, currentJob } = useJobExtractor()
    const result = await extractWithAI()

    expect(result.extractionMethod).toBe('ai')
    expect(currentJob.value?.extractionMethod).toBe('ai')
  })
})
