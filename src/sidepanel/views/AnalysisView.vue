<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Sparkles,
  Globe,
  Edit3,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Mail,
  MapPin,
  Building,
  Briefcase,
  Save,
} from 'lucide-vue-next'
import { useAppSettings, useCVProfile, useNavigation } from '@/composables/useStorageState'
import { useJobExtractor } from '@/composables/useJobExtractor'
import { useJobAnalysis } from '@/composables/useJobAnalysis'
import AnalysisResultCard from '../components/AnalysisResultCard.vue'
import type { JobDetails } from '@/types/job'

const { settings } = useAppSettings()
const { cvProfile } = useCVProfile()
const { setActiveTab } = useNavigation()
const {
  currentAnalysis,
  isAnalyzing,
  analysisError,
  cooldownTimer,
  runAnalysis,
  clearAnalysis,
} = useJobAnalysis()
const {
  currentJob,
  isExtracting,
  isExtractingAi,
  extractionError,
  successMessage,
  extractFromActiveTab,
  extractWithAI,
  updateJob,
  resetJob,
  createEmptyJob,
} = useJobExtractor()

// Local editable copy to support responsive review and editing
const editableJob = ref<JobDetails>(currentJob.value || createEmptyJob())
const showManualForm = ref(!!currentJob.value)
const isSaved = ref(false)

// Sync local form when currentJob changes from background/storage
watch(
  currentJob,
  (newJob) => {
    if (newJob) {
      editableJob.value = JSON.parse(JSON.stringify(newJob))
      showManualForm.value = true
    } else {
      editableJob.value = createEmptyJob()
    }
  },
  { immediate: true, deep: true }
)

const handleExtract = async () => {
  try {
    isSaved.value = false
    const extracted = await extractFromActiveTab()
    if (extracted) {
      editableJob.value = JSON.parse(JSON.stringify(extracted))
      showManualForm.value = true
    }
  } catch {
    // Error is handled reactively by useJobExtractor
  }
}

const handleExtractAi = async () => {
  try {
    isSaved.value = false
    const extracted = await extractWithAI()
    if (extracted) {
      editableJob.value = JSON.parse(JSON.stringify(extracted))
      showManualForm.value = true
    }
  } catch {
    // Error is handled reactively by useJobExtractor
  }
}

const handleSave = async () => {
  if (!editableJob.value.title.trim()) {
    editableJob.value.title = 'Posisi Pekerjaan'
  }
  if (!editableJob.value.company.trim()) {
    editableJob.value.company = 'Perusahaan'
  }
  await updateJob(editableJob.value)
  isSaved.value = true
  setTimeout(() => {
    isSaved.value = false
  }, 2500)
}

const handleReset = async () => {
  await resetJob()
  await clearAnalysis()
  editableJob.value = createEmptyJob()
  showManualForm.value = false
  isSaved.value = false
}

const handleRunAnalysis = async (forceDemo = false) => {
  try {
    if (editableJob.value.title || editableJob.value.description) {
      await updateJob(editableJob.value)
    }
    await runAnalysis(editableJob.value, undefined, { forceDemo })
  } catch {
    // Handled reactively by useJobAnalysis.analysisError
  }
}

const handleClearAnalysis = async () => {
  await clearAnalysis()
}

const handleOpenManual = () => {
  if (!showManualForm.value) {
    if (!editableJob.value.title) {
      editableJob.value = createEmptyJob()
    }
    showManualForm.value = true
  } else {
    showManualForm.value = false
  }
}

