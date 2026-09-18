<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Header from './components/Header.vue'
import TabNav from './components/TabNav.vue'
import AnalysisView from './views/AnalysisView.vue'
import EmailView from './views/EmailView.vue'
import CVProfileView from './views/CVProfileView.vue'
import SettingsView from './views/SettingsView.vue'
import { useNavigation, initializeStorageState } from '@/composables/useStorageState'

const { activeTab } = useNavigation()

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
