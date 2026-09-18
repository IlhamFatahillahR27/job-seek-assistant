import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupChromeMock } from '../mocks/chrome'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import type { CVProfile } from '@/types/cv'
import type { AppSettings } from '@/types/settings'

describe('StorageService (with Chrome Extension Mock)', () => {
  beforeEach(() => {
    setupChromeMock()
  })

  it('should return default value when key does not exist', async () => {
    const defaultVal = { theme: 'light' }
    const result = await storageService.get('non_existent_key', defaultVal)
    expect(result).toEqual(defaultVal)
  })

  it('should set and retrieve a complex typed object (CVProfile)', async () => {
    const mockCV: CVProfile = {
      id: 'cv_test_1',
      fileName: 'Ilham_Resume.pdf',
      source: 'manual_paste',
      parsedAt: '2026-09-18T10:00:00Z',
      rawText: 'Experienced Senior Engineer in TypeScript and Vue 3.',
      skills: [{ category: 'Frontend', items: ['Vue 3', 'TypeScript'] }],
      experiences: [],
      educations: [],
    }

    await storageService.set(STORAGE_KEYS.CV_PROFILE, mockCV)
    const retrieved = await storageService.get<CVProfile | null>(STORAGE_KEYS.CV_PROFILE, null)

    expect(retrieved).not.toBeNull()
    expect(retrieved?.fileName).toBe('Ilham_Resume.pdf')
    expect(retrieved?.skills[0].items).toContain('Vue 3')
  })

  it('should set and retrieve AppSettings', async () => {
    const mockSettings: AppSettings = {
      geminiApiKey: 'AIzaSy_MockKey_12345',
      geminiModel: 'gemini-2.0-flash',
      googleAuthStatus: 'connected',
      googleUserEmail: 'user@example.com',
      theme: 'dark',
      activeTab: 'settings',
      autoExtractOnOpen: true,
    }

    await storageService.set(STORAGE_KEYS.SETTINGS, mockSettings)
    const retrieved = await storageService.get<AppSettings | null>(STORAGE_KEYS.SETTINGS, null)

    expect(retrieved?.geminiApiKey).toBe('AIzaSy_MockKey_12345')
    expect(retrieved?.theme).toBe('dark')
  })

  it('should remove a specific key from storage', async () => {
    await storageService.set('temp_key', 'temp_value')
    let val = await storageService.get('temp_key', null)
    expect(val).toBe('temp_value')

    await storageService.remove('temp_key')
    val = await storageService.get('temp_key', null)
    expect(val).toBeNull()
  })

  it('should clear all entries from storage', async () => {
    await storageService.set(STORAGE_KEYS.SETTINGS, { geminiApiKey: '123' })
    await storageService.set(STORAGE_KEYS.CV_PROFILE, { id: 'cv1' })

    await storageService.clear()

    const settings = await storageService.get(STORAGE_KEYS.SETTINGS, null)
    const cv = await storageService.get(STORAGE_KEYS.CV_PROFILE, null)

    expect(settings).toBeNull()
    expect(cv).toBeNull()
  })

  it('should trigger storage change listener when set is called', async () => {
    const listener = vi.fn()
    const unsubscribe = storageService.addChangeListener(listener)

    await storageService.set('test_listen_key', 'new_value')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        test_listen_key: expect.objectContaining({
          newValue: 'new_value',
        }),
      })
    )

    unsubscribe()
  })
})

describe('StorageService (Fallback to localStorage when chrome is undefined)', () => {
  beforeEach(() => {
    delete (globalThis as any).chrome
    window.localStorage.clear()
  })

  it('should store and read values via localStorage fallback', async () => {
    await storageService.set('fallback_key', { hello: 'world' })
    const result = await storageService.get<{ hello: string }>('fallback_key', { hello: 'none' })
    expect(result).toEqual({ hello: 'world' })
  })

  it('should remove items via localStorage fallback', async () => {
    await storageService.set('key_to_del', 123)
    await storageService.remove('key_to_del')
    const result = await storageService.get('key_to_del', 0)
    expect(result).toBe(0)
  })
})
