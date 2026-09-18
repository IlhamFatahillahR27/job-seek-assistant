/**
 * Extension Settings and Preferences Type Definitions
 */

import type { GeminiModelInfo } from './analysis'
import type { EmailLanguage } from './email'

export type ThemeMode = 'light' | 'dark' | 'system'

export type TabKey = 'analysis' | 'email' | 'cv' | 'settings'

export type GoogleAuthStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface AppSettings {
  geminiApiKey: string
  geminiModel: string
  availableGeminiModels?: GeminiModelInfo[]
  geminiKeyValid?: boolean
  geminiKeyCheckedAt?: string
  useDemoGeminiMode?: boolean
  googleAuthStatus: GoogleAuthStatus
  googleUserEmail?: string
  googleUserName?: string
  googleUserAvatar?: string
  googleClientId?: string
  googleAccessToken?: string
  googleTokenExpiresAt?: number
  useDemoDriveMode: boolean
  defaultEmailLanguage?: EmailLanguage
  theme: ThemeMode
  activeTab: TabKey
  autoExtractOnOpen: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  availableGeminiModels: [],
  geminiKeyValid: false,
  geminiKeyCheckedAt: '',
  useDemoGeminiMode: false,
  googleAuthStatus: 'disconnected',
  googleUserEmail: '',
  googleUserName: '',
  googleUserAvatar: '',
  googleClientId: '',
  googleAccessToken: '',
  googleTokenExpiresAt: 0,
  useDemoDriveMode: false,
  defaultEmailLanguage: 'auto',
  theme: 'light',
  activeTab: 'analysis',
  autoExtractOnOpen: false,
}
