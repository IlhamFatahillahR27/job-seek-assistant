/**
 * Composable for Job Match & Gap Analysis
 * Integrates GeminiClient, GeminiGuardrail, and chrome.storage reactivity.
 */

import { ref, onMounted, getCurrentInstance } from 'vue'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import { GeminiClientService, GeminiClientError } from '@/services/geminiClient'
import { GeminiGuardrailService } from '@/services/geminiGuardrail'
import { useAppSettings, useCVProfile, useCurrentJob } from '@/composables/useStorageState'
import type { GroundedAnalysisResult } from '@/types/analysis'
import type { JobDetails } from '@/types/job'
import type { CVProfile } from '@/types/cv'

function onMountedSafe(callback: () => Promise<void> | void) {
  if (getCurrentInstance()) {
    onMounted(callback)
  } else {
    callback()
  }
}

// Singleton state
const currentAnalysisState = ref<GroundedAnalysisResult | null>(null)
const isAnalyzingState = ref(false)
const analysisErrorState = ref<string | null>(null)
const cooldownTimer = ref<number>(0)
let cooldownInterval: ReturnType<typeof setInterval> | null = null
let isInitialized = false

export function useJobAnalysis() {
  const { settings, updateSettings } = useAppSettings()
  const { cvProfile } = useCVProfile()
  const { currentJob } = useCurrentJob()

  const initAnalysisState = async () => {
    if (isInitialized) return
    const saved = await storageService.get<GroundedAnalysisResult | null>(
      STORAGE_KEYS.CURRENT_ANALYSIS,
      null
    )
    if (saved) {
      currentAnalysisState.value = saved
    }
    isInitialized = true

    storageService.addChangeListener((changes) => {
      if (changes[STORAGE_KEYS.CURRENT_ANALYSIS]) {
        currentAnalysisState.value = changes[STORAGE_KEYS.CURRENT_ANALYSIS].newValue ?? null
      }
    })
  }

  onMountedSafe(async () => {
    await initAnalysisState()
  })

  /**
   * Start a countdown timer for rate limiting
   */
  const startCooldown = (seconds = 45) => {
    if (cooldownInterval) clearInterval(cooldownInterval)
    cooldownTimer.value = seconds
    cooldownInterval = setInterval(() => {
      cooldownTimer.value -= 1
      if (cooldownTimer.value <= 0) {
        if (cooldownInterval) clearInterval(cooldownInterval)
        cooldownInterval = null
        cooldownTimer.value = 0
      }
    }, 1000)
  }

  /**
   * Execute Job Match & Gap Analysis
   */
  const runAnalysis = async (
    customJob?: JobDetails,
    customCV?: CVProfile,
    options: { forceDemo?: boolean } = {}
  ): Promise<GroundedAnalysisResult> => {
    const targetJob = customJob || currentJob.value
    const targetCV = customCV || cvProfile.value
    const isDemoMode = options.forceDemo || settings.value.useDemoGeminiMode || !settings.value.geminiApiKey

    analysisErrorState.value = null

    if (!targetCV || !targetCV.rawText?.trim()) {
      const err = 'CV belum tersedia. Silakan pilih atau unggah CV terlebih dahulu di tab Profil CV.'
      analysisErrorState.value = err
      throw new Error(err)
    }

    if (!targetJob || (!targetJob.title?.trim() && !targetJob.description?.trim())) {
      const err = 'Detail lowongan pekerjaan belum ada. Ekstrak halaman atau input secara manual.'
      analysisErrorState.value = err
      throw new Error(err)
    }

    if (cooldownTimer.value > 0) {
      const err = `Batas kuota tercapai. Silakan tunggu ${cooldownTimer.value} detik sebelum menganalisis ulang.`
      analysisErrorState.value = err
      throw new Error(err)
    }

    isAnalyzingState.value = true

    try {
      let rawResult: import('@/types/analysis').GeminiRawAnalysisResponse

      if (isDemoMode) {
        // High fidelity mock analysis
        await new Promise((resolve) => setTimeout(resolve, 800))
        rawResult = GeminiClientService.generateMockAnalysis(targetJob, targetCV.rawText)
      } else {
        const analysisCallResult = await GeminiClientService.analyzeJobMatch({
          apiKey: settings.value.geminiApiKey,
          model: settings.value.geminiModel,
          cvText: targetCV.rawText,
          job: targetJob,
        })
        rawResult = analysisCallResult
        if (analysisCallResult.usedModel && analysisCallResult.usedModel !== settings.value.geminiModel) {
          await updateSettings({ geminiModel: analysisCallResult.usedModel })
        }
      }

      // Pass through Guardrail Service for anti-hallucination verification
      const validation = GeminiGuardrailService.validateAndGround(
        rawResult,
        targetCV.rawText,
        targetJob,
        isDemoMode
      )

      const finalResult = validation.groundedResult
      currentAnalysisState.value = finalResult

      // Persist to storage
      await storageService.set(STORAGE_KEYS.CURRENT_ANALYSIS, finalResult)

      // Add to history (keep max 10)
      const history = await storageService.get<GroundedAnalysisResult[]>(
        STORAGE_KEYS.ANALYSIS_HISTORY,
        []
      )
      const updatedHistory = [finalResult, ...history.filter((h) => h.id !== finalResult.id)].slice(0, 10)
      await storageService.set(STORAGE_KEYS.ANALYSIS_HISTORY, updatedHistory)

      return finalResult
    } catch (err: any) {
      let message = err.message || 'Gagal melakukan analisis kecocokan lowongan.'
      if (err instanceof GeminiClientError && err.isRateLimit) {
        startCooldown(45)
        message = `Batas kuota Gemini API (Rate Limit 429) tercapai. Silakan tunggu jeda waktu mundur di bawah atau gunakan Mode Demo.`
      }
      analysisErrorState.value = message
      throw err
    } finally {
      isAnalyzingState.value = false
    }
  }

  /**
   * Clear current analysis from state & storage
   */
  const clearAnalysis = async () => {
    currentAnalysisState.value = null
    analysisErrorState.value = null
    await storageService.remove(STORAGE_KEYS.CURRENT_ANALYSIS)
  }

  return {
    currentAnalysis: currentAnalysisState,
    isAnalyzing: isAnalyzingState,
    analysisError: analysisErrorState,
    cooldownTimer,
    runAnalysis,
    clearAnalysis,
    initAnalysisState,
  }
}
