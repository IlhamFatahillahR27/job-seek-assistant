import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import {
  type AppSettings,
  type TabKey,
  type ThemeMode,
  DEFAULT_SETTINGS,
} from '@/types/settings'
import type { CVProfile } from '@/types/cv'
import type { JobDetails } from '@/types/job'

function onMountedSafe(callback: () => Promise<void> | void) {
  if (getCurrentInstance()) {
    onMounted(callback)
  } else {
    callback()
  }
}

// Shared reactive state singletons so multiple components share identical state
const settingsState = ref<AppSettings>({ ...DEFAULT_SETTINGS })
const cvProfileState = ref<CVProfile | null>(null)
const currentJobState = ref<JobDetails | null>(null)
const activeTabState = ref<TabKey>('analysis')
const isInitialized = ref(false)
let initPromise: Promise<void> | null = null

/**
 * Initialize all persistent state from storage once
 */
export async function initializeStorageState(): Promise<void> {
  if (isInitialized.value) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    const [savedSettings, savedCV, savedJob] = await Promise.all([
      storageService.get<AppSettings>(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS }),
      storageService.get<CVProfile | null>(STORAGE_KEYS.CV_PROFILE, null),
      storageService.get<JobDetails | null>(STORAGE_KEYS.CURRENT_JOB, null),
    ])

    settingsState.value = savedSettings
    cvProfileState.value = savedCV
    if (currentJobState.value === null) {
      currentJobState.value = savedJob
    }
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
  })()

  return initPromise
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

  onMountedSafe(async () => {
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

  onMountedSafe(async () => {
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

/**
 * Composable for Google Workspace Authentication
 */
export function useGoogleAuth() {
  const isConnecting = ref(false)
  const authError = ref<string | null>(null)

  const login = async (customClientId?: string) => {
    isConnecting.value = true
    authError.value = null
    try {
      const { GoogleAuthService } = await import('@/services/googleAuth')
      if (customClientId) {
        const val = GoogleAuthService.validateClientId(customClientId)
        if (!val.valid) {
          throw new Error(val.error)
        }
      }
      const result = await GoogleAuthService.login(customClientId)
      await useAppSettings().updateSettings({
        isDemoActive: false,
        useDemoDriveMode: false,
        useDemoGeminiMode: false,
        googleAuthStatus: 'connected',
        googleUserEmail: result.profile.email,
        googleUserName: result.profile.name,
        googleUserAvatar: result.profile.picture,
        googleAccessToken: result.token,
      })
      useSession().clearSessionNotice()
      return result
    } catch (err: any) {
      authError.value = err.message || 'Gagal menghubungkan akun Google'
      await useAppSettings().updateSettings({
        googleAuthStatus: 'error',
      })
      throw err
    } finally {
      isConnecting.value = false
    }
  }

  const logout = async () => {
    isConnecting.value = true
    authError.value = null
    try {
      const { GoogleAuthService } = await import('@/services/googleAuth')
      await GoogleAuthService.logout()
      await useAppSettings().updateSettings({
        isDemoActive: false,
        useDemoDriveMode: false,
        useDemoGeminiMode: false,
        googleAuthStatus: 'disconnected',
        googleUserEmail: '',
        googleUserName: '',
        googleUserAvatar: '',
        googleAccessToken: '',
        googleTokenExpiresAt: 0,
      })
    } finally {
      isConnecting.value = false
    }
  }

  const checkAuth = async () => {
    try {
      const { GoogleAuthService } = await import('@/services/googleAuth')
      const res = await GoogleAuthService.checkAuthStatus()
      if (res.status === 'connected' && res.profile) {
        await useAppSettings().updateSettings({
          googleAuthStatus: 'connected',
          googleUserEmail: res.profile.email,
          googleUserName: res.profile.name,
          googleUserAvatar: res.profile.picture,
        })
      } else {
        await useAppSettings().updateSettings({
          googleAuthStatus: 'disconnected',
        })
      }
      return res
    } catch {
      return { status: 'disconnected' }
    }
  }

  return {
    settings: settingsState,
    isConnecting,
    authError,
    login,
    logout,
    checkAuth,
  }
}

const sessionNoticeState = ref<string | null>(null)

/**
 * Composable for App Session & Demo Lifecycle
 */
export function useSession() {
  const { settings, updateSettings } = useAppSettings()

  const sessionNotice = computed({
    get: () => sessionNoticeState.value,
    set: (val: string | null) => {
      sessionNoticeState.value = val
    },
  })

  const clearSessionNotice = () => {
    sessionNoticeState.value = null
  }

  const isDemo = computed(() => {
    return (
      Boolean(settings.value.isDemoActive) ||
      (Boolean(settings.value.useDemoDriveMode) && Boolean(settings.value.useDemoGeminiMode))
    )
  })

  const isGoogleConnected = computed(() => {
    return settings.value.googleAuthStatus === 'connected' && !isDemo.value
  })

  const isSessionActive = computed(() => {
    return isGoogleConnected.value || isDemo.value
  })

  const startDemoSession = async () => {
    sessionNoticeState.value = null
    await updateSettings({
      isDemoActive: true,
      useDemoDriveMode: true,
      useDemoGeminiMode: true,
      googleAuthStatus: 'connected',
      googleUserEmail: 'test.user@example.com',
      googleUserName: 'Test User (Demo)',
      googleUserAvatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      googleAccessToken: 'demo_mock_token_12345',
      activeTab: 'analysis',
    })
  }

  const endDemoSession = async () => {
    sessionNoticeState.value = null
    await updateSettings({
      isDemoActive: false,
      useDemoDriveMode: false,
      useDemoGeminiMode: false,
      googleAuthStatus: 'disconnected',
      googleUserEmail: '',
      googleUserName: '',
      googleUserAvatar: '',
      googleAccessToken: '',
      googleTokenExpiresAt: 0,
      activeTab: 'analysis',
    })
  }

  const handleSessionExpired = async (customMessage?: string) => {
    sessionNoticeState.value =
      customMessage || 'Sesi login Google Anda telah berakhir. Silakan masuk kembali.'
    await updateSettings({
      isDemoActive: false,
      useDemoDriveMode: false,
      useDemoGeminiMode: false,
      googleAuthStatus: 'disconnected',
      googleUserEmail: '',
      googleUserName: '',
      googleUserAvatar: '',
      googleAccessToken: '',
      googleTokenExpiresAt: 0,
      activeTab: 'analysis',
    })
  }

  return {
    settings,
    isDemo,
    isGoogleConnected,
    isSessionActive,
    sessionNotice,
    clearSessionNotice,
    startDemoSession,
    endDemoSession,
    handleSessionExpired,
  }
}

/**
 * Composable for Google Drive CV operations
 */
export function useDriveCV() {
  const isListing = ref(false)
  const isDownloading = ref(false)
  const isSyncing = ref(false)
  const driveError = ref<string | null>(null)
  const driveFiles = ref<import('@/types/cv').GoogleDriveFileItem[]>([])

  const loadDriveFiles = async (query?: string) => {
    isListing.value = true
    driveError.value = null
    try {
      const { GoogleAuthService } = await import('@/services/googleAuth')
      const { GoogleDriveService } = await import('@/services/googleDrive')
      const token = await GoogleAuthService.getValidToken(false)
      if (!token) {
        await useSession().handleSessionExpired('Sesi Google telah berakhir. Silakan masuk kembali untuk mengakses Google Drive.')
        throw new Error('Sesi Google telah berakhir. Silakan masuk kembali.')
      }

      const files = await GoogleDriveService.listFiles(token, query)
      driveFiles.value = files
      return files
    } catch (err: any) {
      if (
        err?.status === 401 ||
        err?.isAuthError ||
        err?.message?.includes('401') ||
        err?.message?.includes('Sesi Google') ||
        err?.message?.includes('Unauthorized')
      ) {
        await useSession().handleSessionExpired('Sesi login Google telah berakhir. Silakan masuk kembali.')
      }
      driveError.value = err.message || 'Gagal memuat berkas Google Drive'
      throw err
    } finally {
      isListing.value = false
    }
  }

  const selectAndSaveDriveCV = async (file: import('@/types/cv').GoogleDriveFileItem) => {
    isDownloading.value = true
    driveError.value = null
    try {
      const { GoogleAuthService } = await import('@/services/googleAuth')
      const { GoogleDriveService } = await import('@/services/googleDrive')
      const { CVParserService } = await import('@/services/cvParser')

      const token = await GoogleAuthService.getValidToken(false)
      if (!token) {
        await useSession().handleSessionExpired('Sesi Google telah berakhir. Silakan masuk kembali untuk mengunduh CV.')
        throw new Error('Sesi Google telah berakhir. Silakan masuk kembali.')
      }

      const downloaded = await GoogleDriveService.downloadFileContent(
        token,
        file.id,
        file.mimeType,
        file.name
      )

      let rawText = ''
      if (typeof downloaded.content === 'string') {
        rawText = downloaded.content
      } else {
        rawText = await CVParserService.extractTextFromPdf(downloaded.content)
      }

      if (!rawText.trim()) {
        throw new Error('Dokumen yang dipilih tidak memuat teks yang dapat diproses.')
      }

      const profile = CVParserService.parseTextToProfile(rawText, {
        fileName: downloaded.fileName,
        fileId: downloaded.fileId,
        source: 'google_drive',
        mimeType: downloaded.mimeType,
        checksum: downloaded.checksum,
        driveModifiedTime: downloaded.modifiedTime,
        fileSize: typeof downloaded.content !== 'string' ? downloaded.content.byteLength : undefined,
      })

      await useCVProfile().saveCVProfile(profile)
      return profile
    } catch (err: any) {
      if (
        err?.status === 401 ||
        err?.isAuthError ||
        err?.message?.includes('401') ||
        err?.message?.includes('Sesi Google') ||
        err?.message?.includes('Unauthorized')
      ) {
        await useSession().handleSessionExpired('Sesi login Google telah berakhir. Silakan masuk kembali.')
      }
      driveError.value = err.message || 'Gagal mengunduh atau mengekstrak CV'
      throw err
    } finally {
      isDownloading.value = false
    }
  }

  const syncDriveCV = async () => {
    const { cvProfile } = useCVProfile()
    if (!cvProfile.value || cvProfile.value.source !== 'google_drive') {
      return {
        status: 'not_drive' as const,
        message: 'CV saat ini bukan bersumber dari Google Drive.',
      }
    }

    isSyncing.value = true
    driveError.value = null
    try {
      const { GoogleAuthService } = await import('@/services/googleAuth')
      const { CVSyncService } = await import('@/services/cvSync')

      const token = await GoogleAuthService.getValidToken(false)
      if (!token) {
        await useSession().handleSessionExpired('Sesi Google telah berakhir. Silakan masuk kembali untuk menyinkronkan CV.')
        return {
          status: 'error' as const,
          message: 'Sesi Google telah berakhir. Mengarahkan ke menu awal...',
        }
      }

      const result = await CVSyncService.syncWithDrive(token, cvProfile.value)
      if (result.updatedProfile) {
        cvProfileState.value = result.updatedProfile
      }
      return result
    } catch (err: any) {
      if (
        err?.status === 401 ||
        err?.isAuthError ||
        err?.message?.includes('401') ||
        err?.message?.includes('Sesi Google') ||
        err?.message?.includes('Unauthorized')
      ) {
        await useSession().handleSessionExpired('Sesi login Google telah berakhir. Silakan masuk kembali.')
      }
      driveError.value = err.message || 'Gagal menyinkronkan CV'
      throw err
    } finally {
      isSyncing.value = false
    }
  }

  return {
    driveFiles,
    isListing,
    isDownloading,
    isSyncing,
    driveError,
    loadDriveFiles,
    selectAndSaveDriveCV,
    syncDriveCV,
  }
}

/**
 * Composable for Current Job Details
 */
export function useCurrentJob() {
  const loading = ref(!isInitialized.value)

  onMountedSafe(async () => {
    if (!isInitialized.value) {
      await initializeStorageState()
    }
    loading.value = false
  })

  const saveCurrentJob = async (job: JobDetails) => {
    currentJobState.value = job
    await storageService.set(STORAGE_KEYS.CURRENT_JOB, job)
  }

  const clearCurrentJob = async () => {
    currentJobState.value = null
    await storageService.remove(STORAGE_KEYS.CURRENT_JOB)
  }

  return {
    currentJob: currentJobState,
    loading,
    saveCurrentJob,
    clearCurrentJob,
  }
}

