import { describe, it, expect, beforeEach } from 'vitest'
import { setupChromeMock } from '../mocks/chrome'
import { useJobAnalysis } from '@/composables/useJobAnalysis'
import { useCVProfile, useCurrentJob, useAppSettings } from '@/composables/useStorageState'
import type { CVProfile } from '@/types/cv'
import type { JobDetails } from '@/types/job'

describe('useJobAnalysis Composable Unit Tests', () => {
  let chromeMock: any

  beforeEach(() => {
    chromeMock = setupChromeMock()
  })

  const mockCV: CVProfile = {
    id: 'cv-1',
    fileName: 'Ilham_CV.pdf',
    source: 'manual_paste',
    parsedAt: new Date().toISOString(),
    rawText: 'Ilham Fatahillah - Senior Software Engineer dengan keahlian Vue 3 dan TypeScript.',
    skills: [],
    experiences: [],
    educations: [],
  }

  const mockJob: JobDetails = {
    id: 'job-1',
    title: 'Senior Frontend Engineer',
    company: 'TechCorp',
    location: 'Jakarta',
    description: 'Dibutuhkan pengembang Vue 3 dan TypeScript.',
    extractedAt: new Date().toISOString(),
  }

  it('should throw error when analyzing without CV profile', async () => {
    const { runAnalysis } = useJobAnalysis()
    const { clearCVProfile } = useCVProfile()
    await clearCVProfile()

    await expect(
      runAnalysis(mockJob, undefined, { forceDemo: true })
    ).rejects.toThrow('CV belum tersedia')
  })

  it('should throw error when analyzing without Job details', async () => {
    const { runAnalysis } = useJobAnalysis()
    const { saveCVProfile } = useCVProfile()
    await saveCVProfile(mockCV)

    const emptyJob: JobDetails = {
      id: 'empty-1',
      title: '',
      company: '',
      description: '',
      extractedAt: new Date().toISOString(),
    }

    await expect(
      runAnalysis(emptyJob, mockCV, { forceDemo: true })
    ).rejects.toThrow('Detail lowongan pekerjaan belum ada')
  })

  it('should run analysis in demo mode and persist to storage', async () => {
    const { runAnalysis, currentAnalysis } = useJobAnalysis()
    const { saveCVProfile } = useCVProfile()
    const { saveCurrentJob } = useCurrentJob()

    await saveCVProfile(mockCV)
    await saveCurrentJob(mockJob)

    const result = await runAnalysis(mockJob, mockCV, { forceDemo: true })

    expect(result).toBeDefined()
    expect(result.score).toBeGreaterThanOrEqual(50)
    expect(result.isDemo).toBe(true)
    expect(currentAnalysis.value?.id).toBe(result.id)

    // Verify storage persistence
    const saved = await chromeMock.storage.local.get('job_seek_current_analysis')
    expect(saved.job_seek_current_analysis.id).toBe(result.id)
  })

  it('should clear analysis result and remove from storage', async () => {
    const { runAnalysis, clearAnalysis, currentAnalysis } = useJobAnalysis()
    const { saveCVProfile } = useCVProfile()
    const { saveCurrentJob } = useCurrentJob()

    await saveCVProfile(mockCV)
    await saveCurrentJob(mockJob)
    await runAnalysis(mockJob, mockCV, { forceDemo: true })

    expect(currentAnalysis.value).not.toBeNull()

    await clearAnalysis()

    expect(currentAnalysis.value).toBeNull()
    const saved = await chromeMock.storage.local.get('job_seek_current_analysis')
    expect(saved.job_seek_current_analysis).toBeUndefined()
  })
})
