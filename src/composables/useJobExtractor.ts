import { ref } from 'vue'
import { useCurrentJob } from './useStorageState'
import type { JobDetails } from '@/types/job'
import type { ExtensionMessage } from '@/types/messages'

export function useJobExtractor() {
  const { currentJob, saveCurrentJob, clearCurrentJob } = useCurrentJob()
  const isExtracting = ref(false)
  const extractionError = ref<string | null>(null)
  const successMessage = ref<string | null>(null)

  /**
   * Extract job posting from the currently active browser tab
   */
  const extractFromActiveTab = async (): Promise<JobDetails> => {
    isExtracting.value = true
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
        // Typically happens when content script was not injected (page loaded before extension reload)
        console.warn('[useJobExtractor] Direct message failed, attempting bridge:', sendErr)
        try {
          // Fallback via background bridge
          response = await chrome.runtime.sendMessage({
            type: 'SCRAPE_JOB_PAGE',
          } as ExtensionMessage)
        } catch {
          throw new Error(
            'Ekstensi belum tersambung ke halaman ini. Silakan muat ulang (refresh/F5) halaman lowongan kerja tersebut lalu coba lagi.'
          )
        }
      }

      if (!response) {
        throw new Error('Tidak menerima respons dari halaman lowongan.')
      }

      if (response.type === 'API_ERROR' || response.error) {
        throw new Error(response.error || 'Terjadi kesalahan saat mengekstrak halaman.')
      }

      if (response.type === 'SCRAPE_JOB_SUCCESS' && response.payload) {
        const jobData = response.payload as JobDetails
        // If extracted URL is missing or internal, use tab URL
        if (!jobData.url || jobData.url === 'about:blank') {
          jobData.url = url
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

  return {
    currentJob,
    isExtracting,
    extractionError,
    successMessage,
    extractFromActiveTab,
    updateJob,
    resetJob,
    createEmptyJob,
  }
}
