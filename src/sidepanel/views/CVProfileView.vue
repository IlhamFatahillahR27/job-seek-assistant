<script setup lang="ts">
import { ref } from 'vue'
import {
  FileText,
  Cloud,
  Trash2,
  CheckCircle,
  PlusCircle,
} from 'lucide-vue-next'
import { useCVProfile } from '@/composables/useStorageState'
import type { CVProfile } from '@/types/cv'

const { cvProfile, saveCVProfile, clearCVProfile } = useCVProfile()

const isSyncing = ref(false)
const showManualModal = ref(false)
const manualCandidateName = ref('Ilham Fatahillah')
const manualHeadline = ref('Senior Software Engineer (Frontend / Vue / TypeScript)')
const manualRawText = ref(
`Pengalaman Kerja:
- Senior Frontend Engineer di Global Tech (2022 - Sekarang)
  Memimpin pengembangan platform internal dengan Vue 3, TypeScript, dan Tailwind CSS.
- Frontend Engineer di Startup Inc (2020 - 2022)
  Mengembangkan micro-frontend dashboard dan integrasi REST & GraphQL APIs.

Keahlian Utama:
Vue 3, TypeScript, Tailwind CSS, Vite, Jest, Git, CI/CD.`
)
const successNotice = ref<string | null>(null)

const handleSaveManualCV = async () => {
  if (!manualRawText.value.trim()) return

  const newProfile: CVProfile = {
    id: `cv_${Date.now()}`,
    fileName: `${manualCandidateName.value.replace(/\s+/g, '_')}_CV.pdf`,
    source: 'manual_paste',
    parsedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    rawText: manualRawText.value,
    headline: manualHeadline.value,
    summary: `Profil profesional ${manualCandidateName.value} - ${manualHeadline.value}`,
    skills: [
      { category: 'Frontend', items: ['Vue 3', 'TypeScript', 'Tailwind CSS', 'Vite'] },
      { category: 'Tools & DevOps', items: ['Git', 'CI/CD', 'Vitest'] },
    ],
    experiences: [
      {
        role: 'Senior Frontend Engineer',
        company: 'Global Tech',
        startDate: '2022',
        endDate: 'Present',
        description: 'Memimpin pengembangan platform internal dengan Vue 3 dan TypeScript.',
      },
    ],
    educations: [
      {
        institution: 'Universitas Terkemuka',
        degree: 'Sarjana Komputer',
        graduationYear: '2020',
      },
    ],
  }

  await saveCVProfile(newProfile)
  showManualModal.value = false
  successNotice.value = 'CV berhasil disimpan ke penyimpanan lokal ekstensi!'
  setTimeout(() => (successNotice.value = null), 4000)
}

const handleSyncGoogleDrive = async () => {
  isSyncing.value = true
  try {
    // Simulated placeholder for Milestone 2
    await new Promise((resolve) => setTimeout(resolve, 1000))
    successNotice.value = 'Fitur integrasi Google Drive API akan aktif di Milestone 2.'
    setTimeout(() => (successNotice.value = null), 4000)
  } finally {
    isSyncing.value = false
  }
}

const handleClear = async () => {
  if (confirm('Apakah Anda yakin ingin menghapus data CV dari penyimpanan lokal?')) {
    await clearCVProfile()
    successNotice.value = 'Data CV telah dihapus.'
    setTimeout(() => (successNotice.value = null), 3000)
  }
}
</script>

<template>
  <div class="space-y-4 p-4">
    <!-- Feedback Notice -->
    <div
      v-if="successNotice"
      class="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
    >
      <CheckCircle class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>{{ successNotice }}</span>
    </div>

    <!-- Active CV Status Card -->
    <div
      v-if="cvProfile"
      class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-3"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <FileText class="h-4 w-4" />
          </div>
          <div>
            <h3 class="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {{ cvProfile.fileName }}
            </h3>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">
              Sumber: {{ cvProfile.source === 'google_drive' ? 'Google Drive' : 'Input Manual' }} •
              {{ new Date(cvProfile.parsedAt).toLocaleDateString('id-ID') }}
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="handleClear"
          class="rounded p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          title="Hapus CV"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>

      <!-- Headline & Skills Tag Preview -->
      <div v-if="cvProfile.headline" class="text-xs text-gray-700 dark:text-gray-300 font-medium">
        {{ cvProfile.headline }}
      </div>

      <div v-if="cvProfile.skills && cvProfile.skills.length" class="space-y-1.5 pt-1">
        <div class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Keahlian Terdeteksi:
        </div>
        <div class="flex flex-wrap gap-1.5">
          <template v-for="cat in cvProfile.skills" :key="cat.category">
            <span
              v-for="item in cat.items"
              :key="item"
              class="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
            >
              {{ item }}
            </span>
          </template>
        </div>
      </div>

      <!-- Raw Text Snippet Preview -->
      <div class="pt-2 border-t border-gray-100 dark:border-gray-700/60">
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
        Simpan CV Anda ke penyimpanan lokal ekstensi untuk memulai analisis kecocokan lowongan otomatis.
      </p>
    </div>

    <!-- Action Buttons -->
    <div class="space-y-2">
      <button
        type="button"
        @click="handleSyncGoogleDrive"
        :disabled="isSyncing"
        class="flex w-full items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        <Cloud class="h-4 w-4" :class="{ 'animate-spin': isSyncing }" />
        <span>{{ isSyncing ? 'Menghubungkan...' : 'Sync CV dari Google Drive (M2)' }}</span>
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
          class="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
