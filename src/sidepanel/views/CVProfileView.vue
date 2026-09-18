<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  FileText,
  Cloud,
  Trash2,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  RefreshCw,
  Search,
  X,
  Layers,
} from 'lucide-vue-next'
import {
  useCVProfile,
  useGoogleAuth,
  useDriveCV,
  useAppSettings,
} from '@/composables/useStorageState'
import type { CVProfile, GoogleDriveFileItem } from '@/types/cv'

const { cvProfile, saveCVProfile, clearCVProfile } = useCVProfile()
const { settings } = useAppSettings()
const { login, isConnecting } = useGoogleAuth()
const {
  driveFiles,
  isListing,
  isDownloading,
  isSyncing,
  loadDriveFiles,
  selectAndSaveDriveCV,
  syncDriveCV,
} = useDriveCV()

// UI state
const showDrivePickerModal = ref(false)
const showManualModal = ref(false)
const driveSearchQuery = ref('')
const selectedFileId = ref<string | null>(null)
const statusNotice = ref<{ text: string; type: 'success' | 'info' | 'error' } | null>(null)

// Manual form state
const manualCandidateName = ref('Ilham Fatahillah')
const manualHeadline = ref('Senior Software Engineer (Frontend / Vue / TypeScript)')
const manualRawText = ref(
`ILHAM FATAHILLAH
Senior Frontend Engineer (Vue 3, TypeScript, Tailwind CSS)
ilham@example.com | Jakarta, Indonesia

Pengalaman Kerja:
- Senior Frontend Engineer di Tech Company (2022 - Sekarang)
  Memimpin arsitektur web modern, ekstensi peramban Chrome, dan micro-frontends.
- Frontend Developer di Software House (2020 - 2022)
  Mengembangkan SPA Vue 3 dan integrasi REST APIs.

Keahlian:
Vue 3, TypeScript, Tailwind CSS, Vite, Vitest, Git, CI/CD, Docker.`
)

const isGoogleConnected = computed(
  () => settings.value.googleAuthStatus === 'connected'
)

const setNotice = (text: string, type: 'success' | 'info' | 'error' = 'success', duration = 4000) => {
  statusNotice.value = { text, type }
  setTimeout(() => {
    if (statusNotice.value?.text === text) {
      statusNotice.value = null
    }
  }, duration)
}

// Open Google Drive Picker Modal
const handleOpenDrivePicker = async () => {
  if (!isGoogleConnected.value) {
    try {
      await login()
    } catch {
      setNotice('Gagal menghubungkan Google Workspace. Silakan periksa tab Pengaturan.', 'error')
      return
    }
  }

  showDrivePickerModal.value = true
  try {
    await loadDriveFiles(driveSearchQuery.value)
  } catch (err: any) {
    setNotice(err.message || 'Gagal memuat berkas Google Drive.', 'error')
  }
}

// Search files in Drive
const handleSearchDrive = async () => {
  try {
    await loadDriveFiles(driveSearchQuery.value)
  } catch (err: any) {
    setNotice(err.message || 'Gagal mencari berkas.', 'error')
  }
}

// Pick and parse file from Google Drive
const handleSelectDriveFile = async (file: GoogleDriveFileItem) => {
  selectedFileId.value = file.id
  try {
    await selectAndSaveDriveCV(file)
    showDrivePickerModal.value = false
    setNotice(`CV "${file.name}" berhasil diunduh dan diproses ke memori lokal!`, 'success')
  } catch (err: any) {
    setNotice(err.message || 'Gagal mengimpor CV dari Google Drive.', 'error')
  } finally {
    selectedFileId.value = null
  }
}

// Sync existing CV with Google Drive
const handleSyncCurrentCV = async () => {
  if (!cvProfile.value || cvProfile.value.source !== 'google_drive') return

  if (!isGoogleConnected.value) {
    try {
      await login()
    } catch {
      setNotice('Google Workspace belum terhubung.', 'error')
      return
    }
  }

  try {
    const result = await syncDriveCV()
    if (result.status === 'updated') {
      setNotice('CV berhasil diperbarui dengan versi terbaru dari Google Drive!', 'success')
    } else if (result.status === 'up_to_date') {
      setNotice('CV di memori lokal sudah menggunakan versi terbaru (tidak ada perubahan di Drive).', 'info')
    } else {
      setNotice(result.message, result.status === 'error' ? 'error' : 'info')
    }
  } catch (err: any) {
    setNotice(err.message || 'Gagal menyinkronkan CV.', 'error')
  }
}

