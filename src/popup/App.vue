<script setup lang="ts">
import { Sparkles, ArrowRight } from 'lucide-vue-next'

const openSidePanel = async () => {
  if (chrome?.sidePanel?.open) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id })
    }
  } else {
    alert('Buka panel samping dari menu Sidebar browser Anda.')
  }
}
</script>

<template>
  <div class="w-72 p-4 font-sans bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
    <div class="flex items-center space-x-2">
      <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
        <Sparkles class="h-4 w-4" />
      </div>
      <h2 class="text-sm font-semibold">Job Seek Assistant</h2>
    </div>
    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
      Asisten pencarian kerja pribadi berbasis Google Gemini AI & Google Workspace.
    </p>
    <button
      type="button"
      @click="openSidePanel"
      class="mt-3.5 flex w-full items-center justify-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
    >
      <span>Buka Side Panel</span>
      <ArrowRight class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
