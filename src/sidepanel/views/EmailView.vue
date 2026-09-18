<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Mail,
  Send,
  FileArchive,
  Sparkles,
  Paperclip,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sliders,
  ChevronRight,
  Briefcase,
} from 'lucide-vue-next'
import { useEmailGenerator } from '@/composables/useEmailGenerator'
import { useNavigation, useCVProfile, useCurrentJob } from '@/composables/useStorageState'
import type { EmailTone, EmailLanguage } from '@/types/email'

const {
  templates,
  activeTone,
  selectedLanguage,
  recipientEmail,
  subject,
  body,
  includeAttachment,
  refinementFeedback,
  changesSummary,
  isGenerating,
  isRefining,
  isDispatching,
  dispatchResult,
  dispatchError,
  generalError,
  currentWarnings,
  selectTone,
  setLanguage,
  generateTemplates,
  refineDraft,
  saveDraft,
  sendDirectly,
} = useEmailGenerator()

const { setActiveTab } = useNavigation()
const { cvProfile } = useCVProfile()
const { currentJob } = useCurrentJob()

const showConfirmModal = ref(false)

const tones: { key: EmailTone; label: string; desc: string }[] = [
  { key: 'formal', label: 'Formal', desc: 'Baku & Korporat' },
  { key: 'impact_focused', label: 'Impact', desc: 'Fokus Proyek & Metrik' },
  { key: 'concise_pitch', label: 'Concise', desc: 'Ringkas & Langsung' },
]

const languages: { key: EmailLanguage; label: string; icon: string }[] = [
  { key: 'id', label: 'Indonesia', icon: '🇮🇩' },
  { key: 'en', label: 'English', icon: '🇬🇧' },
  { key: 'auto', label: 'Auto (Lowongan)', icon: '⚡' },
]

const quickFeedbackChips = [
  { label: '+ Lebih Ramah', text: 'Buat salam pembuka dan penutup lebih ramah dan santai.' },
  { label: '+ Tekankan Metrik', text: 'Tekankan pencapaian angka dan dampak kuantitatif proyek dari CV.' },
  { label: '+ Ringkas Teks', text: 'Persingkat teks email agar lebih padat dan langsung ke poin inti.' },
  { label: '+ Bahasa Inggris', text: 'Terjemahkan seluruh draf email ke dalam Bahasa Inggris profesional.' },
  { label: '+ Bahasa Indonesia', text: 'Ubah draf email ke dalam Bahasa Indonesia baku dan profesional.' },
]

onMounted(async () => {
  // If templates are not yet generated but CV and Job exist, auto-generate initial draft
  if (templates.value.length === 0 && cvProfile.value?.rawText && currentJob.value?.title) {
    try {
      await generateTemplates()
    } catch {
      // Non-fatal on initial mount
    }
  }
})

const handleLanguageChange = async (lang: EmailLanguage) => {
  await setLanguage(lang)
  if (cvProfile.value?.rawText && currentJob.value?.title) {
    await generateTemplates(true)
  }
}

const handleGenerateClick = async () => {
  await generateTemplates(true)
}

const handleQuickChip = (text: string) => {
  refinementFeedback.value = text
}

const handleRefineSubmit = async () => {
  if (!refinementFeedback.value.trim()) return
  await refineDraft()
}

const handleOpenConfirmModal = () => {
  if (!recipientEmail.value.trim() || !subject.value.trim() || !body.value.trim()) {
    return
  }
  showConfirmModal.value = true
}

const handleConfirmSend = async () => {
  try {
    await sendDirectly()
    showConfirmModal.value = false
  } catch {
    // Error is handled in composable state
  }
}

const openGmailDrafts = () => {
  window.open('https://mail.google.com/mail/u/0/#drafts', '_blank')
}
</script>

