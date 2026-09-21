import { ref } from 'vue'
import { useCurrentJob, useAppSettings } from './useStorageState'
import { GeminiClientService } from '@/services/geminiClient'
import type { JobDetails } from '@/types/job'
import type { ExtensionMessage } from '@/types/messages'

export function useJobExtractor() {
  const { currentJob, saveCurrentJob, clearCurrentJob } = useCurrentJob()
  const { settings } = useAppSettings()
  const isExtracting = ref(false)
  const isExtractingAi = ref(false)
  const extractionError = ref<string | null>(null)
  const successMessage = ref<string | null>(null)

  /**
   * Extract job posting from the currently active browser tab.
   * If forceAi is true or if DOM extraction produces incomplete text,
   * it seamlessly falls back to Gemini AI extraction.
   */
  const extractFromActiveTab = async (options?: { forceAi?: boolean }): Promise<JobDetails> => {
    isExtracting.value = true
    if (options?.forceAi) isExtractingAi.value = true
    extractionError.value = null
    successMessage.value = null

    try {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        throw new Error('Chrome Extension Tabs API tidak tersedia di lingkungan ini.')
      }

      // 1. Get the currently focused active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const activeTab = tabs[0]

      if (!activeTab || !activeTab.id) {
        throw new Error('Tidak dapat mendeteksi tab browser yang sedang aktif.')
      }

      const url = activeTab.url || ''
      if (
        url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:')
      ) {
        throw new Error(
          'Halaman sistem internal peramban tidak dapat diekstrak. Silakan buka halaman lowongan kerja di portal atau situs karir publik.'
        )
      }

      // 2. Send SCRAPE_JOB_PAGE message to the content script in active tab
      let response: any
      try {
        response = await chrome.tabs.sendMessage(activeTab.id, {
          type: 'SCRAPE_JOB_PAGE',
        } as ExtensionMessage)
      } catch (sendErr: any) {
        console.warn('[useJobExtractor] Direct message failed, attempting dynamic injection or bridge:', sendErr)
        
        // Auto-recovery: If content script was not injected (e.g. after extension reload),
        // dynamically inject it on demand using chrome.scripting API!
        try {
          if (chrome.scripting && chrome.runtime?.getManifest) {
            const manifest = chrome.runtime.getManifest()
            const scriptFiles = manifest.content_scripts?.[0]?.js
            if (scriptFiles && scriptFiles.length > 0) {
              await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: scriptFiles,
              })
              // Short breather for the listener to bind
              await new Promise((r) => setTimeout(r, 200))
              response = await chrome.tabs.sendMessage(activeTab.id, {
                type: 'SCRAPE_JOB_PAGE',
              } as ExtensionMessage)
            }
          }
        } catch (injectErr) {
          console.warn('[useJobExtractor] Dynamic injection fallback failed:', injectErr)
        }

        if (!response) {
          try {
            response = await chrome.runtime.sendMessage({
              type: 'SCRAPE_JOB_PAGE',
            } as ExtensionMessage)
          } catch {
            throw new Error(
              'Ekstensi belum tersambung ke halaman ini. Silakan muat ulang (refresh/F5) halaman lowongan kerja tersebut lalu coba lagi.'
            )
          }
        }
      }

      if (!response) {
        throw new Error('Tidak menerima respons dari halaman lowongan.')
      }

      if (response.type === 'API_ERROR' || response.error) {
        throw new Error(response.error || 'Terjadi kesalahan saat mengekstrak halaman.')
      }

      if (response.type === 'SCRAPE_JOB_SUCCESS' && response.payload) {
        let jobData = response.payload as JobDetails
        if (!jobData.url || jobData.url === 'about:blank') {
          jobData.url = url
        }

        const isDescIncomplete =
          !jobData.description ||
          jobData.description.trim().length < 50 ||
          jobData.description.includes('tidak ditemukan')

        const shouldRunAi = options?.forceAi || (isDescIncomplete && !!jobData.rawPageText)

        if (shouldRunAi && jobData.rawPageText) {
          try {
            isExtractingAi.value = true
            const hasApiKey = !!settings.value.geminiApiKey?.trim()

            const aiJob = await GeminiClientService.extractJobWithAI({
              apiKey: settings.value.geminiApiKey || '',
              model: settings.value.geminiModel,
              pageText: jobData.rawPageText,
              url: jobData.url,
              pageTitle: activeTab.title,
              forceDemo: !hasApiKey,
            })

            jobData = {
              ...aiJob,
              id: jobData.id || aiJob.id,
              url: jobData.url,
              title: aiJob.title && !aiJob.title.includes('Software Engineer') ? aiJob.title : jobData.title || aiJob.title,
              company: aiJob.company && !aiJob.company.includes('Perusahaan') ? aiJob.company : jobData.company || aiJob.company,
              extractionMethod: 'ai',
            }

            await saveCurrentJob(jobData)
            successMessage.value = `Berhasil mengekstrak "${jobData.title}" dari ${jobData.company} menggunakan Gemini AI ✨`
            return jobData
          } catch (aiErr: any) {
            console.warn('[useJobExtractor] AI extraction encountered an issue, keeping DOM data:', aiErr)
            if (options?.forceAi) {
              throw aiErr
            }
            if (isDescIncomplete && jobData.rawPageText && jobData.rawPageText.length > 50) {
              // Graceful fallback to raw visible text from page if AI fails
              jobData.description = jobData.rawPageText.slice(0, 2000).trim()
            }
          } finally {
            isExtractingAi.value = false
          }
        }

        await saveCurrentJob(jobData)
        successMessage.value = `Berhasil mengekstrak "${jobData.title}" dari ${jobData.company}`
        return jobData
      }

      throw new Error('Format respons ekstraksi tidak dikenali.')
    } catch (err: any) {
      const msg = err.message || 'Gagal mengekstrak data lowongan kerja'
      extractionError.value = msg
      throw err
    } finally {
      isExtracting.value = false
      isExtractingAi.value = false
    }
  }

  /**
   * Update and save current job details
   */
  const updateJob = async (updated: JobDetails) => {
    await saveCurrentJob(updated)
    successMessage.value = 'Data lowongan berhasil disimpan.'
  }

  /**
   * Remove stored job
   */
  const resetJob = async () => {
    await clearCurrentJob()
    extractionError.value = null
    successMessage.value = null
  }

  /**
   * Create an empty job template for manual input
   */
  const createEmptyJob = (): JobDetails => {
    return {
      id: `manual_${Date.now()}`,
      url: '',
      title: '',
      company: '',
      location: '',
      workplaceType: 'Unspecified',
      description: '',
      requirements: '',
      recruiterEmail: '',
      platform: 'custom',
      extractedAt: new Date().toISOString(),
    }
  }

  /**
   * Dedicated helper to explicitly extract via Gemini AI
   */
  const extractWithAI = () => extractFromActiveTab({ forceAi: true })

  return {
    currentJob,
    isExtracting,
    isExtractingAi,
    extractionError,
    successMessage,
    extractFromActiveTab,
    extractWithAI,
    updateJob,
    resetJob,
    createEmptyJob,
  }
}
