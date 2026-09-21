/**
 * Content Script Entry Point (Manifest V3)
 * Injected into web pages to extract job postings on demand when requested
 * by the Side Panel or Background Service Worker.
 */

import { extractJobFromDocument } from './scrapers'
import type { ExtensionMessage } from '@/types/messages'

console.log('[JobSeekAssistant v1.0.1] Content script initialized on:', window.location.href)

// Listen for scrape requests from Side Panel or Background Worker
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'SCRAPE_JOB_PAGE') {
    try {
      console.log('[JobSeekAssistant v1.0.1] SCRAPE_JOB_PAGE message received on:', window.location.href)
      const jobDetails = extractJobFromDocument(document, window.location.href)
      console.log('[JobSeekAssistant v1.0.1] Extraction success:', {
        platform: jobDetails.platform,
        title: jobDetails.title,
        company: jobDetails.company,
        descLength: jobDetails.description?.length,
        hasRequirements: !!jobDetails.requirements,
      })
      sendResponse({
        type: 'SCRAPE_JOB_SUCCESS',
        payload: jobDetails,
      })
    } catch (error: any) {
      console.error('[JobSeekAssistant v1.0.1 ContentScript] Extraction error:', error)
      sendResponse({
        type: 'API_ERROR',
        error: error.message || 'Gagal mengekstrak data lowongan dari halaman ini.',
      })
    }
  }

  // Return false/undefined since extraction is synchronous
  return false
})
