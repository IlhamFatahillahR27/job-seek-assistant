<script setup lang="ts">
import { ref } from 'vue'
import { Sparkles, Globe, Edit3, CheckCircle, AlertCircle } from 'lucide-vue-next'
import { useAppSettings, useCVProfile } from '@/composables/useStorageState'

const { settings } = useAppSettings()
const { cvProfile } = useCVProfile()

const isExtracting = ref(false)
const showManualInput = ref(false)
const manualTitle = ref('')
const manualCompany = ref('')
const manualDescription = ref('')

const handleExtractPage = async () => {
  isExtracting.value = true
  try {
    // Simulated placeholder action for Milestone 1 (actual DOM extractor arrives in Milestone 3)
    await new Promise((resolve) => setTimeout(resolve, 800))
    manualTitle.value = 'Senior Frontend Engineer'
    manualCompany.value = 'TechCorp Global'
    manualDescription.value = 'Kami mencari Senior Frontend Engineer yang menguasai Vue 3, TypeScript, dan Tailwind CSS...'
    showManualInput.value = true
  } finally {
    isExtracting.value = false
  }
}
</script>

<template>
  <div class="space-y-4 p-4">
    <!-- Notice Banner if CV or API Key is missing -->
    <div
      v-if="!settings.geminiApiKey || !cvProfile"
      class="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30"
    >
      <div class="flex items-start space-x-2.5">
        <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div class="text-xs text-amber-800 dark:text-amber-300">
          <p class="font-medium">Persiapan Analisis:</p>
          <ul class="mt-1 list-disc pl-4 space-y-0.5 text-[11px]">
            <li v-if="!cvProfile">
              CV belum tersedia. Kunjungi tab <strong>Profil CV</strong> untuk memasukkan CV Anda.
            </li>
            <li v-if="!settings.geminiApiKey">
              Gemini API Key belum diisi. Kunjungi tab <strong>Pengaturan</strong>.
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Main Extract Action Card -->
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-850 dark:bg-gray-800">
      <div class="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
        <Globe class="h-4 w-4" />
        <h2 class="text-xs font-semibold uppercase tracking-wider">Ekstraksi Lowongan</h2>
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Buka halaman lowongan kerja aktif (LinkedIn, Glints, Jobstreet, dll) dan klik tombol di bawah.
      </p>

      <div class="mt-3 flex flex-col gap-2">
        <button
          type="button"
          @click="handleExtractPage"
          :disabled="isExtracting"
          class="flex w-full items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
        >
          <Sparkles class="h-4 w-4" :class="{ 'animate-spin': isExtracting }" />
          <span>{{ isExtracting ? 'Mengekstrak Halaman...' : 'Ekstrak Halaman Lowongan Ini' }}</span>
        </button>

        <button
          type="button"
          @click="showManualInput = !showManualInput"
          class="flex items-center justify-center space-x-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-750 transition-colors"
        >
          <Edit3 class="h-3.5 w-3.5" />
          <span>{{ showManualInput ? 'Tutup Input Manual' : 'Input Lowongan Manual' }}</span>
        </button>
      </div>
    </div>

    <!-- Manual Input & Preview Section -->
    <div
      v-if="showManualInput"
      class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-3"
    >
      <h3 class="text-xs font-semibold text-gray-900 dark:text-gray-100">
        Rincian Lowongan Kerja
      </h3>

      <div class="space-y-2">
        <div>
          <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
            Posisi / Job Title
          </label>
          <input
            v-model="manualTitle"
            type="text"
            placeholder="Contoh: Senior Frontend Developer"
            class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nama Perusahaan
          </label>
          <input
            v-model="manualCompany"
            type="text"
            placeholder="Contoh: PT Teknologi Bangsa"
            class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deskripsi & Kualifikasi
          </label>
          <textarea
            v-model="manualDescription"
            rows="4"
            placeholder="Salin atau edit deskripsi lowongan di sini..."
            class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          ></textarea>
        </div>

        <button
          type="button"
          class="flex w-full items-center justify-center space-x-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <CheckCircle class="h-3.5 w-3.5" />
          <span>Mulai Analisa Relevansi (Milestone 4)</span>
        </button>
      </div>
    </div>

    <!-- Analysis Result Placeholder Card -->
    <div class="rounded-xl border border-dashed border-gray-300 p-5 text-center dark:border-gray-700">
      <Sparkles class="mx-auto h-7 w-7 text-gray-400 dark:text-gray-500" />
      <h4 class="mt-2 text-xs font-medium text-gray-800 dark:text-gray-200">
        Hasil Analisis Relevansi & Gap
      </h4>
      <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
        Skor kecocokan (0-100%), matched skills, missing gaps, dan tips interview akan muncul di sini setelah integrasi Gemini AI pada Milestone 4.
      </p>
    </div>
  </div>
</template>
