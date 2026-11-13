// Background Service Worker (Manifest V3)
// Configures extension behavior and handles cross-context messages

import { GoogleAuthService } from '@/services/googleAuth'
import { GoogleDriveService, GoogleDriveError } from '@/services/googleDrive'
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

async function withTokenRefresh<T>(
  action: (token: string) => Promise<T>,
  contextDesc = 'operasi Google Workspace'
): Promise<T> {
  let token = await GoogleAuthService.getValidToken(false)
  if (!token) {
    throw new Error('Google Workspace belum terhubung. Silakan hubungkan akun Google di tab Pengaturan.')
  }

  try {
    return await action(token)
  } catch (err: any) {
    const isAuthError =
      (err instanceof GoogleDriveError && err.isAuthError) ||
      (err instanceof GmailClientError && err.isAuthError) ||
      err?.status === 401 ||
      err?.message?.includes('401') ||
      err?.message?.includes('kedaluwarsa')

    if (isAuthError && token !== 'demo_mock_token_12345') {
      console.warn(`[Background] 401 Auth Error during ${contextDesc}. Attempting silent token refresh...`)
      await GoogleAuthService.invalidateToken(token)
      const freshToken = await GoogleAuthService.getValidToken(false)
      if (freshToken) {
        console.info(`[Background] Token refreshed successfully. Retrying ${contextDesc}...`)
        return await action(freshToken)
      } else {
        // Mark status as disconnected
        const settings = await storageService.get<any>(STORAGE_KEYS.SETTINGS, {})
        await storageService.set(STORAGE_KEYS.SETTINGS, {
          ...settings,
          googleAuthStatus: 'disconnected',
        })
        throw new Error('Sesi Google Workspace telah berakhir. Silakan klik tombol "Hubungkan Akun Google" di tab Pengaturan.')
      }
    }
    throw err
  }
}

function isPrivilegedSender(sender: chrome.runtime.MessageSender): boolean {
  // Sender must match extension's own ID
  if (sender.id && chrome.runtime?.id && sender.id !== chrome.runtime.id) {
    return false
  }
  // Content scripts running inside web pages have sender.tab defined.
  // Internal UI (Sidepanel, Popup) do not have sender.tab and have chrome-extension:// origin.
  if (sender.tab) {
    return false
  }
  return true
}

// Listen for cross-context messages from Side Panel, Popup, or Content Script
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  // Handle async response by returning true
  const handleMessage = async () => {
    try {
      const privilegedMessageTypes = [
        'GOOGLE_AUTH_REQUEST',
        'GOOGLE_LOGOUT_REQUEST',
        'DRIVE_LIST_FILES_REQUEST',
        'DRIVE_FETCH_CV_REQUEST',
        'SYNC_CV_REQUEST',
        'SEND_GMAIL_REQUEST',
      ]

      if (privilegedMessageTypes.includes(message.type) && !isPrivilegedSender(sender)) {
        throw new Error('Akses ditolak: Operasi istimewa ini hanya dapat dipanggil dari antarmuka internal ekstensi.')
      }

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
          const files = await withTokenRefresh(
            (t) => GoogleDriveService.listFiles(t, message.payload?.query),
            'memuat berkas Google Drive'
          )
          return {
            type: 'DRIVE_LIST_FILES_SUCCESS',
            payload: files,
          }
        }

        case 'DRIVE_FETCH_CV_REQUEST': {
          const { fileId, fileName, mimeType } = message.payload
          const downloaded = await withTokenRefresh(
            (t) => GoogleDriveService.downloadFileContent(t, fileId, mimeType, fileName),
            'mengunduh berkas CV Google Drive'
          )

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
          const currentProfile = await storageService.get<CVProfile | null>(STORAGE_KEYS.CV_PROFILE, null)
          if (!currentProfile) {
            throw new Error('Tidak ada CV yang tersimpan untuk disinkronkan.')
          }

          const syncResult = await withTokenRefresh(
            (t) => CVSyncService.syncWithDrive(t, currentProfile),
            'sinkronisasi CV Google Drive'
          )
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
          try {
            const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'SCRAPE_JOB_PAGE' })
            return response
          } catch (tabErr) {
            // Auto-inject content script if receiving end does not exist (e.g. extension reload)
            if (chrome.scripting && chrome.runtime?.getManifest) {
              try {
                const manifest = chrome.runtime.getManifest()
                const scriptFiles = manifest.content_scripts?.[0]?.js
                if (scriptFiles && scriptFiles.length > 0) {
                  await chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: scriptFiles,
                  })
                  await new Promise((r) => setTimeout(r, 200))
                  return await chrome.tabs.sendMessage(activeTab.id, { type: 'SCRAPE_JOB_PAGE' })
                }
              } catch (injectErr) {
                console.warn('[Background] Dynamic script injection attempt failed:', injectErr)
              }
            }
            throw tabErr
          }
        }

        case 'SEND_GMAIL_REQUEST': {
          const payload = message.payload
          const recipientClean = payload.recipientEmail?.trim()
          if (!recipientClean) {
            throw new Error('Alamat email penerima tidak boleh kosong.')
          }
          if (/[\r\n]/.test(recipientClean) || /[\r\n]/.test(payload.subject || '')) {
            throw new Error('Format email atau subjek tidak valid (karakter baris baru tidak diizinkan).')
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientClean)) {
            throw new Error('Format alamat email penerima tidak valid.')
          }
          if (!payload.subject?.trim()) {
            throw new Error('Subjek email tidak boleh kosong.')
          }
          if (!payload.body?.trim()) {
            throw new Error('Isi email tidak boleh kosong.')
          }

          const dispatchResult = await withTokenRefresh(async (activeToken) => {
            let attachment: MimeAttachment | undefined
            if (payload.attachmentFileId) {
              try {
                const downloadedPdf = await GoogleDriveService.downloadFileAsPdf(
                  activeToken,
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

            let res: any
            if (payload.action === 'draft') {
              res = await GmailClientService.createDraft(activeToken, rawBase64Url)
            } else {
              res = await GmailClientService.sendMessage(activeToken, rawBase64Url)
            }
            return { res, attachment }
          }, 'pengiriman Gmail')

          const successResult: EmailDispatchResult = {
            success: true,
            action: payload.action,
            draftId: dispatchResult.res.draftId,
            messageId: dispatchResult.res.messageId,
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
              draftId: dispatchResult.res.draftId,
              messageId: dispatchResult.res.messageId,
              attachmentIncluded: !!dispatchResult.attachment,
              attachmentName: dispatchResult.attachment?.filename,
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
