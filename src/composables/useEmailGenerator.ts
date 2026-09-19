/**
 * Composable for Email Generation, Iterative AI Refinement, and Gmail Dispatch
 * Adheres to Milestone 5: multi-tone, multi-language, guardrails, drafts, and direct sending.
 */

import { ref, computed, onMounted, getCurrentInstance, watch } from 'vue'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import { EmailGeneratorService } from '@/services/emailGenerator'
import { useAppSettings, useCVProfile, useCurrentJob } from '@/composables/useStorageState'
import { useJobAnalysis } from '@/composables/useJobAnalysis'
import type {
  EmailTone,
  EmailLanguage,
  GeneratedEmailTemplate,
  EmailDispatchResult,
  EmailDispatchHistoryItem,
} from '@/types/email'

function onMountedSafe(callback: () => Promise<void> | void) {
  if (getCurrentInstance()) {
    onMounted(callback)
  } else {
    callback()
  }
}

// Singleton state across components
const templatesState = ref<GeneratedEmailTemplate[]>([])
const activeToneState = ref<EmailTone>('formal')
const selectedLanguageState = ref<EmailLanguage>('auto')
const recipientEmailState = ref('')
const subjectState = ref('')
const bodyState = ref('')
const includeAttachmentState = ref(true)
const refinementFeedbackState = ref('')
const changesSummaryState = ref<string | null>(null)
const isGeneratingState = ref(false)
const isRefiningState = ref(false)
const isDispatchingState = ref(false)
const dispatchResultState = ref<EmailDispatchResult | null>(null)
const dispatchErrorState = ref<string | null>(null)
const dispatchHistoryState = ref<EmailDispatchHistoryItem[]>([])
const generalErrorState = ref<string | null>(null)

