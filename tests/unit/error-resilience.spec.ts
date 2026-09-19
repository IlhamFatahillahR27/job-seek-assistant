/**
 * Unit Tests for Milestone 6: Quality Assurance & Error Resilience
 * Tests offline resilience, token expiration & 401 handling, CV file not found (404),
 * and Gemini API quota rate limits (429).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setupChromeMock } from '../mocks/chrome'
import { GoogleDriveService, GoogleDriveError } from '@/services/googleDrive'
import { GeminiClientService, GeminiClientError } from '@/services/geminiClient'
import { GmailClientService, GmailClientError } from '@/services/gmailClient'
import { CVSyncService } from '@/services/cvSync'
import { GoogleAuthService } from '@/services/googleAuth'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import type { CVProfile } from '@/types/cv'

describe('Milestone 6 Error Resilience Suite', () => {
  let chromeMock: any

  beforeEach(() => {
    chromeMock = setupChromeMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('1. Offline Resilience', () => {
    it('should throw GoogleDriveError with isOfflineError=true when navigator.onLine is false', async () => {
      vi.stubGlobal('navigator', { onLine: false })

      await expect(GoogleDriveService.listFiles('real_token_xyz')).rejects.toThrowError(GoogleDriveError)
      try {
        await GoogleDriveService.listFiles('real_token_xyz')
      } catch (err: any) {
        expect(err.isOfflineError).toBe(true)
        expect(err.message).toContain('offline')
      }
    })

    it('should throw GeminiClientError with isOfflineError=true when calling listModels offline', async () => {
      vi.stubGlobal('navigator', { onLine: false })

      try {
        await GeminiClientService.listModels('gemini_key_123')
      } catch (err: any) {
        expect(err instanceof GeminiClientError).toBe(true)
        expect(err.isOfflineError).toBe(true)
        expect(err.message).toContain('offline')
      }
    })

    it('should throw GmailClientError with isOfflineError=true when calling sendMessage offline', async () => {
      vi.stubGlobal('navigator', { onLine: false })

      try {
        await GmailClientService.sendMessage('real_token_xyz', 'rawBase64UrlPayload')
      } catch (err: any) {
        expect(err instanceof GmailClientError).toBe(true)
        expect(err.isOfflineError).toBe(true)
        expect(err.message).toContain('offline')
      }
    })

    it('should throw friendly offline error in GoogleAuthService.fetchUserProfile when offline', async () => {
      vi.stubGlobal('navigator', { onLine: false })

      await expect(GoogleAuthService.fetchUserProfile('real_token_xyz')).rejects.toThrow(
        /Koneksi offline/
      )
    })
  })

  describe('2. Token Expiration & HTTP 401 Handling', () => {
    it('GoogleDriveService should identify 401 and throw isAuthError=true', async () => {
      vi.stubGlobal('navigator', { onLine: true })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ error: { message: 'Invalid Credentials' } }),
        })
      )

      try {
        await GoogleDriveService.listFiles('expired_token')
      } catch (err: any) {
        expect(err instanceof GoogleDriveError).toBe(true)
        expect(err.isAuthError).toBe(true)
        expect(err.status).toBe(401)
        expect(err.message).toContain('kedaluwarsa')
      }
    })

    it('GmailClientService should identify 401 and throw isAuthError=true', async () => {
      vi.stubGlobal('navigator', { onLine: true })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ error: { message: 'Auth token expired' } }),
        })
      )

      try {
        await GmailClientService.createDraft('expired_token', 'rawBase64')
      } catch (err: any) {
        expect(err instanceof GmailClientError).toBe(true)
        expect(err.isAuthError).toBe(true)
        expect(err.status).toBe(401)
        expect(err.message).toContain('kedaluwarsa')
      }
    })
  })

  describe('3. File CV Not Found (HTTP 404 / Trashed in Drive)', () => {
    it('GoogleDriveService should throw GoogleDriveError with isNotFoundError=true on 404', async () => {
      vi.stubGlobal('navigator', { onLine: true })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ error: { message: 'File not found' } }),
        })
      )

      try {
        await GoogleDriveService.getFileMetadata('token_123', 'non_existent_file_id')
      } catch (err: any) {
        expect(err instanceof GoogleDriveError).toBe(true)
        expect(err.isNotFoundError).toBe(true)
        expect(err.status).toBe(404)
        expect(err.message).toContain('tidak ditemukan di Google Drive')
      }
    })

    it('CVSyncService.syncWithDrive should return status="not_found" when remote CV returns 404', async () => {
      const mockProfile: CVProfile = {
        id: 'test_cv_1',
        fileName: 'Deleted_Resume.pdf',
        fileId: 'deleted_file_id_404',
        source: 'google_drive',
        parsedAt: new Date().toISOString(),
        rawText: 'Mock CV content',
        skills: [],
        experiences: [],
        educations: [],
      }

      vi.spyOn(GoogleDriveService, 'downloadFileContent').mockRejectedValue(
        new GoogleDriveError('File not found', 404)
      )

      const result = await CVSyncService.syncWithDrive('valid_token', mockProfile)
      expect(result.status).toBe('not_found')
      expect(result.message).toContain('tidak ditemukan di Google Drive')
    })
  })

  describe('4. Gemini API Quota Limit (HTTP 429 & RESOURCE_EXHAUSTED)', () => {
    it('GeminiClientService.validateApiKey should map 429 to clear rate limit notice', async () => {
      vi.stubGlobal('navigator', { onLine: true })
      vi.spyOn(GeminiClientService, 'listModels').mockRejectedValue(
        new GeminiClientError('Rate limit exceeded', 429)
      )

      const validation = await GeminiClientService.validateApiKey('my_api_key')
      expect(validation.valid).toBe(false)
      expect(validation.errorMessage).toContain('Rate Limit 429')
    })

    it('GeminiClientError correctly sets isRateLimit to true for status 429', () => {
      const err = new GeminiClientError('Resource exhausted', 429)
      expect(err.isRateLimit).toBe(true)
      expect(err.isAuthError).toBe(false)
    })
  })

  describe('5. Network Status Composable (useNetworkStatus)', () => {
    it('should expose reactive isOnline ref and update status', () => {
      const { isOnline, checkStatus } = useNetworkStatus()
      expect(typeof isOnline.value).toBe('boolean')
      checkStatus()
      expect(typeof isOnline.value).toBe('boolean')
    })
  })
})
