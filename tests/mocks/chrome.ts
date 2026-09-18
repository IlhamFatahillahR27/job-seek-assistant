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
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    sidePanel: {
      setPanelBehavior: vi.fn().mockResolvedValue(undefined),
    },
  }

  ;(globalThis as any).chrome = chromeMock
  return chromeMock
}
