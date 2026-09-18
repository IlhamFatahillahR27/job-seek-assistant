<script setup lang="ts">
import { ref } from 'vue'
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  Save,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  ExternalLink,
} from 'lucide-vue-next'
import { useAppSettings } from '@/composables/useStorageState'
import { storageService } from '@/services/storage'
import type { ThemeMode } from '@/types/settings'

const { settings, updateSettings, resetSettings } = useAppSettings()

const showApiKey = ref(false)
const inputApiKey = ref(settings.value.geminiApiKey)
const selectedModel = ref(settings.value.geminiModel || 'gemini-1.5-flash')
const saveSuccess = ref<string | null>(null)
const isSaving = ref(false)

const handleSaveSettings = async () => {
  isSaving.value = true
  try {
    await updateSettings({
      geminiApiKey: inputApiKey.value.trim(),
      geminiModel: selectedModel.value,
    })
    saveSuccess.value = 'Pengaturan berhasil disimpan!'
    setTimeout(() => (saveSuccess.value = null), 3000)
  } finally {
    isSaving.value = false
  }
}

const handleThemeChange = async (theme: ThemeMode) => {
  await updateSettings({ theme })
}

const handleClearAllStorage = async () => {
  if (
    confirm(
      'PERINGATAN: Apakah Anda yakin ingin mereset seluruh data lokal (CV, pengaturan, riwayat)? Tindakan ini tidak dapat dibatalkan.'
    )
  ) {
    await storageService.clear()
    await resetSettings()
    inputApiKey.value = ''
    saveSuccess.value = 'Penyimpanan lokal berhasil dibersihkan.'
    setTimeout(() => (saveSuccess.value = null), 3000)
  }
}
</script>

<template>
  <div class="space-y-4 p-4">
    <!-- Success Banner -->
    <div
      v-if="saveSuccess"
      class="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
    >
      <CheckCircle class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>{{ saveSuccess }}</span>
    </div>

    <!-- Gemini AI Configuration -->
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="flex items-center space-x-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
          <Key class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Google Gemini API</span>
        </h3>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          class="flex items-center space-x-1 text-[11px] text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <span>Dapatkan Key</span>
          <ExternalLink class="h-3 w-3" />
        </a>
      </div>

      <div>
        <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
          Gemini API Key
        </label>
        <div class="relative">
          <input
            v-model="inputApiKey"
            :type="showApiKey ? 'text' : 'password'"
            placeholder="AIzaSy..."
            class="w-full rounded-lg border border-gray-200 bg-white pl-2.5 pr-9 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 font-mono"
          />
          <button
            type="button"
            @click="showApiKey = !showApiKey"
            class="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <EyeOff v-if="showApiKey" class="h-3.5 w-3.5" />
            <Eye v-else class="h-3.5 w-3.5" />
          </button>
        </div>
        <p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
          Kunci API disimpan aman di <code>chrome.storage.local</code> perangkat Anda sendiri.
        </p>
      </div>

      <div>
        <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
          Model Gemini
        </label>
        <select
          v-model="selectedModel"
          class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="gemini-1.5-flash">Gemini 1.5 Flash (Cepat & Direkomendasikan)</option>
          <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro (Penalaran Kompleks)</option>
        </select>
      </div>

      <button
        type="button"
        @click="handleSaveSettings"
        :disabled="isSaving"
        class="flex w-full items-center justify-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        <Save class="h-3.5 w-3.5" />
        <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi AI' }}</span>
      </button>
    </div>

    <!-- Google Workspace OAuth Status -->
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-2.5">
      <h3 class="text-xs font-semibold text-gray-900 dark:text-gray-100">
        Google Workspace (Drive & Gmail)
      </h3>
      <p class="text-[11px] text-gray-500 dark:text-gray-400">
        Status: <span class="font-medium text-amber-600 dark:text-amber-400">Belum Terhubung</span> (Integrasi OAuth2 di Milestone 2)
      </p>
      <button
        type="button"
        disabled
        class="flex w-full items-center justify-center space-x-1.5 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-850"
      >
        <span>Hubungkan Google Workspace (M2)</span>
      </button>
    </div>

    <!-- Theme Preference -->
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-2.5">
      <h3 class="text-xs font-semibold text-gray-900 dark:text-gray-100">
        Tema Tampilan
      </h3>
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          @click="handleThemeChange('light')"
          :class="[
            'flex items-center justify-center space-x-1.5 rounded-lg border py-2 px-1 text-xs font-medium transition-all',
            settings.theme === 'light'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-750',
          ]"
        >
          <Sun class="h-3.5 w-3.5" />
          <span>Terang</span>
        </button>

        <button
          type="button"
          @click="handleThemeChange('dark')"
          :class="[
            'flex items-center justify-center space-x-1.5 rounded-lg border py-2 px-1 text-xs font-medium transition-all',
            settings.theme === 'dark'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-750',
          ]"
        >
          <Moon class="h-3.5 w-3.5" />
          <span>Gelap</span>
        </button>

        <button
          type="button"
          @click="handleThemeChange('system')"
          :class="[
            'flex items-center justify-center space-x-1.5 rounded-lg border py-2 px-1 text-xs font-medium transition-all',
            settings.theme === 'system'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-750',
          ]"
        >
          <Laptop class="h-3.5 w-3.5" />
          <span>Sistem</span>
        </button>
      </div>
    </div>

    <!-- Danger Zone: Storage Reset -->
    <div class="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm dark:border-rose-950/50 dark:bg-rose-950/20 space-y-2">
      <h3 class="text-xs font-semibold text-rose-800 dark:text-rose-300">
        Reset Data
      </h3>
      <p class="text-[11px] text-rose-700/80 dark:text-rose-400">
        Hapus seluruh data cache, konfigurasi API key, dan state ekstensi dari penyimpanan lokal.
      </p>
      <button
        type="button"
        @click="handleClearAllStorage"
        class="flex w-full items-center justify-center space-x-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm hover:bg-rose-50 dark:border-rose-800 dark:bg-gray-900 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
      >
        <RotateCcw class="h-3.5 w-3.5" />
        <span>Reset Seluruh Penyimpanan Lokal</span>
      </button>
    </div>
  </div>
</template>
