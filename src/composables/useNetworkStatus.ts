/**
 * Network Status Composable
 * Monitors online/offline status and provides reactive indicators
 * for graceful offline degradation in the extension side panel.
 */

import { ref, onMounted, onUnmounted, getCurrentInstance } from 'vue'

const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const reconnected = ref(false)
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let listenersRegistered = false

function updateOnlineStatus() {
  const previouslyOnline = isOnline.value
  isOnline.value = typeof navigator !== 'undefined' ? navigator.onLine : true

  if (!previouslyOnline && isOnline.value) {
    // Just transitioned from offline to online
    reconnected.value = true
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    reconnectTimeout = setTimeout(() => {
      reconnected.value = false
    }, 4000)
  }
}

function initNetworkListeners() {
  if (listenersRegistered || typeof window === 'undefined') return

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  listenersRegistered = true
}

export function useNetworkStatus() {
  if (getCurrentInstance()) {
    onMounted(() => {
      initNetworkListeners()
    })

    onUnmounted(() => {
      // Optional: keep singleton listener active across component unmounts
    })
  } else {
    initNetworkListeners()
  }

  return {
    isOnline,
    reconnected,
    checkStatus: updateOnlineStatus,
  }
}
