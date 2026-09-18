<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Save,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  ExternalLink,
  Cloud,
  LogOut,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
} from 'lucide-vue-next'
import { useAppSettings, useGoogleAuth } from '@/composables/useStorageState'
import { storageService } from '@/services/storage'
import { GoogleAuthService } from '@/services/googleAuth'
import { GeminiClientService } from '@/services/geminiClient'
import type { ThemeMode } from '@/types/settings'
import type { ConnectionValidationResult, GeminiModelInfo } from '@/types/analysis'

const { settings, updateSettings, resetSettings } = useAppSettings()
const { login, logout } = useGoogleAuth()

const showApiKey = ref(false)
const inputApiKey = ref(settings.value.geminiApiKey)
const selectedModel = ref(settings.value.geminiModel || 'gemini-2.0-flash')
const inputUseDemoGemini = ref(settings.value.useDemoGeminiMode || false)
const availableModelsList = ref<GeminiModelInfo[]>(settings.value.availableGeminiModels || [])
const saveSuccess = ref<string | null>(null)
const isSaving = ref(false)

// Gemini API Key Validation State
const isValidatingKey = ref(false)
const keyValidationResult = ref<ConnectionValidationResult | null>(null)

watch(
  () => settings.value.availableGeminiModels,
  (val) => {
    if (val && val.length > 0) {
      availableModelsList.value = val
    }
  },
  { immediate: true }
)

watch(
  () => settings.value.geminiModel,
  (val) => {
    if (val) {
      selectedModel.value = val
    }
  },
  { immediate: true }
)

// Google Workspace State
const isGoogleActionLoading = ref(false)
const googleErrorMsg = ref<string | null>(null)
const inputGoogleClientId = ref(settings.value.googleClientId || '')
const inputUseDemoMode = ref(settings.value.useDemoDriveMode || false)
const redirectUri = ref(GoogleAuthService.getRedirectUrl())
const isCopied = ref(false)

// Keep inputGoogleClientId in sync when storage initializes
watch(
  () => settings.value.googleClientId,
  (val) => {
    if (val && !inputGoogleClientId.value) {
      inputGoogleClientId.value = val
    }
  }
)

watch(
  () => settings.value.useDemoDriveMode,
  (val) => {
    inputUseDemoMode.value = val
  }
)

const copyRedirectUri = async () => {
  try {
    await navigator.clipboard.writeText(redirectUri.value)
    isCopied.value = true
    setTimeout(() => (isCopied.value = false), 2500)
  } catch (err) {
    console.error('Failed to copy redirect URI:', err)
  }
}

const handleGoogleLogin = async () => {
  isGoogleActionLoading.value = true
  googleErrorMsg.value = null
  try {
    const cid = inputGoogleClientId.value.trim()
    if (cid) {
      await updateSettings({ googleClientId: cid })
    }
    await login(cid || undefined)
    saveSuccess.value = 'Akun Google Workspace berhasil terhubung!'
    setTimeout(() => (saveSuccess.value = null), 3000)
  } catch (err: any) {
    googleErrorMsg.value = err.message || 'Gagal login ke Google Workspace.'
  } finally {
    isGoogleActionLoading.value = false
  }
}

const handleGoogleLogout = async () => {
  isGoogleActionLoading.value = true
  try {
    await logout()
    saveSuccess.value = 'Koneksi Google Workspace diputuskan.'
    setTimeout(() => (saveSuccess.value = null), 3000)
  } catch (err: any) {
    googleErrorMsg.value = err.message
  } finally {
    isGoogleActionLoading.value = false
  }
}

const handleToggleDemoMode = async () => {
  await updateSettings({ useDemoDriveMode: inputUseDemoMode.value })
  if (inputUseDemoMode.value && settings.value.googleAuthStatus !== 'connected') {
    await handleGoogleLogin()
  }
}

const handleValidateApiKey = async () => {
  isValidatingKey.value = true
  keyValidationResult.value = null
  try {
    const res = await GeminiClientService.validateApiKey(inputApiKey.value)
    keyValidationResult.value = res
    if (res.valid) {
      const models = res.availableModels || []
      availableModelsList.value = models
      // If current selectedModel is not in the models list, pick the best default
      if (models.length > 0 && !models.some((m) => m.id === selectedModel.value)) {
        selectedModel.value = GeminiClientService.getBestDefaultModel(models)
      }
      await updateSettings({
        geminiApiKey: inputApiKey.value.trim(),
        geminiModel: selectedModel.value,
        availableGeminiModels: models,
        geminiKeyValid: true,
        geminiKeyCheckedAt: res.testedAt,
      })
      saveSuccess.value = `Koneksi Google Gemini API terverifikasi (${models.length} model aktif)!`
      setTimeout(() => (saveSuccess.value = null), 3500)
    }
  } finally {
    isValidatingKey.value = false
  }
}