export function useEmailGenerator() {
  const { settings, updateSettings } = useAppSettings()
  const { cvProfile } = useCVProfile()
  const { currentJob } = useCurrentJob()
  const { currentAnalysis } = useJobAnalysis()

  // Compute missing skills from analysis for real-time spot-checking
  const missingSkills = computed(() => {
    return (currentAnalysis.value?.missingSkills || []).map((m) => m.missingRequirement)
  })

  // Dynamic hallucination warnings based on current subject & body
  const currentWarnings = computed(() => {
    return EmailGeneratorService.spotCheckMissingSkills(
      `${subjectState.value} ${bodyState.value}`,
      missingSkills.value
    )
  })

  // Auto-sync recipient email if currentJob has recruiterEmail and user hasn't typed one
  watch(
    () => currentJob.value?.recruiterEmail,
    (newEmail) => {
      if (newEmail && (!recipientEmailState.value || recipientEmailState.value === 'recruiter@company.com')) {
        recipientEmailState.value = newEmail
      }
    },
    { immediate: true }
  )

  const loadHistory = async () => {
    const hist = await storageService.get<EmailDispatchHistoryItem[]>(
      STORAGE_KEYS.EMAIL_DRAFTS,
      []
    )
    dispatchHistoryState.value = hist
  }

  const initEmailState = async () => {
    const savedSettings = await storageService.get<any>(STORAGE_KEYS.SETTINGS, null)
    if (savedSettings?.defaultEmailLanguage) {
      selectedLanguageState.value = savedSettings.defaultEmailLanguage
    } else if (settings.value?.defaultEmailLanguage) {
      selectedLanguageState.value = settings.value.defaultEmailLanguage
    }

    // Auto-fill recipient email if available
    if (currentJob.value?.recruiterEmail) {
      recipientEmailState.value = currentJob.value.recruiterEmail
    }

    await loadHistory()
  }

  onMountedSafe(async () => {
    await initEmailState()
  })

  /**
   * Select an active tone and apply it to editor fields
   */
  const selectTone = (tone: EmailTone) => {
    activeToneState.value = tone
    const found = templatesState.value.find((t) => t.id === tone)
    if (found) {
      subjectState.value = found.subject
      bodyState.value = found.body
      changesSummaryState.value = null
    }
  }

  /**
   * Change language preference and optionally regenerate
   */
  const setLanguage = async (lang: EmailLanguage) => {
    selectedLanguageState.value = lang
    await updateSettings({ defaultEmailLanguage: lang })
  }

  /**
   * Generate 3 Email Templates using Gemini AI (or mock in Demo Mode)
   */
  const generateTemplates = async (forceRefresh = false): Promise<GeneratedEmailTemplate[]> => {
    generalErrorState.value = null
    dispatchErrorState.value = null
    dispatchResultState.value = null

    if (!cvProfile.value?.rawText?.trim()) {
      const err = 'Data CV belum tersedia. Silakan pilih atau unggah CV di tab Profil & CV.'
      generalErrorState.value = err
      throw new Error(err)
    }

    if (!currentJob.value || (!currentJob.value.title?.trim() && !currentJob.value.description?.trim())) {
      const err = 'Data lowongan kerja masih kosong. Ekstrak halaman atau input secara manual di tab Analisa.'
      generalErrorState.value = err
      throw new Error(err)
    }

    if (templatesState.value.length > 0 && !forceRefresh) {
      return templatesState.value
    }

    isGeneratingState.value = true

    try {
      const isDemo =
        settings.value.useDemoGeminiMode || !settings.value.geminiApiKey?.trim()

      const generated = await EmailGeneratorService.generateTemplates({
        apiKey: settings.value.geminiApiKey,
        model: settings.value.geminiModel,
        cvText: cvProfile.value.rawText,
        job: currentJob.value,
        language: selectedLanguageState.value,
        isDemo,
        missingSkills: missingSkills.value,
      })

      templatesState.value = generated

      // Auto-select formal or current tone
      const initialTone = generated.find((t) => t.id === activeToneState.value) || generated[0]
      if (initialTone) {
        activeToneState.value = initialTone.id
        subjectState.value = initialTone.subject
        bodyState.value = initialTone.body
      }

      // Fill recipient email if empty
      if (!recipientEmailState.value && currentJob.value.recruiterEmail) {
        recipientEmailState.value = currentJob.value.recruiterEmail
      }

      return generated
    } catch (err: any) {
      let msg = err.message || 'Gagal membuat template email lamaran.'
      if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('kuota')) {
        msg = 'Batas kuota Gemini API (Rate Limit 429) tercapai. Silakan tunggu 30-60 detik, pilih model lain di tab Pengaturan, atau gunakan Mode Demo.'
      } else if (err?.isOfflineError || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        msg = 'Koneksi internet terputus (offline). Tidak dapat membuat template email tanpa internet.'
      }
      generalErrorState.value = msg
      throw err
    } finally {
      isGeneratingState.value = false
    }
  }

  /**
   * Refine existing email draft via AI Iterative Refinement ("Masukan Perubahan")
   */
  const refineDraft = async (feedbackPrompt?: string): Promise<void> => {
    const feedback = feedbackPrompt || refinementFeedbackState.value
    if (!feedback || !feedback.trim()) {
      throw new Error('Masukkan instruksi perubahan draf terlebih dahulu.')
    }

    if (!cvProfile.value?.rawText?.trim()) {
      throw new Error('Data CV belum tersedia.')
    }

    if (!currentJob.value) {
      throw new Error('Data lowongan belum tersedia.')
    }

    generalErrorState.value = null
    isRefiningState.value = true

    try {
      const isDemo =
        settings.value.useDemoGeminiMode || !settings.value.geminiApiKey?.trim()

      const result = await EmailGeneratorService.refineDraft({
        apiKey: settings.value.geminiApiKey,
        model: settings.value.geminiModel,
        cvText: cvProfile.value.rawText,
        job: currentJob.value,
        currentSubject: subjectState.value,
        currentBody: bodyState.value,
        feedback: feedback.trim(),
        language: selectedLanguageState.value,
        isDemo,
        missingSkills: missingSkills.value,
      })

      subjectState.value = result.revisedSubject
      bodyState.value = result.revisedBody
      changesSummaryState.value = result.changesSummary
      refinementFeedbackState.value = ''
    } catch (err: any) {
      let msg = err.message || 'Gagal merevisi email.'
      if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('kuota')) {
        msg = 'Batas kuota Gemini API tercapai saat merevisi email. Silakan tunggu sebentar atau coba lagi nanti.'
      } else if (err?.isOfflineError || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        msg = 'Koneksi internet terputus (offline). Tidak dapat merevisi email tanpa koneksi internet.'
      }
      generalErrorState.value = msg
      throw err
    } finally {
      isRefiningState.value = false
    }
  }

  /**
   * Dispatch email: either save to draft or send directly
   */
  const dispatchEmail = async (action: 'draft' | 'direct'): Promise<EmailDispatchResult> => {
    dispatchErrorState.value = null
    dispatchResultState.value = null

    if (!recipientEmailState.value?.trim()) {
      const err = 'Masukkan alamat email penerima (recruiter).'
      dispatchErrorState.value = err
      throw new Error(err)
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmailState.value.trim())) {
      const err = 'Format alamat email penerima tidak valid.'
      dispatchErrorState.value = err
      throw new Error(err)
    }

    if (!subjectState.value?.trim()) {
      const err = 'Subjek email tidak boleh kosong.'
      dispatchErrorState.value = err
      throw new Error(err)
    }

    if (!bodyState.value?.trim()) {
      const err = 'Isi email tidak boleh kosong.'
      dispatchErrorState.value = err
      throw new Error(err)
    }

    isDispatchingState.value = true

    try {
      let attachmentFileId: string | undefined
      let attachmentFileName: string | undefined
      let attachmentMimeType: string | undefined

      if (includeAttachmentState.value && cvProfile.value?.fileId) {
        attachmentFileId = cvProfile.value.fileId
        attachmentFileName = cvProfile.value.fileName || 'Resume.pdf'
        attachmentMimeType = cvProfile.value.mimeType
      }

      const response = await chrome.runtime.sendMessage({
        type: 'SEND_GMAIL_REQUEST',
        payload: {
          recipientEmail: recipientEmailState.value.trim(),
          subject: subjectState.value.trim(),
          body: bodyState.value,
          action,
          attachmentFileId,
          attachmentFileName,
          attachmentMimeType,
        },
      })

      if (!response || response.type === 'API_ERROR' || response.error) {
        throw new Error(response?.error || 'Gagal memproses pengiriman Gmail.')
      }

      const result: EmailDispatchResult = response.payload
      dispatchResultState.value = result

      await loadHistory()
      return result
    } catch (err: any) {
      const msg = err.message || 'Terjadi kesalahan saat memproses Gmail.'
      dispatchErrorState.value = msg
      throw err
    } finally {
      isDispatchingState.value = false
    }
  }

  const saveDraft = () => dispatchEmail('draft')
  const sendDirectly = () => dispatchEmail('direct')

  const resetDraft = () => {
    changesSummaryState.value = null
    refinementFeedbackState.value = ''
    selectTone(activeToneState.value)
  }

  return {
    templates: templatesState,
    activeTone: activeToneState,
    selectedLanguage: selectedLanguageState,
    recipientEmail: recipientEmailState,
    subject: subjectState,
    body: bodyState,
    includeAttachment: includeAttachmentState,
    refinementFeedback: refinementFeedbackState,
    changesSummary: changesSummaryState,
    isGenerating: isGeneratingState,
    isRefining: isRefiningState,
    isDispatching: isDispatchingState,
    dispatchResult: dispatchResultState,
    dispatchError: dispatchErrorState,
    dispatchHistory: dispatchHistoryState,
    generalError: generalErrorState,
    currentWarnings,
    selectTone,
    setLanguage,
    generateTemplates,
    refineDraft,
    saveDraft,
    sendDirectly,
    resetDraft,
    loadHistory,
    initEmailState,
  }
}