const getPlatformBadge = (platform?: string) => {
  switch (platform) {
    case 'linkedin':
      return { label: 'LinkedIn Jobs', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' }
    case 'glints':
      return { label: 'Glints', bg: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' }
    case 'jobstreet':
      return { label: 'Jobstreet / SEEK', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' }
    case 'indeed':
      return { label: 'Indeed', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' }
    default:
      return { label: 'Career Website', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' }
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
              CV belum tersedia. Kunjungi tab <strong>Profil CV</strong> untuk memilih CV Anda.
            </li>
            <li v-if="!settings.geminiApiKey">
              Gemini API Key belum diisi. Kunjungi tab <strong>Pengaturan</strong>.
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Extraction Error Banner -->
    <div
      v-if="extractionError"
      class="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/30"
    >
      <div class="flex items-start space-x-2.5">
        <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div class="text-xs text-red-800 dark:text-red-300">
          <p class="font-medium">Gagal Mengekstrak Halaman</p>
          <p class="mt-0.5 text-[11px] leading-relaxed">{{ extractionError }}</p>
        </div>
      </div>
    </div>

    <!-- Success Feedback Banner -->
    <div
      v-if="successMessage"
      class="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center space-x-2"
    >
      <CheckCircle class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span class="text-[11px] font-medium truncate">{{ successMessage }}</span>
    </div>

    <!-- Main Extract Action Card -->
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div class="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
        <Globe class="h-4 w-4" />
        <h2 class="text-xs font-semibold uppercase tracking-wider">Ekstraksi Lowongan Kerja</h2>
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Buka halaman detail lowongan (LinkedIn, Glints, Jobstreet, Indeed, atau situs karir) dan pilih metode ekstraksi:
      </p>

      <div class="mt-3 flex flex-col gap-2">
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            @click="handleExtract"
            :disabled="isExtracting"
            class="flex items-center justify-center space-x-1.5 rounded-lg bg-indigo-600 px-2.5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            title="Ekstrak cepat menggunakan struktur DOM halaman web"
          >
            <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isExtracting && !isExtractingAi }" />
            <span class="truncate">{{ isExtracting && !isExtractingAi ? 'Mengekstrak...' : 'Ekstrak Halaman' }}</span>
          </button>

          <button
            type="button"
            @click="handleExtractAi"
            :disabled="isExtracting"
            class="flex items-center justify-center space-x-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-2.5 text-xs font-medium text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
            title="Ekstrak cerdas berbasis Gemini AI membaca seluruh konten visual halaman"
          >
            <Sparkles class="h-3.5 w-3.5" :class="{ 'animate-spin': isExtractingAi }" />
            <span class="truncate">{{ isExtractingAi ? 'AI Membaca...' : 'Ekstrak AI ✨' }}</span>
          </button>
        </div>

        <div class="flex items-center space-x-2">
          <button
            type="button"
            @click="handleOpenManual"
            class="flex-1 flex items-center justify-center space-x-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            <Edit3 class="h-3.5 w-3.5" />
            <span>{{ showManualForm ? 'Tutup Formulir Rincian' : 'Input Lowongan Manual' }}</span>
          </button>

          <button
            v-if="showManualForm || editableJob.title || editableJob.description"
            type="button"
            @click="handleReset"
            class="flex items-center justify-center space-x-1 rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 transition-colors"
            title="Kosongkan formulir lowongan"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Review & Edit Job Details Card -->
    <div
      v-if="showManualForm"
      class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-3"
    >
      <!-- Form Header: Platform Badge, URL Link, and Reset Action -->
      <div class="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-700/60">
        <div class="flex items-center space-x-2">
          <span
            class="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            :class="getPlatformBadge(editableJob.platform).bg"
          >
            {{ getPlatformBadge(editableJob.platform).label }}
          </span>

          <span
            v-if="editableJob.extractionMethod === 'ai'"
            class="inline-flex items-center space-x-1 rounded-md bg-purple-100 px-1.5 py-0.5 text-[9px] font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300"
          >
            <Sparkles class="h-2.5 w-2.5" />
            <span>AI Extracted</span>
          </span>
          <span
            v-else-if="editableJob.extractionMethod === 'dom'"
            class="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            DOM Scraper
          </span>

          <a
            v-if="editableJob.url && editableJob.url.startsWith('http')"
            :href="editableJob.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[11px] text-gray-400 hover:text-indigo-600 flex items-center space-x-1"
            title="Buka URL asli lowongan"
          >
            <ExternalLink class="h-3 w-3" />
            <span class="truncate max-w-[110px] hidden sm:inline">Buka Sumber</span>
          </a>
        </div>

        <button
          type="button"
          @click="handleReset"
          class="flex items-center space-x-1 text-[11px] text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Kosongkan data lowongan"
        >
          <Trash2 class="h-3 w-3" />
          <span>Hapus</span>
        </button>
      </div>

      <!-- Editable Inputs -->
      <div class="space-y-2.5 text-xs">
        <div>
          <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center space-x-1">
            <Briefcase class="h-3 w-3 text-indigo-500" />
            <span>Posisi / Job Title <span class="text-red-500">*</span></span>
          </label>
          <input
            v-model="editableJob.title"
            type="text"
            placeholder="Contoh: Senior Frontend Engineer"
            class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center space-x-1">
            <Building class="h-3 w-3 text-indigo-500" />
            <span>Nama Perusahaan <span class="text-red-500">*</span></span>
          </label>
          <input
            v-model="editableJob.company"
            type="text"
            placeholder="Contoh: PT Teknologi Bangsa"
            class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center space-x-1">
              <MapPin class="h-3 w-3 text-indigo-500" />
              <span>Lokasi</span>
            </label>
            <input
              v-model="editableJob.location"
              type="text"
              placeholder="Contoh: Jakarta / Remote"
              class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model Kerja
            </label>
            <select
              v-model="editableJob.workplaceType"
              class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
              <option value="Unspecified">Belum Ditentukan</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
            <span class="flex items-center space-x-1">
              <Mail class="h-3 w-3 text-indigo-500" />
              <span>Email Recruiter / Kontak Lamaran</span>
            </span>
            <span
              v-if="editableJob.recruiterEmail"
              class="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            >
              Terdeteksi
            </span>
          </label>
          <input
            v-model="editableJob.recruiterEmail"
            type="email"
            placeholder="recruitment@perusahaan.com (opsional)"
            class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
              Deskripsi Pekerjaan
            </label>
            <button
              v-if="editableJob.description.includes('tidak ditemukan') || !editableJob.description.trim()"
              type="button"
              @click="handleExtractAi"
              :disabled="isExtracting"
              class="inline-flex items-center space-x-1 text-[11px] font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
              title="Ekstrak ulang deskripsi menggunakan Gemini AI"
            >
              <Sparkles class="h-3 w-3" />
              <span>Ekstrak Cerdas AI ✨</span>
            </button>
          </div>
          <textarea
            v-model="editableJob.description"
            rows="4"
            placeholder="Salin atau edit deskripsi lowongan di sini..."
            class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          ></textarea>
        </div>

        <div>
          <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
            Persyaratan & Kualifikasi (Requirements)
          </label>
          <textarea
            v-model="editableJob.requirements"
            rows="3"
            placeholder="Kualifikasi yang disyaratkan (opsional jika sudah tergabung di deskripsi)..."
            class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          ></textarea>
        </div>

        <!-- Form Actions -->
        <div class="pt-1 flex items-center space-x-2">
          <button
            type="button"
            @click="handleSave"
            class="flex flex-1 items-center justify-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Save class="h-3.5 w-3.5" />
            <span>{{ isSaved ? 'Tersimpan!' : 'Simpan Perubahan' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Active Analysis Result Card -->
    <AnalysisResultCard
      v-if="currentAnalysis"
      :analysis="currentAnalysis"
      :is-analyzing="isAnalyzing"
      @reanalyze="handleRunAnalysis()"
      @clear="handleClearAnalysis"
    />

    <!-- AI Analysis Trigger Card (When no active analysis) -->
    <div
      v-else
      class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-3"
    >
      <div class="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
        <Sparkles class="h-4 w-4" />
        <h3 class="text-xs font-semibold uppercase tracking-wider">
          Analisis Relevansi & Gap Pengalaman AI
        </h3>
      </div>

      <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        Evaluasi kecocokan kualifikasi CV Anda terhadap lowongan ini menggunakan Google Gemini AI dengan prinsip <strong>Zero-Hallucination</strong>.
      </p>

      <!-- Cooldown / Rate Limit Banner -->
      <div
        v-if="cooldownTimer > 0"
        class="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 space-y-1"
      >
        <div class="flex items-center space-x-1.5 font-semibold text-amber-800 dark:text-amber-300">
          <AlertCircle class="h-4 w-4 shrink-0 text-amber-600" />
          <span>Jeda Cooldown Rate Limit (429) Aktif: {{ cooldownTimer }} detik</span>
        </div>
        <p class="text-[11px] leading-relaxed">
          Google Gemini membatasi 15 permintaan/menit pada paket free-tier (reset otomatis setiap hari). Anda dapat menunggu jeda di atas atau langsung menggunakan <strong>Mode Demo</strong> di bawah.
        </p>
      </div>

      <!-- Analysis Error Banner -->
      <div
        v-if="analysisError && cooldownTimer === 0"
        class="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 flex items-start space-x-2"
      >
        <AlertCircle class="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
        <div class="text-[11px] leading-relaxed">
          <p class="font-semibold">Gagal Menjalankan Analisis</p>
          <p>{{ analysisError }}</p>
        </div>
      </div>

      <!-- Prerequisite Status Checklist -->
      <div class="rounded-lg bg-gray-50 dark:bg-gray-750 p-2.5 space-y-2 text-[11px]">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-1.5">
            <CheckCircle v-if="cvProfile" class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <AlertCircle v-else class="h-3.5 w-3.5 text-amber-500" />
            <span class="text-gray-700 dark:text-gray-300">
              Profil CV: {{ cvProfile ? cvProfile.fileName || 'Tersedia' : 'Belum Dipilih' }}
            </span>
          </div>
          <button
            v-if="!cvProfile"
            type="button"
            @click="setActiveTab('cv')"
            class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Pilih CV
          </button>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-1.5">
            <CheckCircle v-if="editableJob.title" class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <AlertCircle v-else class="h-3.5 w-3.5 text-amber-500" />
            <span class="text-gray-700 dark:text-gray-300">
              Lowongan: {{ editableJob.title ? editableJob.title : 'Belum Ada' }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-1.5">
            <CheckCircle v-if="settings.geminiApiKey" class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <AlertCircle v-else class="h-3.5 w-3.5 text-gray-400" />
            <span class="text-gray-700 dark:text-gray-300">
              Gemini API Key: {{ settings.geminiApiKey ? 'Terkonfigurasi' : 'Belum Diisi' }}
            </span>
          </div>
          <button
            v-if="!settings.geminiApiKey"
            type="button"
            @click="setActiveTab('settings')"
            class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Isi Key
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2 pt-1">
        <button
          type="button"
          @click="handleRunAnalysis(false)"
          :disabled="isAnalyzing || !cvProfile || (!editableJob.title && !editableJob.description) || cooldownTimer > 0"
          class="flex w-full items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isAnalyzing }" />
          <span>{{ isAnalyzing ? 'Sedang Menganalisis dengan Gemini AI...' : 'Mulai Analisis Kecocokan AI' }}</span>
        </button>

        <!-- Demo Mode Alternative Button -->
        <button
          v-if="!settings.geminiApiKey || cooldownTimer > 0"
          type="button"
          @click="handleRunAnalysis(true)"
          :disabled="isAnalyzing || !cvProfile || (!editableJob.title && !editableJob.description)"
          class="flex w-full items-center justify-center space-x-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-300 disabled:opacity-50 transition-colors"
        >
          <Sparkles class="h-3.5 w-3.5 text-purple-600" />
          <span>Coba Analisis Mode Demo (Simulasi)</span>
        </button>
      </div>
    </div>
  </div>
</template>
