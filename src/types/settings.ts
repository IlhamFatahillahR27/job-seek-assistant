/**
 * Extension Settings and Preferences Type Definitions
 */

export type ThemeMode = 'light' | 'dark' | 'system'

export type TabKey = 'analysis' | 'email' | 'cv' | 'settings'

export type GoogleAuthStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface AppSettings {
  geminiApiKey: string
  geminiModel: string
  googleAuthStatus: GoogleAuthStatus
  googleUserEmail?: string
  googleUserName?: string
  googleUserAvatar?: string
  theme: ThemeMode
  activeTab: TabKey
  autoExtractOnOpen: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
  googleAuthStatus: 'disconnected',
  googleUserEmail: '',
  googleUserName: '',
  googleUserAvatar: '',
  theme: 'light',
  activeTab: 'analysis',
  autoExtractOnOpen: false,
}