<template>
  <div class="space-y-3.5 p-3.5 pb-8 text-gray-800 dark:text-gray-100">
    <!-- Prerequisite Warnings if Job or CV is missing -->
    <div
      v-if="!cvProfile?.rawText"
      class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 space-y-1.5"
    >
      <div class="flex items-center space-x-1.5 font-semibold">
        <AlertTriangle class="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>CV Belum Dipilih / Dimuat</span>
      </div>
      <p class="text-[11px] leading-relaxed">
        AI memerlukan data pengalaman CV Anda untuk menyusun email lamaran berbasis fakta tanpa halusinasi.
      </p>
      <button
        type="button"
        @click="setActiveTab('cv')"
        class="inline-flex items-center space-x-1 font-medium text-amber-700 underline hover:text-amber-900 dark:text-amber-400 text-[11px]"
      >
        <span>Buka Tab Profil & CV</span>
        <ChevronRight class="h-3 w-3" />
      </button>
    </div>

    <div
      v-else-if="!currentJob?.title"
      class="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 space-y-1.5"
    >
      <div class="flex items-center space-x-1.5 font-semibold">
        <Briefcase class="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span>Data Lowongan Kerja Masih Kosong</span>
      </div>
      <p class="text-[11px] leading-relaxed">
        Ekstrak informasi pekerjaan aktif terlebih dahulu dari halaman browser atau masukkan secara manual.
      </p>
      <button
        type="button"
        @click="setActiveTab('analysis')"
        class="inline-flex items-center space-x-1 font-medium text-blue-700 underline hover:text-blue-900 dark:text-blue-400 text-[11px]"
      >
        <span>Buka Tab Analisa Lowongan</span>
        <ChevronRight class="h-3 w-3" />
      </button>
    </div>

    <!-- Active Job Context Banner -->
    <div
      v-if="currentJob?.title"
      class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 text-xs dark:border-gray-800 dark:bg-gray-850"
    >
      <div class="min-w-0 pr-2">
        <span class="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Target Lowongan</span>
        <div class="truncate font-medium text-gray-900 dark:text-gray-100">
          {{ currentJob.title }} &bull; {{ currentJob.company || 'Perusahaan' }}
        </div>
      </div>
      <button
        type="button"
        @click="handleGenerateClick"
        :disabled="isGenerating || !cvProfile?.rawText"
        class="inline-flex items-center space-x-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 disabled:opacity-50 transition-colors shrink-0"
      >
        <RefreshCw :class="['h-3 w-3', isGenerating && 'animate-spin']" />
        <span>{{ templates.length > 0 ? 'Regenerate' : 'Generate AI' }}</span>
      </button>
    </div>

    <!-- Language Selection Row -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-1.5">
          <span>Bahasa Email</span>
        </label>
        <span class="text-[10px] text-gray-500">Istilah tech stack tetap dipertahankan</span>
      </div>

      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="lang in languages"
          :key="lang.key"
          type="button"
          @click="handleLanguageChange(lang.key)"
          :class="[
            'flex items-center justify-center space-x-1.5 rounded-lg border py-1.5 px-2 text-xs font-medium transition-all',
            selectedLanguage === lang.key
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300 ring-1 ring-indigo-500'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
          ]"
        >
          <span>{{ lang.icon }}</span>
          <span>{{ lang.label }}</span>
        </button>
      </div>
    </div>

    <!-- Tone Selection Cards -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-1.5">
          <Sparkles class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Gaya Komunikasi (Tone)</span>
        </label>
        <span class="text-[10px] text-gray-500">3 Opsi AI Grounded</span>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="tone in tones"
          :key="tone.key"
          type="button"
          @click="selectTone(tone.key)"
          :class="[
            'flex flex-col items-center rounded-lg border p-2 text-center transition-all',
            activeTone === tone.key
              ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300 ring-1 ring-indigo-500 shadow-xs'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
          ]"
        >
          <span class="text-xs font-semibold">{{ tone.label }}</span>
          <span class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{{ tone.desc }}</span>
        </button>
      </div>
    </div>

    <!-- General Error Banner -->
    <div
      v-if="generalError"
      class="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ generalError }}
    </div>

    <!-- Dispatch Success / Draft Result Notification -->
    <div
      v-if="dispatchResult?.success"
      class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 space-y-2 transition-all"
    >
      <div class="flex items-center space-x-1.5 font-semibold">
        <CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span v-if="dispatchResult.action === 'draft'">Draf Berhasil Disimpan ke Gmail!</span>
        <span v-else>Email Lamaran Berhasil Dikirim Langsung!</span>
      </div>
      <p class="text-[11px]">
        <span v-if="dispatchResult.action === 'draft'">
          Draf pesan sudah siap di akun Gmail Anda untuk ditinjau kapan saja.
        </span>
        <span v-else>
          Pesan telah diteruskan ke recruiter via Gmail API. ID Pesan: {{ dispatchResult.messageId }}
        </span>
      </p>
      <div v-if="dispatchResult.action === 'draft'" class="pt-0.5">
        <button
          type="button"
          @click="openGmailDrafts"
          class="inline-flex items-center space-x-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <span>Buka Folder Drafts di Gmail</span>
          <ExternalLink class="h-3 w-3" />
        </button>
      </div>
    </div>

    <!-- Dispatch Error Banner -->
    <div
      v-if="dispatchError"
      class="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ dispatchError }}
    </div>

    <!-- Hallucination Guardrail Warnings Banner -->
    <div
      v-if="currentWarnings.length > 0"
      class="rounded-lg border border-yellow-300 bg-yellow-50 p-2.5 text-xs text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-300 space-y-1"
    >
      <div class="flex items-center space-x-1.5 font-semibold">
        <AlertTriangle class="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 shrink-0" />
        <span>Peringatan Runtime Guardrail (Anti-Halusinasi)</span>
      </div>
      <ul class="list-disc list-inside text-[11px] space-y-0.5 pl-1">
        <li v-for="(warn, idx) in currentWarnings" :key="idx">{{ warn }}</li>
      </ul>
    </div>

    <!-- Email Editor Card -->
    <div class="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-800 space-y-3">
      <!-- Recruiter Email -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-[11px] font-medium text-gray-700 dark:text-gray-300">
            Email Penerima (Recruiter)
          </label>
          <span v-if="currentJob?.recruiterEmail && recipientEmail === currentJob.recruiterEmail" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            Otomatis terisi dari lowongan
          </span>
        </div>
        <div class="relative">
          <input
            v-model="recipientEmail"
            type="email"
            placeholder="recruiter@company.com"
            class="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <Mail class="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
        </div>
      </div>

      <!-- Subject Line -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-[11px] font-medium text-gray-700 dark:text-gray-300">
            Subject Email
          </label>
          <span class="text-[10px] text-gray-400">{{ subject.length }} karakter</span>
        </div>
        <input
          v-model="subject"
          type="text"
          placeholder="Subjek email lamaran..."
          class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 font-medium"
        />
      </div>

      <!-- Email Body -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-[11px] font-medium text-gray-700 dark:text-gray-300">
            Body Email
          </label>
          <span class="text-[10px] text-gray-400">
            {{ body.split(/\s+/).filter(Boolean).length }} kata &bull; {{ body.length }} karakter
          </span>
        </div>
        <textarea
          v-model="body"
          rows="9"
          placeholder="Tulis atau hasilkan draf email lamaran..."
          class="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs leading-relaxed text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 font-sans resize-y"
        ></textarea>
      </div>

      <!-- Attachment Toggle -->
      <div class="pt-1 border-t border-gray-100 dark:border-gray-700/60">
        <label class="flex items-start space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
          <input
            v-model="includeAttachment"
            type="checkbox"
            class="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
          />
          <div class="space-y-0.5">
            <span class="font-medium flex items-center space-x-1">
              <Paperclip class="h-3 w-3 text-gray-400" />
              <span>Sertakan Lampiran PDF CV dari Google Drive</span>
            </span>
            <p v-if="cvProfile?.fileName" class="text-[10px] text-gray-500 dark:text-gray-400">
              File terpasang: <span class="font-medium text-gray-700 dark:text-gray-300">{{ cvProfile.fileName }}</span>
            </p>
            <p v-else class="text-[10px] text-amber-600 dark:text-amber-400">
              Belum ada file CV Drive yang tersinkronisasi.
            </p>
          </div>
        </label>
      </div>
    </div>

    <!-- Iterative Refinement Section ("Masukan Perubahan") -->
    <div class="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20 space-y-2.5">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold text-indigo-950 dark:text-indigo-200 flex items-center space-x-1.5">
          <Sliders class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Masukan Perubahan (AI Refinement)</span>
        </label>
        <span class="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Iterative Refinement</span>
      </div>

      <!-- Changes applied feedback message -->
      <div
        v-if="changesSummary"
        class="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center space-x-1.5"
      >
        <CheckCircle2 class="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        <span>{{ changesSummary }}</span>
      </div>

      <!-- Quick Feedback Chips -->
      <div class="flex flex-wrap gap-1">
        <button
          v-for="(chip, idx) in quickFeedbackChips"
          :key="idx"
          type="button"
          @click="handleQuickChip(chip.text)"
          class="rounded-md border border-indigo-200/80 bg-white px-2 py-0.5 text-[10px] text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-gray-750 transition-colors"
        >
          {{ chip.label }}
        </button>
      </div>

      <!-- Refinement Prompt Input & Action -->
      <div class="flex items-center space-x-1.5">
        <input
          v-model="refinementFeedback"
          type="text"
          placeholder="Instruksi revisi: Buat penutup lebih antusias, dsb..."
          @keyup.enter="handleRefineSubmit"
          class="flex-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-800 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="button"
          @click="handleRefineSubmit"
          :disabled="isRefining || !refinementFeedback.trim()"
          class="inline-flex items-center space-x-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0 shadow-xs"
        >
          <Sparkles :class="['h-3 w-3', isRefining && 'animate-spin']" />
          <span>{{ isRefining ? 'Memproses...' : 'Revisi AI' }}</span>
        </button>
      </div>
    </div>

    <!-- Dual Dispatch Action Buttons -->
    <div class="grid grid-cols-2 gap-2 pt-1">
      <button
        type="button"
        @click="saveDraft"
        :disabled="isDispatching || !recipientEmail || !subject || !body"
        class="flex items-center justify-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 disabled:opacity-50 transition-colors"
      >
        <FileArchive class="h-3.5 w-3.5 text-gray-500" />
        <span>{{ isDispatching ? 'Menyimpan...' : 'Simpan ke Draft' }}</span>
      </button>

      <button
        type="button"
        @click="handleOpenConfirmModal"
        :disabled="isDispatching || !recipientEmail || !subject || !body"
        class="flex items-center justify-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
      >
        <Send class="h-3.5 w-3.5" />
        <span>Kirim Sekarang</span>
      </button>
    </div>

    <!-- Confirmation Modal for Direct Send -->
    <div
      v-if="showConfirmModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div
        class="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900 space-y-3.5 text-gray-800 dark:text-gray-100"
      >
        <div class="flex items-center space-x-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Send class="h-3.5 w-3.5" />
          </div>
          <h3 class="text-sm font-semibold">Konfirmasi Pengiriman Email</h3>
        </div>

        <div class="rounded-lg border border-gray-100 bg-gray-50/70 p-2.5 text-xs dark:border-gray-800 dark:bg-gray-850 space-y-1.5">
          <div class="flex justify-between">
            <span class="text-gray-500">Penerima:</span>
            <span class="font-medium text-gray-900 dark:text-gray-100">{{ recipientEmail }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Subjek:</span>
            <span class="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{{ subject }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Lampiran CV:</span>
            <span class="font-medium" :class="includeAttachment ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'">
              {{ includeAttachment ? (cvProfile?.fileName || 'PDF CV dari Google Drive') : 'Tidak Dilampirkan' }}
            </span>
          </div>
        </div>

        <div class="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 flex items-start space-x-1.5">
          <AlertTriangle class="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>Email ini akan segera dikirim langsung melalui akun Gmail Anda. Pastikan seluruh isi pesan telah diperiksa.</span>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-1">
          <button
            type="button"
            @click="showConfirmModal = false"
            class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            @click="handleConfirmSend"
            :disabled="isDispatching"
            class="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            <Send :class="['h-3 w-3', isDispatching && 'animate-spin']" />
            <span>{{ isDispatching ? 'Mengirim...' : 'Ya, Kirim Sekarang' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
