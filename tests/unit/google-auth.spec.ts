import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setupChromeMock } from '../mocks/chrome'
import { GoogleAuthService } from '@/services/googleAuth'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import { DEFAULT_SETTINGS, type AppSettings } from '@/types/settings'

describe('GoogleAuthService Unit Tests', () => {
  let chromeMock: any

  beforeEach(() => {
    chromeMock = setupChromeMock()
    // Reset global fetch mock
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('oauth2/v2/userinfo')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              id: 'google_user_123',
              email: 'kandidat@gmail.com',
              name: 'Kandidat Pelamar',
              picture: 'https://avatar.url/photo.jpg',
            }),
          })
        }
        if (url.includes('revoke')) {
          return Promise.resolve({ ok: true, status: 200 })
        }
        return Promise.reject(new Error(`Unhandled fetch url: ${url}`))
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should retrieve a valid token via chrome.identity.getAuthToken', async () => {
    const token = await GoogleAuthService.getValidToken(true)
    expect(token).toBe('mock_oauth2_token_abc123')
    expect(chromeMock.identity.getAuthToken).toHaveBeenCalledWith(
      { interactive: true },
      expect.any(Function)
    )
  })

  it('should fetch user profile from Google UserInfo API', async () => {
    const profile = await GoogleAuthService.fetchUserProfile('mock_token_abc')
    expect(profile.email).toBe('kandidat@gmail.com')
    expect(profile.name).toBe('Kandidat Pelamar')
    expect(profile.picture).toBe('https://avatar.url/photo.jpg')
  })

  it('should successfully complete full interactive login flow', async () => {
    const result = await GoogleAuthService.login()
    expect(result.token).toBe('mock_oauth2_token_abc123')
    expect(result.profile.email).toBe('kandidat@gmail.com')

    // Verify storage persistence
    const saved = await storageService.get<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
    expect(saved.googleAuthStatus).toBe('connected')
    expect(saved.googleUserEmail).toBe('kandidat@gmail.com')
    expect(saved.googleUserName).toBe('Kandidat Pelamar')
  })

  it('should logout and clear authentication credentials and storage', async () => {
    // First login
    await GoogleAuthService.login()
    let saved = await storageService.get<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
    expect(saved.googleAuthStatus).toBe('connected')

    // Logout
    await GoogleAuthService.logout()
    saved = await storageService.get<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
    expect(saved.googleAuthStatus).toBe('disconnected')
    expect(saved.googleUserEmail).toBe('')
    expect(chromeMock.identity.removeCachedAuthToken).toHaveBeenCalled()
  })

  it('should support Demo / Mock Mode without active GCP credentials', async () => {
    // Enable demo mode
    await storageService.set(STORAGE_KEYS.SETTINGS, {
      ...DEFAULT_SETTINGS,
      useDemoDriveMode: true,
    })

    const result = await GoogleAuthService.login()
    expect(result.token).toBe('demo_mock_token_12345')
    expect(result.profile.email).toBe('pelamar.kerja@gmail.com')

    const status = await GoogleAuthService.checkAuthStatus()
    expect(status.status).toBe('connected')
  })

  it('should handle custom OAuth Client ID via launchWebAuthFlow', async () => {
    const result = await GoogleAuthService.login('custom-client-id-123.apps.googleusercontent.com')
    expect(result.token).toBe('mock_flow_token_999')
    expect(chromeMock.identity.launchWebAuthFlow).toHaveBeenCalled()
  })
})
