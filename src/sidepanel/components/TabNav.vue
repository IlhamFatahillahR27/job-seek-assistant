<script setup lang="ts">
import { Sparkles, Mail, FileText, Settings } from 'lucide-vue-next'
import { useNavigation } from '@/composables/useStorageState'
import type { TabKey } from '@/types/settings'

const { activeTab, setActiveTab } = useNavigation()

interface TabItem {
  key: TabKey
  label: string
  icon: any
}

const tabs: TabItem[] = [
  { key: 'analysis', label: 'Analisa', icon: Sparkles },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'cv', label: 'Profil CV', icon: FileText },
  { key: 'settings', label: 'Pengaturan', icon: Settings },
]
</script>

<template>
  <nav class="border-b border-gray-200 bg-gray-50/80 px-2 dark:border-gray-800 dark:bg-gray-900/60">
    <div class="grid grid-cols-4 gap-1 py-1.5">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        @click="setActiveTab(tab.key)"
        :class="[
          'flex flex-col items-center justify-center rounded-lg py-1.5 px-1 text-xs font-medium transition-all duration-150',
          activeTab === tab.key
            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:text-indigo-400 dark:ring-white/10'
            : 'text-gray-600 hover:bg-white/50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200',
        ]"
      >
        <component :is="tab.icon" class="h-4 w-4 mb-0.5" />
        <span class="truncate">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>
