/**
 * CV Synchronization & Change Detection Service
 * Checks Google Drive files for timestamp updates, handles incremental refresh,
 * and maintains local cache consistency.
 */

import { storageService, STORAGE_KEYS } from './storage'
import { GoogleDriveService, GoogleDriveError } from './googleDrive'
import { CVParserService } from './cvParser'
import type { CVProfile, CVSyncResult } from '@/types/cv'

export class CVSyncService {
  /**
   * Check if a remote Google Drive CV has updates compared to local memory
   */
  static async checkDriveUpdate(
    token: string,
    profile: CVProfile
  ): Promise<{
    hasUpdate: boolean
    remoteModifiedTime?: string
    message: string
  }> {
    if (profile.source !== 'google_drive' || !profile.fileId) {
      return {
        hasUpdate: false,
        message: 'CV saat ini tidak terhubung ke Google Drive (dibuat melalui input manual).',
      }
    }

    try {
      const meta = await GoogleDriveService.getFileMetadata(token, profile.fileId)
      const remoteTime = meta.modifiedTime ? new Date(meta.modifiedTime).getTime() : 0
      const localTime = profile.driveModifiedTime
        ? new Date(profile.driveModifiedTime).getTime()
        : profile.lastModified
        ? new Date(profile.lastModified).getTime()
        : 0

      // Update last sync check timestamp in storage
      profile.lastSyncCheck = new Date().toISOString()
      await storageService.set(STORAGE_KEYS.CV_PROFILE, profile)

      if (remoteTime > localTime) {
        return {
          hasUpdate: true,
          remoteModifiedTime: meta.modifiedTime,
          message: 'Ditemukan versi CV yang lebih baru di Google Drive.',
        }
      }

      return {
        hasUpdate: false,
        remoteModifiedTime: meta.modifiedTime,
        message: 'CV di memori lokal sudah menggunakan versi terbaru dari Google Drive.',
      }
    } catch (error: any) {
      console.error('[CVSyncService] Error checking Drive update:', error)
      const isNotFound =
        (error instanceof GoogleDriveError && error.isNotFoundError) ||
        error?.status === 404 ||
        error?.message?.includes('tidak ditemukan') ||
        error?.message?.includes('404')

      if (isNotFound) {
        return {
          hasUpdate: false,
          message: 'Berkas CV tidak ditemukan di Google Drive (mungkin telah dihapus atau dipindahkan ke Sampah). Silakan pilih berkas CV baru.',
        }
      }

      const isOffline =
        (error instanceof GoogleDriveError && error.isOfflineError) ||
        (typeof navigator !== 'undefined' && !navigator.onLine)

      if (isOffline) {
        return {
          hasUpdate: false,
          message: 'Perangkat sedang offline. Tidak dapat memeriksa pembaruan CV dari Google Drive tanpa koneksi internet.',
        }
      }

      return {
        hasUpdate: false,
        message: `Gagal memeriksa pembaruan: ${error.message || 'Terjadi kesalahan jaringan'}`,
      }
    }
  }

  /**
   * Sync and refresh local CV with latest content from Google Drive
   */
  static async syncWithDrive(
    token: string,
    profile: CVProfile
  ): Promise<CVSyncResult> {
    if (profile.source !== 'google_drive' || !profile.fileId) {
      return {
        status: 'not_drive',
        message: 'CV tidak bersumber dari Google Drive. Sinkronisasi dibatalkan.',
      }
    }

    try {
      const downloaded = await GoogleDriveService.downloadFileContent(
        token,
        profile.fileId,
        profile.mimeType || 'application/pdf',
        profile.fileName
      )

      let rawText = ''
      if (typeof downloaded.content === 'string') {
        rawText = downloaded.content
      } else {
        rawText = await CVParserService.extractTextFromPdf(downloaded.content)
      }

      if (!rawText.trim()) {
        throw new Error('Konten teks dokumen kosong atau tidak terbaca.')
      }

      const updatedProfile = CVParserService.parseTextToProfile(rawText, {
        fileName: downloaded.fileName,
        fileId: downloaded.fileId,
        source: 'google_drive',
        mimeType: downloaded.mimeType,
        checksum: downloaded.checksum,
        driveModifiedTime: downloaded.modifiedTime,
        fileSize: typeof downloaded.content !== 'string' ? downloaded.content.byteLength : undefined,
      })

      // Preserve existing profile ID for state continuity
      updatedProfile.id = profile.id
      updatedProfile.lastSyncCheck = new Date().toISOString()

      await storageService.set(STORAGE_KEYS.CV_PROFILE, updatedProfile)

      return {
        status: 'updated',
        message: 'CV berhasil diperbarui dengan versi terbaru dari Google Drive!',
        updatedProfile,
        driveModifiedTime: downloaded.modifiedTime,
      }
    } catch (error: any) {
      console.error('[CVSyncService] Error syncing with Drive:', error)
      const isNotFound =
        (error instanceof GoogleDriveError && error.isNotFoundError) ||
        error?.status === 404 ||
        error?.message?.includes('tidak ditemukan') ||
        error?.message?.includes('404')

      if (isNotFound) {
        return {
          status: 'not_found',
          message: 'Berkas CV tidak ditemukan di Google Drive (mungkin telah dihapus atau dipindahkan ke Sampah). Silakan pilih berkas CV lain di tab Profil & CV.',
        }
      }

      const isOffline =
        (error instanceof GoogleDriveError && error.isOfflineError) ||
        (typeof navigator !== 'undefined' && !navigator.onLine)

      if (isOffline) {
        return {
          status: 'error',
          message: 'Perangkat sedang offline. Tidak dapat menyinkronkan CV dari Google Drive tanpa koneksi internet.',
        }
      }

      return {
        status: 'error',
        message: `Gagal memperbarui CV: ${error.message || 'Kesalahan saat mengunduh/memproses berkas'}`,
      }
    }
  }
}
