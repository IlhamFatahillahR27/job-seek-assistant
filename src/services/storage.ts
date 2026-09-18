/**
 * Local Storage Service
 * Type-safe abstraction over chrome.storage.local with localStorage fallback
 * for development and testing environments.
 */

export const STORAGE_KEYS = {
  SETTINGS: 'job_seek_settings',
  CV_PROFILE: 'job_seek_cv_profile',
  CURRENT_JOB: 'job_seek_current_job',
  ANALYSIS_HISTORY: 'job_seek_analysis_history',
  EMAIL_DRAFTS: 'job_seek_email_drafts',
  THEME: 'job_seek_theme',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

export type StorageChangeListener = (changes: {
  [key: string]: { oldValue?: any; newValue?: any }
}) => void

class StorageService {
  private isChromeStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.local
    )
  }

  /**
   * Retrieve a value from storage with a fallback default value
   */
  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      if (this.isChromeStorageAvailable()) {
        const result = await chrome.storage.local.get(key)
        if (result && Object.prototype.hasOwnProperty.call(result, key)) {
          return result[key] as T
        }
        return defaultValue
      }

      // Fallback to localStorage (browser dev mode / testing)
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key)
        if (raw !== null) {
          try {
            return JSON.parse(raw) as T
          } catch {
            return raw as unknown as T
          }
        }
      }
    } catch (error) {
      console.error(`[StorageService] Error getting key "${key}":`, error)
    }
    return defaultValue
  }

  /**
   * Save a key-value pair to storage
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      if (this.isChromeStorageAvailable()) {
        await chrome.storage.local.set({ [key]: value })
        return
      }

      // Fallback to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    } catch (error) {
      console.error(`[StorageService] Error setting key "${key}":`, error)
      throw error
    }
  }

  /**
   * Remove a key from storage
   */
  async remove(key: string): Promise<void> {
    try {
      if (this.isChromeStorageAvailable()) {
        await chrome.storage.local.remove(key)
        return
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error(`[StorageService] Error removing key "${key}":`, error)
      throw error
    }
  }

  /**
   * Clear all job-seek storage entries
   */
  async clear(): Promise<void> {
    try {
      if (this.isChromeStorageAvailable()) {
        await chrome.storage.local.clear()
        return
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        // Clear only job seek keys or everything in dev mode
        Object.values(STORAGE_KEYS).forEach((k) => {
          window.localStorage.removeItem(k)
        })
      }
    } catch (error) {
      console.error('[StorageService] Error clearing storage:', error)
      throw error
    }
  }

  /**
   * Listen to storage change events
   * Returns an unsubscribe cleanup function
   */
  addChangeListener(listener: StorageChangeListener): () => void {
    if (this.isChromeStorageAvailable()) {
      const chromeListener = (
        changes: { [key: string]: chrome.storage.StorageChange },
        areaName: string
      ) => {
        if (areaName === 'local') {
          listener(changes)
        }
      }
      chrome.storage.onChanged.addListener(chromeListener)
      return () => chrome.storage.onChanged.removeListener(chromeListener)
    }

    // Fallback: window storage event
    if (typeof window !== 'undefined' && window.addEventListener) {
      const windowListener = (e: StorageEvent) => {
        if (e.key) {
          listener({
            [e.key]: {
              oldValue: e.oldValue ? JSON.parse(e.oldValue) : undefined,
              newValue: e.newValue ? JSON.parse(e.newValue) : undefined,
            },
          })
        }
      }
      window.addEventListener('storage', windowListener)
      return () => window.removeEventListener('storage', windowListener)
    }

    return () => {}
  }
}

export const storageService = new StorageService()
