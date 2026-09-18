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
import { useAppSettings, useCVProfile } from '@/composables/useStorageState'
import { useJobExtractor } from '@/composables/useJobExtractor'
import type { JobDetails } from '@/types/job'

const { settings } = useAppSettings()
const { cvProfile } = useCVProfile()
const {
  currentJob,
  isExtracting,
  extractionError,
  successMessage,
  extractFromActiveTab,
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
    await extractFromActiveTab()
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
  editableJob.value = createEmptyJob()
  showManualForm.value = false
  isSaved.value = false
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
        Buka halaman detail lowongan (LinkedIn, Glints, Jobstreet, Indeed, atau situs karir perusahaan) dan klik tombol di bawah.
      </p>

      <div class="mt-3 flex flex-col gap-2">
        <button
          type="button"
          @click="handleExtract"
          :disabled="isExtracting"
          class="flex w-full items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isExtracting }" />
          <span>{{ isExtracting ? 'Mengekstrak Halaman Aktif...' : 'Ekstrak Halaman Lowongan Ini' }}</span>
        </button>

        <button
          type="button"
          @click="handleOpenManual"
          class="flex items-center justify-center space-x-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          <Edit3 class="h-3.5 w-3.5" />
          <span>{{ showManualForm ? 'Tutup Formulir Rincian' : 'Input Lowongan Manual' }}</span>
        </button>
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
          <a
            v-if="editableJob.url && editableJob.url.startsWith('http')"
            :href="editableJob.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[11px] text-gray-400 hover:text-indigo-600 flex items-center space-x-1"
            title="Buka URL asli lowongan"
          >
            <ExternalLink class="h-3 w-3" />
            <span class="truncate max-w-[130px] hidden sm:inline">Buka Sumber</span>
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
          <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deskripsi Pekerjaan
          </label>
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

    <!-- Milestone 4 Bridge CTA Card -->
    <div class="rounded-xl border border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
      <Sparkles class="mx-auto h-6 w-6 text-indigo-500 dark:text-indigo-400" />
      <h4 class="mt-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
        Analisis Relevansi & Gap Pengalaman
      </h4>
      <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
        {{ editableJob.title ? `Lowongan "${editableJob.title}" siap diproses.` : 'Ekstrak atau isi lowongan terlebih dahulu.' }}
        Fitur evaluasi kecocokan AI (0-100%), skill gaps, dan tips interview akan aktif pada <strong>Milestone 4</strong>.
      </p>
      <button
        type="button"
        disabled
        class="mt-3 inline-flex items-center justify-center space-x-1.5 rounded-lg bg-gray-100 px-3.5 py-1.5 text-[11px] font-medium text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500"
      >
        <Sparkles class="h-3.5 w-3.5" />
        <span>Mulai Analisis AI (Milestone 4)</span>
      </button>
    </div>
  </div>
</template>