const handleSaveSettings = async () => {
  isSaving.value = true
  try {
    await updateSettings({
      geminiApiKey: inputApiKey.value.trim(),
      geminiModel: selectedModel.value,
      availableGeminiModels: availableModelsList.value,
      useDemoGeminiMode: inputUseDemoGemini.value,
      googleClientId: inputGoogleClientId.value.trim(),
      useDemoDriveMode: inputUseDemoMode.value,
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
        <div class="mt-1 flex items-center justify-between text-[10px]">
          <span class="text-gray-500 dark:text-gray-400">
            Tersimpan aman di <code>chrome.storage.local</code>.
          </span>
          <span
            v-if="settings.geminiKeyValid && settings.geminiApiKey"
            class="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium"
          >
            <ShieldCheck class="h-3 w-3" />
            <span>Terverifikasi</span>
          </span>
        </div>
      </div>

      <!-- Instant Connection Validation Button & Result -->
      <div class="space-y-2">
        <button
          type="button"
          @click="handleValidateApiKey"
          :disabled="isValidatingKey || !inputApiKey.trim()"
          class="flex w-full items-center justify-center space-x-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isValidatingKey }" />
          <span>{{ isValidatingKey ? 'Memvalidasi API Key ke Google...' : 'Uji Koneksi API Key' }}</span>
        </button>

        <!-- Validation Result Feedback Banner -->
        <div
          v-if="keyValidationResult"
          class="rounded-lg p-2.5 text-xs space-y-1"
          :class="keyValidationResult.valid
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'"
        >
          <div class="flex items-center space-x-1.5 font-semibold">
            <CheckCircle v-if="keyValidationResult.valid" class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <AlertCircle v-else class="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            <span>{{ keyValidationResult.valid ? 'Koneksi Berhasil!' : 'Validasi Gagal' }}</span>
          </div>
          <p v-if="keyValidationResult.valid" class="text-[11px] leading-relaxed">
            API Key aktif dan siap memanggil model Gemini AI.
            <span v-if="keyValidationResult.models && keyValidationResult.models.length > 0">
              Model terdeteksi: {{ keyValidationResult.models.slice(0, 3).join(', ') }}.
            </span>
          </p>
          <p v-else class="text-[11px] leading-relaxed">
            {{ keyValidationResult.errorMessage }}
          </p>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-[11px] font-medium text-gray-700 dark:text-gray-300">
            Model Gemini (ListModels)
          </label>
          <span
            v-if="availableModelsList.length > 0"
            class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium"
          >
            {{ availableModelsList.length }} model tersedia
          </span>
        </div>

        <select
          v-model="selectedModel"
          class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 font-mono"
        >
          <!-- Dynamic options from ModelService.ListModels -->
          <template v-if="availableModelsList.length > 0">
            <option
              v-for="m in availableModelsList"
              :key="m.id"
              :value="m.id"
            >
              {{ m.displayName && m.displayName !== m.id ? `${m.displayName} (${m.id})` : m.id }}
            </option>
          </template>

          <!-- Fallback options if ListModels has not been fetched yet -->
          <template v-else>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Direkomendasikan)</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Latest)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          </template>
        </select>
        <p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
          Model diverifikasi langsung dari <code>ModelService.ListModels</code> Google AI Studio.
        </p>
      </div>

      <!-- Demo Mode Alternative for AI -->
      <div class="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-start justify-between">
        <div class="pr-2">
          <label class="text-[11px] font-medium text-gray-800 dark:text-gray-200">
            Mode Simulasi Gemini AI (Demo Mode)
          </label>
          <p class="text-[10px] text-gray-500 dark:text-gray-400">
            Uji alur evaluasi kecocokan CV dan draf email tanpa API Key Google AI Studio.
          </p>
        </div>
        <input
          type="checkbox"
          v-model="inputUseDemoGemini"
          class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
        />
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
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="flex items-center space-x-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
          <Cloud class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Google Workspace (Drive & Gmail)</span>
        </h3>
        <span
          class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          :class="settings.googleAuthStatus === 'connected'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'"
        >
          {{ settings.googleAuthStatus === 'connected' ? 'Terhubung' : 'Belum Terhubung' }}
        </span>
      </div>

      <!-- If Connected: Show User Info & Disconnect -->
      <div v-if="settings.googleAuthStatus === 'connected'" class="space-y-3">
        <div class="flex items-center space-x-3 rounded-lg bg-gray-50 p-2.5 dark:bg-gray-750">
          <img
            v-if="settings.googleUserAvatar"
            :src="settings.googleUserAvatar"
            alt="Google Avatar"
            class="h-9 w-9 rounded-full border border-gray-200 object-cover dark:border-gray-700"
          />
          <div
            v-else
            class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-semibold text-xs"
          >
            {{ (settings.googleUserName || settings.googleUserEmail || 'G')[0].toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
              {{ settings.googleUserName || 'Akun Google' }}
            </p>
            <p class="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {{ settings.googleUserEmail }}
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="handleGoogleLogout"
          :disabled="isGoogleActionLoading"
          class="flex w-full items-center justify-center space-x-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:bg-gray-800 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
        >
          <LogOut class="h-3.5 w-3.5" />
          <span>{{ isGoogleActionLoading ? 'Memutuskan...' : 'Putuskan Koneksi Google' }}</span>
        </button>
      </div>

      <!-- If Disconnected: Show Connect Button & Configuration -->
      <div v-else class="space-y-3">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">
          Hubungkan akun Google Workspace Anda untuk memilih dan menyinkronkan CV dari Google Drive serta mengirim lamaran via Gmail.
        </p>

        <!-- Error Alert Banner -->
        <div
          v-if="googleErrorMsg"
          class="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-[11px] text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 space-y-1"
        >
          <div class="flex items-center space-x-1.5 font-semibold text-rose-900 dark:text-rose-200">
            <AlertCircle class="h-3.5 w-3.5 shrink-0" />
            <span>Koneksi Gagal</span>
          </div>
          <p class="leading-relaxed">{{ googleErrorMsg }}</p>
        </div>

        <!-- Google OAuth Client ID Input -->
        <div class="space-y-1">
          <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
            Google OAuth 2.0 Client ID (Web Application)
          </label>
          <input
            v-model="inputGoogleClientId"
            type="text"
            placeholder="1234567890-abcdef.apps.googleusercontent.com"
            class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 font-mono"
          />
        </div>

        <!-- Authorized Redirect URI Box with Copy Button -->
        <div class="rounded-lg bg-gray-50 dark:bg-gray-750 p-2.5 space-y-1.5 text-[11px]">
          <div class="flex items-center justify-between text-gray-700 dark:text-gray-300 font-medium">
            <span>Authorized Redirect URI Google:</span>
            <button
              type="button"
              @click="copyRedirectUri"
              class="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              <Check v-if="isCopied" class="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <Copy v-else class="h-3 w-3" />
              <span>{{ isCopied ? 'Tersalin!' : 'Salin URI' }}</span>
            </button>
          </div>
          <div class="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 font-mono text-[10px] text-indigo-700 dark:text-indigo-300 select-all break-all">
            {{ redirectUri }}
          </div>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
            *Pastikan di Google Cloud Console, OAuth Client ID dibuat bertipe <strong>Web application</strong> dan URL di atas ditambahkan ke <em>Authorized redirect URIs</em>.
          </p>
        </div>

        <button
          type="button"
          @click="handleGoogleLogin"
          :disabled="isGoogleActionLoading"
          class="flex w-full items-center justify-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Cloud class="h-3.5 w-3.5" />
          <span>{{ isGoogleActionLoading ? 'Menghubungkan...' : 'Hubungkan Akun Google Workspace' }}</span>
        </button>

        <!-- Demo Mode Alternative -->
        <div class="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-start justify-between">
          <div class="pr-2">
            <label class="text-[11px] font-medium text-gray-800 dark:text-gray-200">
              Mode Simulasi Google Drive (Demo)
            </label>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">
              Coba langsung fitur CV Drive & parsing tanpa setup Google Cloud Console.
            </p>
          </div>
          <input
            type="checkbox"
            v-model="inputUseDemoMode"
            @change="handleToggleDemoMode"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
          />
        </div>
      </div>
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
