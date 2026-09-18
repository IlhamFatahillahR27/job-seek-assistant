<script setup lang="ts">
import { computed } from 'vue'
import { Sparkles, Sun, Moon, Key, FileCheck, FileX, Cloud, CloudOff } from 'lucide-vue-next'
import { useAppSettings, useCVProfile, useTheme } from '@/composables/useStorageState'

const { settings } = useAppSettings()
const { cvProfile } = useCVProfile()
const { toggleTheme } = useTheme()

const hasApiKey = computed(() => !!settings.value.geminiApiKey?.trim())
const hasCV = computed(() => !!cvProfile.value?.rawText?.trim())
const isGoogleConnected = computed(() => settings.value.googleAuthStatus === 'connected')
const isDark = computed(() => settings.value.theme === 'dark')
</script>

<template>
  <header class="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
    <!-- App Title & Logo -->
    <div class="flex items-center space-x-2">
      <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
        <Sparkles class="h-4 w-4" />
      </div>
      <div>
        <h1 class="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Job Seek Assistant
        </h1>
      </div>
    </div>

    <!-- Right Controls: Status Indicators & Theme Switcher -->
    <div class="flex items-center space-x-1.5">
      <!-- Google Workspace Status Badge -->
      <div
        class="flex items-center space-x-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
        :class="isGoogleConnected
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'"
        :title="isGoogleConnected ? `Google Workspace Terhubung: ${settings.googleUserEmail}` : 'Google Workspace Belum Terhubung'"
      >
        <Cloud v-if="isGoogleConnected" class="h-3 w-3" />
        <CloudOff v-else class="h-3 w-3" />
        <span class="hidden sm:inline">{{ isGoogleConnected ? 'Google' : 'No Sync' }}</span>
      </div>

      <!-- Gemini API Key Status Badge -->
      <div
        class="flex items-center space-x-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
        :class="hasApiKey 
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'"
        :title="hasApiKey ? 'Gemini API Key Aktif' : 'Gemini API Key Belum Dikonfigurasi'"
      >
        <Key class="h-3 w-3" />
        <span class="hidden sm:inline">{{ hasApiKey ? 'AI Siap' : 'No Key' }}</span>
      </div>

      <!-- CV Loaded Status Badge -->
      <div
        class="flex items-center space-x-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
        :class="hasCV 
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' 
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
        :title="hasCV ? `CV Tersedia: ${cvProfile?.fileName}` : 'CV Belum Dimuat'"
      >
        <component :is="hasCV ? FileCheck : FileX" class="h-3 w-3" />
        <span class="hidden sm:inline">{{ hasCV ? 'CV Ada' : 'No CV' }}</span>
      </div>

      <!-- Theme Switcher Button -->
      <button
        type="button"
        @click="toggleTheme"
        class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        :title="isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'"
      >
        <Sun v-if="isDark" class="h-4 w-4" />
        <Moon v-else class="h-4 w-4" />
      </button>
    </div>
  </header>
</template>
