<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { WifiOff, Wifi } from 'lucide-vue-next'
import Header from './components/Header.vue'
import TabNav from './components/TabNav.vue'
import AnalysisView from './views/AnalysisView.vue'
import EmailView from './views/EmailView.vue'
import CVProfileView from './views/CVProfileView.vue'
import SettingsView from './views/SettingsView.vue'
import { useNavigation, initializeStorageState } from '@/composables/useStorageState'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const { activeTab } = useNavigation()
const { isOnline, reconnected } = useNetworkStatus()

onMounted(async () => {
  await initializeStorageState()
})

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
    <!-- Top Header -->
    <Header />

    <!-- Tab Navigation -->
    <TabNav />

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

    <!-- Main Scrollable Content Area -->
    <main class="flex-1 overflow-y-auto">
      <keep-alive>
        <component :is="currentViewComponent" />
      </keep-alive>
    </main>
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
