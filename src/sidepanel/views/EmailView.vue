<script setup lang="ts">
import { ref } from 'vue'
import { Mail, Send, FileArchive, Sparkles } from 'lucide-vue-next'
import type { EmailTone } from '@/types/email'

const activeTone = ref<EmailTone>('formal')
const recipientEmail = ref('recruiter@company.com')
const subject = ref('Lamaran Posisi Senior Frontend Engineer - [Nama Anda]')
const body = ref(
`Yth. Tim Rekrutmen TechCorp Global,

Perkenalkan, saya adalah Senior Frontend Engineer dengan rekam jejak dalam pengembangan aplikasi web performa tinggi menggunakan Vue 3 dan TypeScript. 

Berdasarkan kualifikasi yang dicantumkan untuk posisi Senior Frontend Engineer, saya yakin pengalaman saya dalam arsitektur komponen modular dan integrasi API dapat memberikan kontribusi langsung bagi keberhasilan produk TechCorp.

Terlampir saya sertakan CV lengkap saya untuk bahan pertimbangan lebih lanjut. Saya sangat terbuka untuk berdiskusi lebih mendalam terkait kesempatan ini.

Hormat saya,
[Nama Anda]`
)
const includeAttachment = ref(true)
const statusMessage = ref<string | null>(null)

const tones: { key: EmailTone; label: string; desc: string }[] = [
  { key: 'formal', label: 'Formal', desc: 'Baku & Korporat' },
  { key: 'project', label: 'Impact', desc: 'Fokus Proyek & Metrik' },
  { key: 'concise', label: 'Concise', desc: 'Ringkas & Langsung' },
]

const handleToneChange = (tone: EmailTone) => {
  activeTone.value = tone
  if (tone === 'concise') {
    subject.value = 'Aplikasi Senior Frontend Engineer: [Nama Anda]'
    body.value = `Halo Tim Rekrutmen,

Tertarik melamar posisi Senior Frontend Engineer di TechCorp Global. Saya berpengalaman 4+ tahun dalam Vue 3, TypeScript, dan arsitektur SPA skala besar.

Portofolio & CV terlampir. Siap berdiskusi lebih lanjut bila profil saya sesuai kebutuhan tim.

Terima kasih!`
  } else if (tone === 'project') {
    subject.value = 'Senior Frontend Engineer Application: Delivering Web Excellence'
    body.value = `Yth. Hiring Team TechCorp Global,

Saya mengagumi produk digital yang dikembangkan oleh TechCorp Global. Melalui email ini, saya ingin mengajukan diri untuk posisi Senior Frontend Engineer.

Pada proyek sebelumnya, saya memimpin refaktor arsitektur frontend yang meningkatkan Web Vitals score sebesar 45% dan menurunkan bundle size hingga 30%. Keahlian ini sangat relevan dengan kebutuhan sistem di TechCorp.

CV lengkap telah terlampir. Terima kasih atas waktu dan perhatiannya.`
  } else {
    subject.value = 'Lamaran Posisi Senior Frontend Engineer - [Nama Anda]'
    body.value = `Yth. Tim Rekrutmen TechCorp Global,

Perkenalkan, saya adalah Senior Frontend Engineer dengan rekam jejak dalam pengembangan aplikasi web performa tinggi menggunakan Vue 3 dan TypeScript.

Berdasarkan kualifikasi yang dicantumkan untuk posisi Senior Frontend Engineer, saya yakin pengalaman saya dalam arsitektur komponen modular dan integrasi API dapat memberikan kontribusi langsung bagi keberhasilan produk TechCorp.

Terlampir saya sertakan CV lengkap saya untuk bahan pertimbangan lebih lanjut.

Hormat saya,
[Nama Anda]`
  }
}

const handleSaveDraft = () => {
  statusMessage.value = 'Draf email siap disimpan ke Gmail (Integrasi Gmail API di Milestone 5)'
  setTimeout(() => (statusMessage.value = null), 4000)
}

const handleDirectSend = () => {
  statusMessage.value = 'Pengiriman langsung via Gmail API akan aktif di Milestone 5'
  setTimeout(() => (statusMessage.value = null), 4000)
}
</script>

<template>
  <div class="space-y-4 p-4">
    <!-- Header Tone Selection -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <label class="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-1.5">
          <Sparkles class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Gaya Komunikasi (Tone)</span>
        </label>
        <span class="text-[10px] text-gray-500">Pilih rekomendasi gaya AI</span>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="tone in tones"
          :key="tone.key"
          type="button"
          @click="handleToneChange(tone.key)"
          :class="[
            'flex flex-col items-center rounded-lg border p-2 text-center transition-all',
            activeTone === tone.key
              ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300 ring-1 ring-indigo-500'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
          ]"
        >
          <span class="text-xs font-medium">{{ tone.label }}</span>
          <span class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{{ tone.desc }}</span>
        </button>
      </div>
    </div>

    <!-- Feedback / Status Notification -->
    <div
      v-if="statusMessage"
      class="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 transition-all"
    >
      {{ statusMessage }}
    </div>

    <!-- Email Editor Form -->
    <div class="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-3">
      <div>
        <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
          Penerima (Recruiter Email)
        </label>
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

      <div>
        <label class="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
          Subject Email
        </label>
        <input
          v-model="subject"
          type="text"
          class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-[11px] font-medium text-gray-700 dark:text-gray-300">
            Body Email
          </label>
          <span class="text-[10px] text-gray-400">{{ body.length }} karakter</span>
        </div>
        <textarea
          v-model="body"
          rows="8"
          class="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs leading-relaxed text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        ></textarea>
      </div>

      <!-- Attachment Toggle -->
      <label class="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer pt-1">
        <input
          v-model="includeAttachment"
          type="checkbox"
          class="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
        />
        <span>Lampirkan file PDF CV dari Google Drive</span>
      </label>
    </div>

    <!-- Dispatch Action Buttons -->
    <div class="grid grid-cols-2 gap-2 pt-1">
      <button
        type="button"
        @click="handleSaveDraft"
        class="flex items-center justify-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 transition-colors"
      >
        <FileArchive class="h-3.5 w-3.5 text-gray-500" />
        <span>Simpan ke Draft</span>
      </button>

      <button
        type="button"
        @click="handleDirectSend"
        class="flex items-center justify-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
      >
        <Send class="h-3.5 w-3.5" />
        <span>Kirim Sekarang</span>
      </button>
    </div>
  </div>
</template>