// Save manual CV
const handleSaveManualCV = async () => {
  if (!manualRawText.value.trim()) return

  const newProfile: CVProfile = {
    id: `cv_${Date.now()}`,
    fileName: `${manualCandidateName.value.replace(/\s+/g, '_')}_CV.txt`,
    source: 'manual_paste',
    parsedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    rawText: manualRawText.value,
    headline: manualHeadline.value,
    summary: `Profil profesional ${manualCandidateName.value} - ${manualHeadline.value}`,
    skills: [
      { category: 'Frontend & UI', items: ['Vue 3', 'TypeScript', 'Tailwind CSS', 'Vite'] },
      { category: 'DevOps & Tooling', items: ['Git', 'CI/CD', 'Vitest'] },
    ],
    experiences: [
      {
        id: 'exp_manual_1',
        role: manualHeadline.value.split('/')[0]?.trim() || 'Software Engineer',
        company: 'Perusahaan Terakhir',
        startDate: '2022',
        endDate: 'Sekarang',
        description: 'Pengalaman kerja profesional yang dimasukkan secara manual.',
      },
    ],
    educations: [
      {
        id: 'edu_manual_1',
        institution: 'Universitas Terkemuka',
        degree: 'Sarjana Komputer',
        graduationYear: '2020',
      },
    ],
  }

  await saveCVProfile(newProfile)
  showManualModal.value = false
  setNotice('CV manual berhasil disimpan ke penyimpanan lokal ekstensi!', 'success')
}

// Clear CV from storage
const handleClear = async () => {
  if (confirm('Apakah Anda yakin ingin menghapus data CV dari penyimpanan lokal?')) {
    await clearCVProfile()
    setNotice('Data CV telah dihapus dari memori lokal.', 'info')
  }
}

