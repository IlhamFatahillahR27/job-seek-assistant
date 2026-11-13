/**
 * Chrome API Mock for Vitest and Unit Testing
 */

import { vi } from 'vitest'

type ChangeListener = (
  changes: { [key: string]: { oldValue?: any; newValue?: any } },
  areaName: string
) => void

export class ChromeStorageMock {
  private store: Map<string, any> = new Map()
  private listeners: Set<ChangeListener> = new Set()

  async get(keys?: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }> {
    const result: { [key: string]: any } = {}

    if (!keys) {
      this.store.forEach((value, key) => {
        result[key] = value
      })
      return result
    }

    if (typeof keys === 'string') {
      if (this.store.has(keys)) {
        result[keys] = this.store.get(keys)
      }
      return result
    }

    if (Array.isArray(keys)) {
      for (const k of keys) {
        if (this.store.has(k)) {
          result[k] = this.store.get(k)
        }
      }
      return result
    }

    if (typeof keys === 'object') {
      for (const [k, defaultVal] of Object.entries(keys)) {
        result[k] = this.store.has(k) ? this.store.get(k) : defaultVal
      }
      return result
    }

    return result
  }

  async set(items: { [key: string]: any }): Promise<void> {
    const changes: { [key: string]: { oldValue?: any; newValue?: any } } = {}

    for (const [k, newVal] of Object.entries(items)) {
      const oldVal = this.store.get(k)
      this.store.set(k, newVal)
      changes[k] = { oldValue: oldVal, newValue: newVal }
    }

    this.notifyListeners(changes)
  }

  async remove(keys: string | string[]): Promise<void> {
    const keyList = Array.isArray(keys) ? keys : [keys]
    const changes: { [key: string]: { oldValue?: any; newValue?: any } } = {}

    for (const k of keyList) {
      if (this.store.has(k)) {
        const oldVal = this.store.get(k)
        this.store.delete(k)
        changes[k] = { oldValue: oldVal, newValue: undefined }
      }
    }

    this.notifyListeners(changes)
  }

  async clear(): Promise<void> {
    const changes: { [key: string]: { oldValue?: any; newValue?: any } } = {}
    this.store.forEach((val, k) => {
      changes[k] = { oldValue: val, newValue: undefined }
    })
    this.store.clear()
    this.notifyListeners(changes)
  }

  private notifyListeners(changes: { [key: string]: { oldValue?: any; newValue?: any } }) {
    for (const listener of this.listeners) {
      listener(changes, 'local')
    }
  }

  onChanged = {
    addListener: (cb: ChangeListener) => {
      this.listeners.add(cb)
    },
    removeListener: (cb: ChangeListener) => {
      this.listeners.delete(cb)
    },
    hasListener: (cb: ChangeListener) => this.listeners.has(cb),
  }

  _reset() {
    this.store.clear()
    this.listeners.clear()
  }
}

export function setupChromeMock() {
  const storageMock = new ChromeStorageMock()

  const chromeMock: any = {
    storage: {
      local: storageMock,
      onChanged: storageMock.onChanged,
    },
    runtime: {
      onInstalled: {
        addListener: vi.fn(),
      },
      sendMessage: vi.fn(),
      getManifest: vi.fn(() => ({
        version: '1.0.1',
        content_scripts: [{ js: ['assets/main.ts.js'] }],
      })),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    scripting: {
      executeScript: vi.fn().mockResolvedValue([]),
    },
    sidePanel: {
      setPanelBehavior: vi.fn().mockResolvedValue(undefined),
    },
    identity: {
      getAuthToken: vi.fn((options: any, callback: (token?: string) => void) => {
        callback('mock_oauth2_token_abc123')
      }),
      removeCachedAuthToken: vi.fn((details: any, callback?: () => void) => {
        if (callback) callback()
      }),
      launchWebAuthFlow: vi.fn((details: any, callback: (responseUrl?: string) => void) => {
        callback('https://mock-ext-id.chromiumapp.org/#access_token=mock_flow_token_999&expires_in=3600')
      }),
      getRedirectURL: vi.fn((path?: string) => `https://mock-ext-id.chromiumapp.org/${path || ''}`),
      getProfileUserInfo: vi.fn((details: any, callback: (user: any) => void) => {
        callback({ id: 'mock_user_1', email: 'pelamar@gmail.com' })
      }),
    },
    tabs: {
      query: vi.fn().mockResolvedValue([
        {
          id: 101,
          url: 'https://www.linkedin.com/jobs/view/123456789',
          active: true,
          currentWindow: true,
        },
      ]),
      sendMessage: vi.fn().mockResolvedValue({
        type: 'SCRAPE_JOB_SUCCESS',
        payload: {
          id: 'job_mock_1',
          url: 'https://www.linkedin.com/jobs/view/123456789',
          title: 'Senior Frontend Engineer',
          company: 'TechCorp Indonesia',
          location: 'Jakarta (Hybrid)',
          workplaceType: 'Hybrid',
          description: 'Mencari engineer berbakat dengan Vue 3 & TypeScript.',
          requirements: 'Pengalaman 3+ tahun di Vue.js.',
          recruiterEmail: 'hr@techcorp.id',
          platform: 'linkedin',
          extractedAt: new Date().toISOString(),
        },
      }),
    },
  }

  ;(globalThis as any).chrome = chromeMock
  return chromeMock
}
