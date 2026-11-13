<script setup lang="ts">
import { ref } from 'vue'
import { Key, Eye, EyeOff, ExternalLink, X, RefreshCw, CheckCircle, AlertCircle } from 'lucide-vue-next'
import { useAppSettings } from '@/composables/useStorageState'
import { GeminiClientService } from '@/services/geminiClient'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', apiKey: string): void
}>()

const { settings, updateSettings } = useAppSettings()

const inputKey = ref(settings.value.geminiApiKey || '')
const showKey = ref(false)
const isValidating = ref(false)
const validationError = ref<string | null>(null)
const successMsg = ref<string | null>(null)

const handleSaveAndValidate = async () => {
  const trimmedKey = inputKey.value.trim()
  if (!trimmedKey) {
    validationError.value = 'Silakan masukkan Gemini API Key terlebih dahulu.'
    return
  }

  isValidating.value = true
  validationError.value = null
  successMsg.value = null

  try {
    const res = await GeminiClientService.validateApiKey(trimmedKey)
    if (res.valid) {
      const models = res.availableModels || []
      const defaultModel = models.length > 0
        ? GeminiClientService.getBestDefaultModel(models)
        : settings.value.geminiModel || 'gemini-2.0-flash'

      await updateSettings({
        geminiApiKey: trimmedKey,
        geminiKeyValid: true,
        geminiKeyCheckedAt: new Date().toISOString(),
        geminiModel: defaultModel,
        availableGeminiModels: models,
      })

      successMsg.value = 'Gemini API Key berhasil diverifikasi & disimpan!'
      setTimeout(() => {
        emit('saved', trimmedKey)
      }, 900)
    } else {
      validationError.value = res.errorMessage || 'API Key tidak valid atau tidak memiliki kuota aktif.'
    }
  } catch (err: any) {
    validationError.value = err.message || 'Gagal memverifikasi API Key. Periksa koneksi internet Anda.'
  } finally {
    isValidating.value = false
  }
}

const handleDismiss = () => {
  emit('close')
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    role="dialog"
    aria-modal="true"
  >
    <div class="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/10 dark:bg-gray-800 dark:ring-white/10 dark:text-gray-100">
      <!-- Close Button (X) -->
      <button
        type="button"
        @click="handleDismiss"
        class="absolute top-3.5 right-3.5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        title="Tutup (Atur Nanti di Pengaturan)"
      >
        <X class="h-4 w-4" />
      </button>

      <!-- Modal Icon & Title -->
      <div class="flex items-center gap-3 mb-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          <Key class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
            Konfigurasi Gemini API Key
          </h2>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">
            Aktifkan fitur analisa lowongan cerdas & draft email
          </p>
        </div>
      </div>

      <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
        Masukkan Gemini API Key Anda untuk menghubungkan kecerdasan AI Google Gemini ke asisten ini.
      </p>

      <!-- Input Field -->
      <div class="space-y-1.5 mb-3">
        <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
          Gemini API Key
        </label>
        <div class="relative">
          <input
            v-model="inputKey"
            :type="showKey ? 'text' : 'password'"
            placeholder="AIzaSy..."
            class="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs pr-10 text-gray-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            @keyup.enter="handleSaveAndValidate"
          />
          <button
            type="button"
            @click="showKey = !showKey"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <component :is="showKey ? EyeOff : Eye" class="h-4 w-4" />
          </button>
        </div>

        <div class="pt-1 flex items-center justify-between text-[11px]">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
          >
            <span>Dapatkan API Key gratis di Google AI Studio</span>
            <ExternalLink class="h-3 w-3" />
          </a>
        </div>
      </div>

      <!-- Feedback Banner -->
      <div
        v-if="validationError"
        class="mb-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 flex items-start gap-2"
      >
        <AlertCircle class="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
        <span>{{ validationError }}</span>
      </div>

      <div
        v-if="successMsg"
        class="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2"
      >
        <CheckCircle class="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>{{ successMsg }}</span>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
        <button
          type="button"
          @click="handleDismiss"
          class="rounded-xl px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Nanti Saja
        </button>
        <button
          type="button"
          @click="handleSaveAndValidate"
          :disabled="isValidating || !inputKey.trim()"
          class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
        >
          <RefreshCw v-if="isValidating" class="h-3.5 w-3.5 animate-spin" />
          <span>{{ isValidating ? 'Memvalidasi...' : 'Simpan & Validasi' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
