import { ref, onMounted } from 'vue'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import {
  type AppSettings,
  type TabKey,
  type ThemeMode,
  DEFAULT_SETTINGS,
} from '@/types/settings'
import type { CVProfile } from '@/types/cv'
import type { JobDetails } from '@/types/job'

// Shared reactive state singletons so multiple components share identical state
const settingsState = ref<AppSettings>({ ...DEFAULT_SETTINGS })
const cvProfileState = ref<CVProfile | null>(null)
const currentJobState = ref<JobDetails | null>(null)
const activeTabState = ref<TabKey>('analysis')
const isInitialized = ref(false)

/**
 * Initialize all persistent state from storage once
 */
export async function initializeStorageState(): Promise<void> {
  if (isInitialized.value) return

  const [savedSettings, savedCV, savedJob] = await Promise.all([
    storageService.get<AppSettings>(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS }),
    storageService.get<CVProfile | null>(STORAGE_KEYS.CV_PROFILE, null),
    storageService.get<JobDetails | null>(STORAGE_KEYS.CURRENT_JOB, null),
  ])

  settingsState.value = savedSettings
  cvProfileState.value = savedCV
  currentJobState.value = savedJob
  if (savedSettings.activeTab) {
    activeTabState.value = savedSettings.activeTab
  }

  // Apply initial theme class
  applyThemeClass(savedSettings.theme)

  isInitialized.value = true

  // Listen for storage changes from other tabs or background worker
  storageService.addChangeListener((changes) => {
    if (changes[STORAGE_KEYS.SETTINGS]?.newValue) {
      settingsState.value = changes[STORAGE_KEYS.SETTINGS].newValue
      applyThemeClass(settingsState.value.theme)
    }
    if (changes[STORAGE_KEYS.CV_PROFILE]) {
      cvProfileState.value = changes[STORAGE_KEYS.CV_PROFILE].newValue ?? null
    }
    if (changes[STORAGE_KEYS.CURRENT_JOB]) {
      currentJobState.value = changes[STORAGE_KEYS.CURRENT_JOB].newValue ?? null
    }
  })
}

function applyThemeClass(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches)

  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

/**
 * Composable for App Settings
 */
export function useAppSettings() {
  const loading = ref(!isInitialized.value)

  onMounted(async () => {
    if (!isInitialized.value) {
      await initializeStorageState()
    }
    loading.value = false
  })

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const updated: AppSettings = { ...settingsState.value, ...updates }
    settingsState.value = updated
    await storageService.set(STORAGE_KEYS.SETTINGS, updated)
    if (updates.theme) {
      applyThemeClass(updates.theme)
    }
  }

  const resetSettings = async () => {
    settingsState.value = { ...DEFAULT_SETTINGS }
    await storageService.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
    applyThemeClass(DEFAULT_SETTINGS.theme)
  }

  return {
    settings: settingsState,
    loading,
    updateSettings,
    resetSettings,
  }
}

/**
 * Composable for CV Profile
 */
export function useCVProfile() {
  const loading = ref(!isInitialized.value)

  onMounted(async () => {
    if (!isInitialized.value) {
      await initializeStorageState()
    }
    loading.value = false
  })

  const saveCVProfile = async (profile: CVProfile) => {
    cvProfileState.value = profile
    await storageService.set(STORAGE_KEYS.CV_PROFILE, profile)
  }

  const clearCVProfile = async () => {
    cvProfileState.value = null
    await storageService.remove(STORAGE_KEYS.CV_PROFILE)
  }

  return {
    cvProfile: cvProfileState,
    loading,
    saveCVProfile,
    clearCVProfile,
  }
}

/**
 * Composable for Navigation & Tabs
 */
export function useNavigation() {
  const setActiveTab = async (tab: TabKey) => {
    activeTabState.value = tab
    settingsState.value.activeTab = tab
    await storageService.set(STORAGE_KEYS.SETTINGS, settingsState.value)
  }

  return {
    activeTab: activeTabState,
    setActiveTab,
  }
}

/**
 * Composable for Theme
 */
export function useTheme() {
  const toggleTheme = async () => {
    const nextTheme: ThemeMode = settingsState.value.theme === 'dark' ? 'light' : 'dark'
    await useAppSettings().updateSettings({ theme: nextTheme })
  }

  return {
    theme: ref(() => settingsState.value.theme),
    toggleTheme,
    applyThemeClass,
  }
}
