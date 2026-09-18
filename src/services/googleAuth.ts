/**
 * Google Workspace Authentication Service
 * Manages OAuth2 tokens using chrome.identity with auto-refresh,
 * user profile retrieval, revocation, and demo mode support.
 */

import { storageService, STORAGE_KEYS } from './storage'
import type { AppSettings, GoogleAuthStatus } from '@/types/settings'

export interface GoogleUserProfile {
  id: string
  email: string
  name: string
  picture?: string
}

export interface AuthResult {
  token: string
  profile: GoogleUserProfile
}

export class GoogleAuthService {
  private static cachedToken: string | null = null

  /**
   * Check whether chrome.identity API is accessible in current context
   */
  private static isIdentityAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.identity &&
      !!chrome.identity.getAuthToken
    )
  }

  /**
   * Retrieve active token or refresh silently if available
   */
  static async getValidToken(interactive = false): Promise<string | null> {
    const settings = await storageService.get<AppSettings>(
      STORAGE_KEYS.SETTINGS,
      {} as AppSettings
    )

    // Check if demo mode is enabled
    if (settings.useDemoDriveMode) {
      return 'demo_mock_token_12345'
    }

    // Check custom access token stored in settings (from launchWebAuthFlow)
    if (settings.googleAccessToken) {
      if (settings.googleTokenExpiresAt && Date.now() > settings.googleTokenExpiresAt) {
        console.warn('[GoogleAuthService] Custom token expired, re-auth needed.')
      } else {
        return settings.googleAccessToken
      }
    }

    if (!this.isIdentityAvailable()) {
      console.warn('[GoogleAuthService] chrome.identity is not available in this environment.')
      return null
    }

    try {
      const token = await new Promise<string | null>((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive }, (res: any) => {
          if (chrome.runtime.lastError) {
            const err = chrome.runtime.lastError.message || 'Authentication error'
            if (!interactive) {
              // Non-interactive silent failure is normal when user is not signed in
              resolve(null)
            } else {
              reject(new Error(err))
            }
          } else {
            const tokenStr = typeof res === 'string' ? res : res?.token || null
            resolve(tokenStr)
          }
        })
      })

      if (token) {
        this.cachedToken = token
      }
      return token
    } catch (error) {
      console.error('[GoogleAuthService] Error in getValidToken:', error)
      throw error
    }
  }

  /**
   * Fetch user profile from Google UserInfo API using an access token
   */
  static async fetchUserProfile(token: string): Promise<GoogleUserProfile> {
    if (token === 'demo_mock_token_12345') {
      return {
        id: 'demo_user_001',
        email: 'pelamar.kerja@gmail.com',
        name: 'Ilham Fatahillah (Demo)',
        picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      }
    }

    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Token might have expired, invalidate cached token
        await this.invalidateToken(token)
        throw new Error('Sesi Google telah kedaluwarsa. Silakan hubungkan ulang akun Anda.')
      }
      throw new Error(`Gagal mengambil profil pengguna: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      email: data.email,
      name: data.name || data.email,
      picture: data.picture,
    }
  }

  /**
   * Interactive Login Flow
   */
  static async login(customClientId?: string): Promise<AuthResult> {
    const settings = await storageService.get<AppSettings>(
      STORAGE_KEYS.SETTINGS,
      {} as AppSettings
    )

    // If demo mode is explicitly active, return demo auth result
    if (settings.useDemoDriveMode) {
      const demoProfile: GoogleUserProfile = {
        id: 'demo_user_001',
        email: 'pelamar.kerja@gmail.com',
        name: 'Ilham Fatahillah (Demo)',
        picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      }

      await this.saveAuthSuccess('demo_mock_token_12345', demoProfile)
      return { token: 'demo_mock_token_12345', profile: demoProfile }
    }

    // If custom client ID provided or stored, use launchWebAuthFlow
    const clientId = customClientId || settings.googleClientId
    if (
      clientId &&
      clientId.trim().length > 0 &&
      typeof chrome !== 'undefined' &&
      typeof chrome.identity?.launchWebAuthFlow === 'function'
    ) {
      return await this.loginWithCustomClientId(clientId.trim())
    }

    // Default: Chrome Extension getAuthToken
    const token = await this.getValidToken(true)
    if (!token) {
      throw new Error('Tidak dapat memperoleh token otentikasi dari Google.')
    }

    const profile = await this.fetchUserProfile(token)
    await this.saveAuthSuccess(token, profile)

    return { token, profile }
  }

  /**
   * Login using launchWebAuthFlow for custom GCP Client IDs
   */
  private static async loginWithCustomClientId(clientId: string): Promise<AuthResult> {
    const redirectUrl = chrome.identity.getRedirectURL()
    const scopes = encodeURIComponent(
      'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
    )
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&response_type=token&redirect_uri=${encodeURIComponent(
      redirectUrl
    )}&scope=${scopes}&prompt=consent`

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        async (responseUrl) => {
          if (chrome.runtime.lastError || !responseUrl) {
            return reject(
              new Error(chrome.runtime.lastError?.message || 'Login Google dibatalkan.')
            )
          }

          try {
            // Parse access_token from response hash
            const url = new URL(responseUrl)
            const hashParams = new URLSearchParams(url.hash.substring(1))
            const accessToken = hashParams.get('access_token')
            const expiresIn = hashParams.get('expires_in')

            if (!accessToken) {
              return reject(new Error('Format respons Google OAuth tidak valid.'))
            }

            const expiresAt = expiresIn ? Date.now() + Number(expiresIn) * 1000 : 0
            const profile = await this.fetchUserProfile(accessToken)

            await this.saveAuthSuccess(accessToken, profile, clientId, expiresAt)
            resolve({ token: accessToken, profile })
          } catch (err) {
            reject(err)
          }
        }
      )
    })
  }

  /**
   * Invalidate/remove cached token locally and remotely
   */
  static async invalidateToken(token: string): Promise<void> {
    if (this.isIdentityAvailable() && token && token !== 'demo_mock_token_12345') {
      try {
        await new Promise<void>((resolve) => {
          chrome.identity.removeCachedAuthToken({ token }, () => resolve())
        })
      } catch (err) {
        console.warn('[GoogleAuthService] Failed to remove cached auth token:', err)
      }
    }
    this.cachedToken = null
  }

  /**
   * Logout flow: revoke token and clean storage state
   */
  static async logout(): Promise<void> {
    const settings = await storageService.get<AppSettings>(
      STORAGE_KEYS.SETTINGS,
      {} as AppSettings
    )

    const token = this.cachedToken || settings.googleAccessToken

    if (token && token !== 'demo_mock_token_12345') {
      try {
        // Revoke token remotely
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).catch(() => {})
      } catch {
        // Non-fatal if offline
      }
      await this.invalidateToken(token)
    }

    // Reset settings state
    await storageService.set(STORAGE_KEYS.SETTINGS, {
      ...settings,
      googleAuthStatus: 'disconnected' as GoogleAuthStatus,
      googleUserEmail: '',
      googleUserName: '',
      googleUserAvatar: '',
      googleAccessToken: '',
      googleTokenExpiresAt: 0,
    })
  }

  /**
   * Verify current connection status and refresh user state if connected
   */
  static async checkAuthStatus(): Promise<{
    status: GoogleAuthStatus
    profile?: GoogleUserProfile
  }> {
    const settings = await storageService.get<AppSettings>(
      STORAGE_KEYS.SETTINGS,
      {} as AppSettings
    )

    if (settings.useDemoDriveMode) {
      return {
        status: 'connected',
        profile: {
          id: 'demo_user_001',
          email: 'pelamar.kerja@gmail.com',
          name: 'Ilham Fatahillah (Demo)',
          picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        },
      }
    }

    try {
      const token = await this.getValidToken(false)
      if (!token) {
        return { status: 'disconnected' }
      }

      const profile = await this.fetchUserProfile(token)
      await this.saveAuthSuccess(token, profile)
      return { status: 'connected', profile }
    } catch {
      return { status: 'disconnected' }
    }
  }

  /**
   * Persist successful authentication state to storage
   */
  private static async saveAuthSuccess(
    token: string,
    profile: GoogleUserProfile,
    clientId?: string,
    expiresAt?: number
  ): Promise<void> {
    const current = await storageService.get<AppSettings>(
      STORAGE_KEYS.SETTINGS,
      {} as AppSettings
    )

    const updated: AppSettings = {
      ...current,
      googleAuthStatus: 'connected',
      googleUserEmail: profile.email,
      googleUserName: profile.name,
      googleUserAvatar: profile.picture,
      googleAccessToken: token,
      googleTokenExpiresAt: expiresAt || current.googleTokenExpiresAt,
    }

    if (clientId) {
      updated.googleClientId = clientId
    }

    await storageService.set(STORAGE_KEYS.SETTINGS, updated)
    this.cachedToken = token
  }
}