const formatFileSize = (bytes?: number | string) => {
  if (!bytes) return ''
  const b = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
  if (isNaN(b)) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="space-y-4 p-4">
    <!-- Feedback Notice Banner -->
    <div
      v-if="statusNotice"
      class="flex items-center space-x-2 rounded-xl p-3 text-xs border transition-all"
      :class="{
        'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300':
          statusNotice.type === 'success',
        'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300':
          statusNotice.type === 'info',
        'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300':
          statusNotice.type === 'error',
      }"
    >
      <CheckCircle
        v-if="statusNotice.type === 'success'"
        class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
      />
      <AlertCircle
        v-else-if="statusNotice.type === 'error'"
        class="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
      />
      <Cloud
        v-else
        class="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
      />
      <span class="flex-1">{{ statusNotice.text }}</span>
    </div>

    <!-- Google Workspace Connection Reminder (if not connected) -->
    <div
      v-if="!isGoogleConnected"
      class="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300 flex items-center justify-between"
    >
      <div class="flex items-center space-x-2">
        <Cloud class="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span class="text-[11px]">Hubungkan Google Drive untuk impor CV otomatis</span>
      </div>
      <button
        type="button"
        @click="login()"
        :disabled="isConnecting"
        class="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {{ isConnecting ? 'Menghubungkan...' : 'Hubungkan' }}
      </button>
    </div>

    <!-- Active CV Status Card -->
    <div
      v-if="cvProfile"
      class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-3"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-2.5">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-lg"
            :class="cvProfile.source === 'google_drive'
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'"
          >
            <Cloud v-if="cvProfile.source === 'google_drive'" class="h-5 w-5" />
            <FileText v-else class="h-5 w-5" />
          </div>
          <div>
            <h3 class="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
              {{ cvProfile.fileName }}
            </h3>
            <div class="flex items-center space-x-1.5 text-[10px] text-gray-500 dark:text-gray-400">
              <span
                class="inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-medium"
                :class="cvProfile.source === 'google_drive'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'"
              >
                {{ cvProfile.source === 'google_drive' ? 'Google Drive' : 'Input Manual' }}
              </span>
              <span>•</span>
              <span>{{ new Date(cvProfile.parsedAt).toLocaleDateString('id-ID') }}</span>
              <span v-if="cvProfile.fileSize">({{ formatFileSize(cvProfile.fileSize) }})</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          @click="handleClear"
          class="rounded p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          title="Hapus CV dari memori"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>

      <!-- Headline -->
      <div v-if="cvProfile.headline" class="text-xs text-gray-800 dark:text-gray-200 font-medium">
        {{ cvProfile.headline }}
      </div>

      <!-- Skills Badges -->
      <div v-if="cvProfile.skills && cvProfile.skills.length" class="space-y-1.5 pt-1">
        <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center space-x-1">
          <Layers class="h-3 w-3 text-indigo-500" />
          <span>Keahlian Terdeteksi ({{ cvProfile.skills.reduce((acc, cat) => acc + cat.items.length, 0) }}):</span>
        </div>
        <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          <template v-for="cat in cvProfile.skills" :key="cat.category">
            <span
              v-for="item in cat.items"
              :key="item"
              class="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
              :title="cat.category"
            >
              {{ item }}
            </span>
          </template>
        </div>
      </div>

      <!-- Sync & Action Controls on Active CV -->
      <div class="flex items-center space-x-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
        <button
          v-if="cvProfile.source === 'google_drive'"
          type="button"
          @click="handleSyncCurrentCV"
          :disabled="isSyncing"
          class="flex flex-1 items-center justify-center space-x-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isSyncing }" />
          <span>{{ isSyncing ? 'Memeriksa...' : 'Periksa & Sync CV' }}</span>
        </button>

        <button
          type="button"
          @click="handleOpenDrivePicker"
          class="flex items-center justify-center space-x-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750 transition-colors"
          title="Pilih berkas CV lain dari Google Drive"
        >
          <span>Ganti CV</span>
        </button>
      </div>

      <!-- Raw Text Snippet Preview -->
      <div class="pt-1">
        <details class="cursor-pointer text-xs text-gray-500 dark:text-gray-400">
          <summary class="font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
            Lihat Ringkasan Teks CV ({{ cvProfile.rawText.length }} karakter)
          </summary>
          <pre class="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-2.5 text-[11px] font-mono text-gray-700 dark:bg-gray-900 dark:text-gray-300 max-h-40 overflow-y-auto">{{ cvProfile.rawText }}</pre>
        </details>
      </div>
    </div>

    <!-- Empty CV State -->
    <div
      v-else
      class="rounded-xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700"
    >
      <FileText class="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
      <h3 class="mt-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
        Belum Ada CV yang Tersimpan
      </h3>
      <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
        Pilih berkas CV dari Google Drive (PDF atau Google Docs) atau masukkan data secara manual untuk memulai.
      </p>
    </div>

    <!-- Primary Action Buttons -->
    <div class="space-y-2">
      <button
        type="button"
        @click="handleOpenDrivePicker"
        :disabled="isDownloading"
        class="flex w-full items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        <Cloud class="h-4 w-4" />
        <span>Pilih CV dari Google Drive</span>
      </button>

      <button
        type="button"
        @click="showManualModal = !showManualModal"
        class="flex w-full items-center justify-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 transition-colors"
      >
        <PlusCircle class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <span>{{ showManualModal ? 'Tutup Form Manual' : 'Input / Paste CV Manual' }}</span>
      </button>
    </div>

    <!-- Google Drive File Selector Modal -->
    <div
      v-if="showDrivePickerModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh]">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-gray-100 p-3.5 dark:border-gray-800">
          <div class="flex items-center space-x-2">
            <Cloud class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 class="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Pilih CV dari Google Drive
            </h3>
          </div>
          <button
            type="button"
            @click="showDrivePickerModal = false"
            class="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Search Bar -->
        <div class="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50">
          <div class="relative">
            <input
              v-model="driveSearchQuery"
              @keydown.enter="handleSearchDrive"
              type="text"
              placeholder="Cari berkas (contoh: CV, Resume, Nama)..."
              class="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <Search class="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
          </div>
        </div>

        <!-- Drive Files List -->
        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          <div v-if="isListing" class="flex flex-col items-center justify-center py-8 text-xs text-gray-500 space-y-2">
            <RefreshCw class="h-5 w-5 animate-spin text-indigo-600" />
            <span>Memuat berkas dari Google Drive...</span>
          </div>

          <div
            v-else-if="driveFiles.length === 0"
            class="py-8 text-center text-xs text-gray-500 dark:text-gray-400"
          >
            Tidak ada dokumen PDF atau Google Docs ditemukan di Google Drive Anda.
          </div>

          <div
            v-else
            v-for="file in driveFiles"
            :key="file.id"
            class="group flex items-center justify-between rounded-xl border border-gray-200 p-2.5 hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-gray-800 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
            @click="handleSelectDriveFile(file)"
          >
            <div class="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                :class="file.mimeType === 'application/pdf'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'"
              >
                {{ file.mimeType === 'application/pdf' ? 'PDF' : 'DOC' }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                  {{ file.name }}
                </p>
                <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {{ file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('id-ID') : '' }}
                  <span v-if="file.size">• {{ formatFileSize(file.size) }}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              :disabled="selectedFileId === file.id || isDownloading"
              class="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <span v-if="selectedFileId === file.id">Memproses...</span>
              <span v-else>Pilih</span>
            </button>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="border-t border-gray-100 p-2.5 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50 flex justify-end">
          <button
            type="button"
            @click="showDrivePickerModal = false"
            class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>

    <!-- Manual Input Form Section -->
    <div
      v-if="showManualModal"
      class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-3"
    >
      <h4 class="text-xs font-semibold text-gray-900 dark:text-gray-100">
        Form Input CV Manual
      </h4>

      <div>
        <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nama Lengkap
        </label>
        <input
          v-model="manualCandidateName"
          type="text"
          class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
          Headline / Posisi Saat Ini
        </label>
        <input
          v-model="manualHeadline"
          type="text"
          class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
          Isi Ringkasan Pengalaman & Keahlian (Teks CV)
        </label>
        <textarea
          v-model="manualRawText"
          rows="6"
          placeholder="Tempel teks CV lengkap Anda di sini..."
          class="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 font-mono text-[11px]"
        ></textarea>
      </div>

      <button
        type="button"
        @click="handleSaveManualCV"
        class="flex w-full items-center justify-center space-x-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
      >
        <CheckCircle class="h-3.5 w-3.5" />
        <span>Simpan CV ke Memori Lokal</span>
      </button>
    </div>
  </div>
</template>
