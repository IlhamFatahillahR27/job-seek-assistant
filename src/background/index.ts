// Background Service Worker (Manifest V3)
// Configures extension behavior and handles cross-context messages

import { GoogleAuthService } from '@/services/googleAuth'
import { GoogleDriveService } from '@/services/googleDrive'
import { CVParserService } from '@/services/cvParser'
import { CVSyncService } from '@/services/cvSync'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import type { ExtensionMessage } from '@/types/messages'
import type { CVProfile } from '@/types/cv'

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[JobSeekAssistant] Extension installed/updated.')

  // Open side panel when the toolbar action icon is clicked
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      console.log('[JobSeekAssistant] Side panel behavior configured: openPanelOnActionClick=true')
    } catch (error) {
      console.warn('[JobSeekAssistant] Failed to set side panel behavior:', error)
    }
  }
})

// Listen for cross-context messages from Side Panel, Popup, or Content Script
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  // Handle async response by returning true
  const handleMessage = async () => {
    try {
      switch (message.type) {
        case 'GOOGLE_AUTH_REQUEST': {
          const authResult = await GoogleAuthService.login(message.payload?.customClientId)
          return {
            type: 'GOOGLE_AUTH_SUCCESS',
            payload: {
              token: authResult.token,
              email: authResult.profile.email,
              name: authResult.profile.name,
              avatar: authResult.profile.picture,
            },
          }
        }

        case 'GOOGLE_AUTH_CHECK': {
          const statusResult = await GoogleAuthService.checkAuthStatus()
          return {
            status: statusResult.status,
            profile: statusResult.profile,
          }
        }

        case 'GOOGLE_LOGOUT_REQUEST': {
          await GoogleAuthService.logout()
          return { success: true }
        }

        case 'DRIVE_LIST_FILES_REQUEST': {
          const token = await GoogleAuthService.getValidToken(false)
          if (!token) {
            throw new Error('Google Workspace belum terhubung. Silakan login terlebih dahulu.')
          }
          const files = await GoogleDriveService.listFiles(token, message.payload?.query)
          return {
            type: 'DRIVE_LIST_FILES_SUCCESS',
            payload: files,
          }
        }

        case 'DRIVE_FETCH_CV_REQUEST': {
          const token = await GoogleAuthService.getValidToken(false)
          if (!token) {
            throw new Error('Google Workspace belum terhubung.')
          }

          const { fileId, fileName, mimeType } = message.payload
          const downloaded = await GoogleDriveService.downloadFileContent(token, fileId, mimeType, fileName)

          let rawText = ''
          if (typeof downloaded.content === 'string') {
            rawText = downloaded.content
          } else {
            rawText = await CVParserService.extractTextFromPdf(downloaded.content)
          }

          const profile = CVParserService.parseTextToProfile(rawText, {
            fileName: downloaded.fileName,
            fileId: downloaded.fileId,
            source: 'google_drive',
            mimeType: downloaded.mimeType,
            checksum: downloaded.checksum,
            driveModifiedTime: downloaded.modifiedTime,
            fileSize: typeof downloaded.content !== 'string' ? downloaded.content.byteLength : undefined,
          })

          await storageService.set(STORAGE_KEYS.CV_PROFILE, profile)
          return {
            type: 'DRIVE_FETCH_CV_SUCCESS',
            payload: profile,
          }
        }

        case 'SYNC_CV_REQUEST': {
          const token = await GoogleAuthService.getValidToken(false)
          if (!token) {
            throw new Error('Google Workspace belum terhubung.')
          }

          const currentProfile = await storageService.get<CVProfile | null>(STORAGE_KEYS.CV_PROFILE, null)
          if (!currentProfile) {
            throw new Error('Tidak ada CV yang tersimpan untuk disinkronkan.')
          }

          const syncResult = await CVSyncService.syncWithDrive(token, currentProfile)
          return {
            type: 'SYNC_CV_SUCCESS',
            payload: syncResult,
          }
        }

        case 'SCRAPE_JOB_PAGE': {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
          if (!activeTab || !activeTab.id) {
            throw new Error('Tidak ada tab aktif yang ditemukan.')
          }
          if (activeTab.url?.startsWith('chrome://') || activeTab.url?.startsWith('chrome-extension://') || activeTab.url?.startsWith('edge://')) {
            throw new Error('Halaman sistem peramban tidak dapat diekstrak. Silakan buka halaman lowongan kerja pada website publik.')
          }
          const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'SCRAPE_JOB_PAGE' })
          return response
        }

        default:
          return null
      }
    } catch (error: any) {
      console.error(`[Background] Error handling message "${message.type}":`, error)
      return {
        type: 'API_ERROR',
        error: error.message || 'Terjadi kesalahan internal',
      }
    }
  }

  handleMessage().then(sendResponse)
  return true // Indicates async response
})
