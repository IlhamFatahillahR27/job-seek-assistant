<script setup lang="ts">
import { ref } from 'vue'
import { Sparkles, ArrowRight, ShieldCheck, AlertCircle, AlertTriangle, RefreshCw, X } from 'lucide-vue-next'
import { useGoogleAuth, useSession } from '@/composables/useStorageState'

const emit = defineEmits<{
  (e: 'login-success'): void
}>()

const { login } = useGoogleAuth()
const { startDemoSession, sessionNotice, clearSessionNotice } = useSession()

const isLoggingIn = ref(false)
const errorMessage = ref<string | null>(null)

const handleLogin = async () => {
  errorMessage.value = null
  isLoggingIn.value = true
  try {
    await login()
    emit('login-success')
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal masuk dengan Google. Silakan periksa kembali konfigurasi akun Anda.'
  } finally {
    isLoggingIn.value = false
  }
}

const handleCancelLogin = () => {
  isLoggingIn.value = false
  errorMessage.value = 'Proses login dibatalkan oleh pengguna.'
}

const handleStartDemo = async () => {
  errorMessage.value = null
  clearSessionNotice()
  await startDemoSession()
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-between p-6 bg-gradient-to-b from-indigo-50/50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
    <!-- Header / Branding Area -->
    <div class="w-full max-w-sm flex flex-col items-center text-center pt-6">
      <div class="relative flex items-center justify-center mb-4">
        <div class="absolute -inset-2 rounded-2xl bg-indigo-500/20 blur-xl dark:bg-indigo-600/30"></div>
        <img
          src="/logo.png"
          alt="Job Seek Assistant Logo"
          class="relative h-20 w-20 rounded-2xl object-contain shadow-md ring-1 ring-black/5 dark:ring-white/10"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
        />
        <!-- Fallback icon if logo fails to render -->
        <div class="hidden relative h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
          <Sparkles class="h-10 w-10" />
        </div>
      </div>

      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold mb-2">
        <Sparkles class="h-3 w-3" />
        <span>AI Job Application Assistant</span>
      </div>

      <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Job Seek Assistant
      </h1>
      <p class="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed px-2">
        Optimalkan pencarian kerja dengan analisis kecocokan CV berbasis AI dan pembuatan draft email lamaran otomatis.
      </p>
    </div>

    <!-- Session Expired Notice Banner -->
    <div
      v-if="sessionNotice"
      class="w-full max-w-sm my-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-2.5 animate-in fade-in duration-200"
    >
      <AlertTriangle class="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      <div class="flex-1 text-[11px] leading-relaxed">
        <p class="font-semibold mb-0.5">Sesi Login Berakhir</p>
        <p>{{ sessionNotice }}</p>
      </div>
      <button
        type="button"
        @click="clearSessionNotice"
        aria-label="Tutup pemberitahuan sesi"
        class="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 p-0.5"
        title="Tutup pemberitahuan"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Error Alert Banner -->
    <div
      v-if="errorMessage"
      class="w-full max-w-sm my-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 flex items-start gap-2.5"
    >
      <AlertCircle class="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
      <div class="flex-1 text-[11px] leading-relaxed">
        {{ errorMessage }}
      </div>
    </div>

    <!-- Actions Area -->
    <div class="w-full max-w-sm flex flex-col gap-3 my-auto py-4">
      <!-- Primary: Google Login Button with Cancel Option -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="handleLogin"
          :disabled="isLoggingIn"
          class="group relative flex flex-1 items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw v-if="isLoggingIn" class="h-4 w-4 animate-spin text-indigo-600" />
          <svg v-else class="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{{ isLoggingIn ? 'Menghubungkan Akun...' : 'Masuk dengan Google' }}</span>
        </button>

        <button
          v-if="isLoggingIn"
          type="button"
          @click="handleCancelLogin"
          class="rounded-xl border border-gray-300 bg-white px-3 py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 shadow-sm"
          title="Batalkan proses jika jendela Google tidak merespons"
        >
          Batal
        </button>
      </div>

      <!-- Secondary: Demo Mode Button -->
      <button
        type="button"
        @click="handleStartDemo"
        :disabled="isLoggingIn"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3 text-xs font-semibold text-white shadow-sm transition-all hover:from-indigo-700 hover:to-indigo-800 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
      >
        <Sparkles class="h-4 w-4" />
        <span>Coba Mode Demo</span>
        <ArrowRight class="h-3.5 w-3.5 ml-0.5 opacity-80" />
      </button>
    </div>

    <!-- Footer Privacy & Security Note -->
    <div class="w-full max-w-sm flex items-center justify-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 pb-2">
      <ShieldCheck class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span>Data CV & kredensial disimpan aman secara lokal.</span>
    </div>
  </div>
</template>
