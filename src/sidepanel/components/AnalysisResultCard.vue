<script setup lang="ts">
import { computed } from 'vue'
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Trash2,
  Quote,
} from 'lucide-vue-next'
import type { GroundedAnalysisResult } from '@/types/analysis'
import { useNavigation } from '@/composables/useStorageState'

const props = defineProps<{
  analysis: GroundedAnalysisResult
  isAnalyzing?: boolean
}>()

const emit = defineEmits<{
  (e: 'reanalyze'): void
  (e: 'clear'): void
}>()

const { setActiveTab } = useNavigation()

const score = computed(() => props.analysis.score)

const scoreTheme = computed(() => {
  if (score.value >= 75) {
    return {
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800',
      ring: 'text-emerald-500',
      label: 'Kecocokan Tinggi',
    }
  }
  if (score.value >= 50) {
    return {
      text: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800',
      ring: 'text-amber-500',
      label: 'Kecocokan Moderat',
    }
  }
  return {
    text: 'text-rose-700 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    ring: 'text-rose-500',
    label: 'Kecocokan Rendah',
  }
})

const formattedDate = computed(() => {
  if (!props.analysis.analyzedAt) return ''
  try {
    const d = new Date(props.analysis.analyzedAt)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
})

const handleProceedToEmail = () => {
  setActiveTab('email')
}
</script>

<template>
  <div class="space-y-3.5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
    <!-- Top Meta & Badges -->
    <div class="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-700/60">
      <div class="flex items-center space-x-2">
        <span
          class="inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          :class="[scoreTheme.bg, scoreTheme.text]"
        >
          <Sparkles class="h-3 w-3" />
          <span>{{ scoreTheme.label }}</span>
        </span>

        <span
          v-if="analysis.isDemo"
          class="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
        >
          Mode Demo
        </span>

        <span
          v-if="analysis.isGrounded"
          class="hidden sm:inline-flex items-center space-x-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium"
          title="Semua klaim diverifikasi sesuai teks CV"
        >
          <ShieldCheck class="h-3.5 w-3.5" />
          <span>Grounded CV</span>
        </span>
      </div>

      <span v-if="formattedDate" class="text-[10px] text-gray-400">
        Dianalisis {{ formattedDate }}
      </span>
    </div>

    <!-- Score & Executive Summary Card -->
    <div
      class="flex items-center space-x-4 rounded-xl border p-3"
      :class="[scoreTheme.border, scoreTheme.bg]"
    >
      <!-- Circular Score Badge -->
      <div class="flex flex-col items-center justify-center shrink-0">
        <div class="relative flex h-14 w-14 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-inner border border-gray-100 dark:border-gray-700">
          <span class="text-lg font-extrabold" :class="scoreTheme.text">
            {{ score }}%
          </span>
        </div>
        <span class="mt-1 text-[9px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Skor Match
        </span>
      </div>

      <!-- Match Summary Text -->
      <div class="min-w-0 flex-1">
        <h4 class="text-xs font-bold text-gray-900 dark:text-gray-100">
          Evaluasi Kecocokan
        </h4>
        <p class="mt-1 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300">
          {{ analysis.summary }}
        </p>
      </div>
    </div>

    <!-- Hallucination / Guardrail Warnings Banner (if any detected) -->
    <div
      v-if="analysis.hallucinationWarnings && analysis.hallucinationWarnings.length > 0"
      class="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 space-y-1"
    >
      <div class="flex items-center space-x-1.5 font-semibold text-amber-800 dark:text-amber-300">
        <AlertTriangle class="h-3.5 w-3.5 shrink-0" />
        <span>Peringatan Grounding AI</span>
      </div>
      <ul class="list-disc pl-4 text-[10px] space-y-0.5">
        <li v-for="(warn, idx) in analysis.hallucinationWarnings" :key="idx">
          {{ warn }}
        </li>
      </ul>
    </div>

    <!-- Matched Skills Section -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="flex items-center space-x-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
          <CheckCircle2 class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Keahlian Cocok (Matched Skills)</span>
        </h4>
        <span class="text-[10px] font-medium text-gray-400">
          {{ analysis.matchedSkills?.length || 0 }} keahlian
        </span>
      </div>

      <div class="space-y-2">
        <div
          v-for="(match, idx) in analysis.matchedSkills"
          :key="idx"
          class="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/20"
        >
          <div class="flex items-center justify-between">
            <span class="font-semibold text-emerald-900 dark:text-emerald-300">
              {{ match.skill }}
            </span>
            <span
              v-if="match.isGrounded"
              class="inline-flex items-center space-x-0.5 text-[9px] text-emerald-700 dark:text-emerald-400 font-medium"
            >
              <ShieldCheck class="h-3 w-3" />
              <span>Ada di CV</span>
            </span>
          </div>

          <!-- Evidence Quote from CV -->
          <div class="mt-1 flex items-start space-x-1.5 text-[10px] text-gray-600 dark:text-gray-400 italic">
            <Quote class="h-3 w-3 shrink-0 mt-0.5 text-emerald-500 opacity-60" />
            <span>"{{ match.cvEvidenceSnippet }}"</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Skill Gaps / Missing Requirements Section -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="flex items-center space-x-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
          <HelpCircle class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>Kesenjangan Kualifikasi (Skill Gaps)</span>
        </h4>
        <span class="text-[10px] font-medium text-gray-400">
          {{ analysis.missingSkills?.length || 0 }} area
        </span>
      </div>

      <div class="space-y-2">
        <div
          v-for="(gap, idx) in analysis.missingSkills"
          :key="idx"
          class="rounded-lg border border-gray-200 bg-gray-50/70 p-2 text-xs dark:border-gray-700/80 dark:bg-gray-750"
        >
          <div class="flex items-center justify-between">
            <span class="font-medium text-gray-900 dark:text-gray-100">
              {{ gap.missingRequirement }}
            </span>
            <span
              class="rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider"
              :class="gap.importance === 'Crucial'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'"
            >
              {{ gap.importance === 'Crucial' ? 'Wajib' : 'Nilai Tambah' }}
            </span>
          </div>

          <!-- Mitigation / Transferable Advice -->
          <p class="mt-1 text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">
            <strong class="text-indigo-600 dark:text-indigo-400 font-semibold">Saran:</strong>
            {{ gap.mitigationAdvice }}
          </p>
        </div>
      </div>
    </div>

    <!-- Interview Highlights Section -->
    <div v-if="analysis.interviewTips && analysis.interviewTips.length > 0" class="space-y-1.5">
      <h4 class="flex items-center space-x-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
        <Lightbulb class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>Poin Unggulan Wawancara (Highlights)</span>
      </h4>
      <div class="rounded-lg border border-indigo-100 bg-indigo-50/40 p-2.5 text-xs dark:border-indigo-900/40 dark:bg-indigo-950/20 space-y-1.5">
        <div
          v-for="(tip, idx) in analysis.interviewTips"
          :key="idx"
          class="flex items-start space-x-2 text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed"
        >
          <span class="text-indigo-500 font-bold shrink-0">•</span>
          <span>{{ tip }}</span>
        </div>
      </div>
    </div>

    <!-- Action Bar: Next Step to Email Generator & Maintenance -->
    <div class="pt-2 border-t border-gray-100 dark:border-gray-700/60 space-y-2">
      <!-- Primary Action: Proceed to Email Tab (Milestone 5) -->
      <button
        type="button"
        @click="handleProceedToEmail"
        class="flex w-full items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
      >
        <span>Buat Draf Email Lamaran</span>
        <ArrowRight class="h-3.5 w-3.5" />
      </button>

      <!-- Secondary Controls: Re-analyze & Clear -->
      <div class="flex items-center space-x-2">
        <button
          type="button"
          @click="emit('reanalyze')"
          :disabled="isAnalyzing"
          class="flex flex-1 items-center justify-center space-x-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          <RotateCcw class="h-3 w-3" :class="{ 'animate-spin': isAnalyzing }" />
          <span>{{ isAnalyzing ? 'Menganalisis...' : 'Analisis Ulang' }}</span>
        </button>

        <button
          type="button"
          @click="emit('clear')"
          class="flex items-center justify-center space-x-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:border-gray-700 dark:bg-gray-800 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
          title="Hapus hasil analisis ini"
        >
          <Trash2 class="h-3 w-3" />
          <span>Hapus</span>
        </button>
      </div>
    </div>
  </div>
</template>
