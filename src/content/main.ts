/**
 * Content Script Entry Point (Manifest V3)
 * Injected into web pages to extract job postings on demand when requested
 * by the Side Panel or Background Service Worker.
 */

import { extractJobFromDocument } from './scrapers'
import type { ExtensionMessage } from '@/types/messages'

console.log('[JobSeekAssistant] Content script initialized on:', window.location.href)

// Listen for scrape requests from Side Panel or Background Worker
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'SCRAPE_JOB_PAGE') {
    try {
      const jobDetails = extractJobFromDocument(document, window.location.href)
      sendResponse({
        type: 'SCRAPE_JOB_SUCCESS',
        payload: jobDetails,
      })
    } catch (error: any) {
      console.error('[JobSeekAssistant ContentScript] Extraction error:', error)
      sendResponse({
        type: 'API_ERROR',
        error: error.message || 'Gagal mengekstrak data lowongan dari halaman ini.',
      })
    }
  }

  // Return true if async handling is needed (or synchronous response via sendResponse)
  return true
})
