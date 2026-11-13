<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { WifiOff, Wifi, Info, X, Settings, Sparkles, LogOut } from 'lucide-vue-next'
import Header from './components/Header.vue'
import TabNav from './components/TabNav.vue'
import GeminiApiKeyModal from './components/GeminiApiKeyModal.vue'
import WelcomeView from './views/WelcomeView.vue'
import AnalysisView from './views/AnalysisView.vue'
import EmailView from './views/EmailView.vue'
import CVProfileView from './views/CVProfileView.vue'
import SettingsView from './views/SettingsView.vue'
import { useNavigation, useSession, initializeStorageState } from '@/composables/useStorageState'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const { activeTab, setActiveTab } = useNavigation()
const { isSessionActive, isDemo, endDemoSession, handleSessionExpired, settings } = useSession()
const { isOnline, reconnected } = useNetworkStatus()

const showGeminiModal = ref(false)
const showApiKeyNotice = ref(false)

const handleEndDemo = async () => {
  await endDemoSession()
}

onMounted(async () => {
  await initializeStorageState()

  // Validate session expiration on startup
  if (settings.value.googleAuthStatus === 'connected' && !isDemo.value) {
    if (settings.value.googleTokenExpiresAt && Date.now() > settings.value.googleTokenExpiresAt) {
      await handleSessionExpired(
        'Sesi login Google telah berakhir. Silakan masuk kembali untuk melanjutkan akses fitur.'
      )
    } else {
      try {
        const { GoogleAuthService } = await import('@/services/googleAuth')
        const statusRes = await GoogleAuthService.checkAuthStatus()
        if (statusRes.status === 'disconnected') {
          await handleSessionExpired(
            'Sesi login Google telah berakhir. Silakan masuk kembali untuk melanjutkan akses fitur.'
          )
        }
      } catch {
        // Non-fatal if offline
      }
    }
  }
})

const handleLoginSuccess = () => {
  if (!settings.value.geminiApiKey?.trim()) {
    showGeminiModal.value = true
  }
}

const handleGeminiModalClose = () => {
  showGeminiModal.value = false
  // Prompt that user can configure Gemini API Key later in Settings
  showApiKeyNotice.value = true
}

const handleGeminiModalSaved = () => {
  showGeminiModal.value = false
  showApiKeyNotice.value = false
}

const handleOpenSettings = async () => {
  showApiKeyNotice.value = false
  await setActiveTab('settings')
}

const currentViewComponent = computed(() => {
  switch (activeTab.value) {
    case 'email':
      return EmailView
    case 'cv':
      return CVProfileView
    case 'settings':
      return SettingsView
    case 'analysis':
    default:
      return AnalysisView
  }
})
</script>

<template>
  <div class="flex h-screen w-full flex-col bg-gray-50 text-gray-900 transition-colors duration-200 dark:bg-gray-900 dark:text-gray-100 antialiased select-none">
    <!-- Unauthenticated / Welcome Screen State -->
    <template v-if="!isSessionActive">
      <main class="flex-1 overflow-y-auto">
        <WelcomeView @login-success="handleLoginSuccess" />
      </main>
    </template>

    <!-- Authenticated / Demo Mode Active State (4 Sub-menus) -->
    <template v-else>
      <!-- Top Header -->
      <Header />

      <!-- Tab Navigation -->
      <TabNav />

      <!-- Persistent Demo Mode Banner (Visible Across All Tabs) -->
      <div
        v-if="isDemo"
        class="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium animate-in fade-in duration-200"
      >
        <div class="flex items-center gap-2 min-w-0">
          <Sparkles class="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span class="truncate text-[11px]">
            <strong>Mode Demo Aktif</strong> &mdash; Anda sedang dalam simulasi.
          </span>
        </div>
        <button
          type="button"
          @click="handleEndDemo"
          class="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition-all shrink-0 ml-2"
          title="Selesai Demo dan kembali ke menu awal"
        >
          <LogOut class="h-2.5 w-2.5" />
          <span>Selesai Demo</span>
        </button>
      </div>

      <!-- Offline Indicator Banner -->
      <div
        v-if="!isOnline"
        class="flex items-center gap-2 bg-amber-500/15 border-b border-amber-500/30 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium"
        role="alert"
      >
        <WifiOff class="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>Mode Offline: Akses online (Drive, Gemini, Gmail) dinonaktifkan sementara.</span>
      </div>

      <!-- Reconnected Indicator Flash -->
      <div
        v-else-if="reconnected"
        class="flex items-center gap-2 bg-emerald-500/15 border-b border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium transition-all duration-300"
      >
        <Wifi class="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>Koneksi internet terhubung kembali!</span>
      </div>

      <!-- Post-login Gemini Notice Banner (shown if modal is closed) -->
      <div
        v-if="showApiKeyNotice"
        class="flex items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/90 px-3 py-2 text-xs text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-200 animate-in fade-in duration-200"
      >
        <div class="flex items-center gap-2 min-w-0">
          <Info class="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span class="truncate text-[11px]">
            Anda dapat mengatur <strong>Gemini API Key</strong> kapan saja melalui menu <strong>Pengaturan</strong>.
          </span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            @click="handleOpenSettings"
            class="inline-flex items-center gap-1 rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <Settings class="h-2.5 w-2.5" />
            <span>Pengaturan</span>
          </button>
          <button
            type="button"
            @click="showApiKeyNotice = false"
            class="rounded p-0.5 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300"
            title="Tutup pemberitahuan"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- Main Scrollable Content Area -->
      <main class="flex-1 overflow-y-auto">
        <keep-alive>
          <component :is="currentViewComponent" />
        </keep-alive>
      </main>

      <!-- Gemini API Key Modal (Triggered post-login if key is missing) -->
      <GeminiApiKeyModal
        :is-open="showGeminiModal"
        @close="handleGeminiModalClose"
        @saved="handleGeminiModalSaved"
      />
    </template>
  </div>
</template>

<style>
/* Global reset inside sidepanel */
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  width: 100%;
}
</style>
