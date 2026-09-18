// Background Service Worker (Manifest V3)
// Configures extension behavior and handles cross-context messages

import { GoogleAuthService } from '@/services/googleAuth'
import { GoogleDriveService } from '@/services/googleDrive'
import { CVParserService } from '@/services/cvParser'
import { CVSyncService } from '@/services/cvSync'
import { MimeBuilderService, type MimeAttachment } from '@/services/mimeBuilder'
import { GmailClientService, GmailClientError } from '@/services/gmailClient'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import type { ExtensionMessage } from '@/types/messages'
import type { CVProfile } from '@/types/cv'
import type { EmailDispatchResult, EmailDispatchHistoryItem } from '@/types/email'

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

        case 'SEND_GMAIL_REQUEST': {
          const payload = message.payload
          if (!payload.recipientEmail?.trim()) {
            throw new Error('Alamat email penerima tidak boleh kosong.')
          }
          if (!payload.subject?.trim()) {
            throw new Error('Subjek email tidak boleh kosong.')
          }
          if (!payload.body?.trim()) {
            throw new Error('Isi email tidak boleh kosong.')
          }

          let token = await GoogleAuthService.getValidToken(false)
          if (!token) {
            throw new Error('Google Workspace belum terhubung. Silakan hubungkan akun Google Anda di tab Pengaturan.')
          }

          let attachment: MimeAttachment | undefined
          if (payload.attachmentFileId) {
            try {
              const downloadedPdf = await GoogleDriveService.downloadFileAsPdf(
                token,
                payload.attachmentFileId,
                payload.attachmentMimeType,
                payload.attachmentFileName || 'CV_Resume.pdf'
              )
              attachment = {
                filename: downloadedPdf.fileName,
                mimeType: 'application/pdf',
                data: downloadedPdf.content,
              }
            } catch (attachErr: any) {
              console.warn('[Background] Failed to download PDF attachment:', attachErr)
              throw new Error(`Gagal melampirkan berkas CV dari Google Drive: ${attachErr.message}`)
            }
          }

          const rawBase64Url = MimeBuilderService.buildRfc2822Base64Url({
            to: payload.recipientEmail,
            subject: payload.subject,
            body: payload.body,
            attachment,
          })

          const executeDispatch = async (activeToken: string) => {
            if (payload.action === 'draft') {
              return await GmailClientService.createDraft(activeToken, rawBase64Url)
            } else {
              return await GmailClientService.sendMessage(activeToken, rawBase64Url)
            }
          }

          let dispatchResult: any
          try {
            dispatchResult = await executeDispatch(token)
          } catch (err: any) {
            // Auto-refresh token retry on 401
            if (err instanceof GmailClientError && err.isAuthError) {
              console.warn('[Background] 401 received, invalidating token and retrying...')
              await GoogleAuthService.invalidateToken(token)
              const freshToken = await GoogleAuthService.getValidToken(false)
              if (freshToken) {
                token = freshToken
                dispatchResult = await executeDispatch(freshToken)
              } else {
                throw err
              }
            } else {
              throw err
            }
          }

          const successResult: EmailDispatchResult = {
            success: true,
            action: payload.action,
            draftId: dispatchResult.draftId,
            messageId: dispatchResult.messageId,
            dispatchedAt: new Date().toISOString(),
          }

          // Persist to email dispatch history
          try {
            const history = await storageService.get<EmailDispatchHistoryItem[]>(
              STORAGE_KEYS.EMAIL_DRAFTS,
              []
            )
            const historyItem: EmailDispatchHistoryItem = {
              id: `dispatch_${Date.now()}`,
              recipientEmail: payload.recipientEmail,
              subject: payload.subject,
              action: payload.action,
              status: 'success',
              draftId: dispatchResult.draftId,
              messageId: dispatchResult.messageId,
              attachmentIncluded: !!attachment,
              attachmentName: attachment?.filename,
              dispatchedAt: successResult.dispatchedAt,
            }
            await storageService.set(STORAGE_KEYS.EMAIL_DRAFTS, [historyItem, ...history].slice(0, 15))
          } catch (histErr) {
            console.warn('[Background] Failed to save dispatch history:', histErr)
          }

          return {
            type: 'SEND_GMAIL_SUCCESS',
            payload: successResult,
          }
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
