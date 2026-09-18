import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setupChromeMock } from '../mocks/chrome'
import { CVSyncService } from '@/services/cvSync'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import { GoogleDriveService, DEMO_DOC_TEXT } from '@/services/googleDrive'
import type { CVProfile } from '@/types/cv'

describe('CVSyncService Unit Tests', () => {
  let initialProfile: CVProfile

  beforeEach(async () => {
    setupChromeMock()

    initialProfile = {
      id: 'cv_sync_test_001',
      fileName: 'My_CV_2026.pdf',
      fileId: 'drive_file_id_777',
      source: 'google_drive',
      mimeType: 'application/pdf',
      driveModifiedTime: '2026-09-01T12:00:00Z',
      lastModified: '2026-09-01T12:00:00Z',
      parsedAt: '2026-09-01T12:05:00Z',
      rawText: 'Senior Frontend Developer with Vue experience.',
      headline: 'Senior Frontend Developer',
      skills: [{ category: 'Frontend', items: ['Vue.js'] }],
      experiences: [],
      educations: [],
    }

    await storageService.set(STORAGE_KEYS.CV_PROFILE, initialProfile)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should detect when Google Drive file has a newer modifiedTime', async () => {
    vi.spyOn(GoogleDriveService, 'getFileMetadata').mockResolvedValue({
      id: 'drive_file_id_777',
      name: 'My_CV_2026.pdf',
      mimeType: 'application/pdf',
      modifiedTime: '2026-09-18T08:00:00Z', // newer than 2026-09-01
      size: '150000',
    })

    const check = await CVSyncService.checkDriveUpdate('mock_token', initialProfile)
    expect(check.hasUpdate).toBe(true)
    expect(check.remoteModifiedTime).toBe('2026-09-18T08:00:00Z')
    expect(check.message).toContain('Ditemukan versi CV yang lebih baru')
  })

  it('should detect when local CV is already up-to-date with Drive', async () => {
    vi.spyOn(GoogleDriveService, 'getFileMetadata').mockResolvedValue({
      id: 'drive_file_id_777',
      name: 'My_CV_2026.pdf',
      mimeType: 'application/pdf',
      modifiedTime: '2026-09-01T12:00:00Z', // identical time
      size: '150000',
    })

    const check = await CVSyncService.checkDriveUpdate('mock_token', initialProfile)
    expect(check.hasUpdate).toBe(false)
    expect(check.message).toContain('sudah menggunakan versi terbaru')
  })

  it('should return hasUpdate: false if CV is from manual_paste source', async () => {
    const manualCV: CVProfile = {
      ...initialProfile,
      source: 'manual_paste',
      fileId: undefined,
    }

    const check = await CVSyncService.checkDriveUpdate('mock_token', manualCV)
    expect(check.hasUpdate).toBe(false)
    expect(check.message).toContain('manual')
  })

  it('should sync and update local CV profile when syncWithDrive is called', async () => {
    vi.spyOn(GoogleDriveService, 'downloadFileContent').mockResolvedValue({
      fileId: 'drive_file_id_777',
      fileName: 'My_CV_2026_Updated.gdoc',
      mimeType: 'application/vnd.google-apps.document',
      modifiedTime: '2026-09-18T09:30:00Z',
      checksum: 'new_md5_hash_999',
      content: DEMO_DOC_TEXT,
    })

    const result = await CVSyncService.syncWithDrive('mock_token', initialProfile)
    expect(result.status).toBe('updated')
    expect(result.updatedProfile).toBeDefined()
    expect(result.updatedProfile?.driveModifiedTime).toBe('2026-09-18T09:30:00Z')

    // Verify storage persistence
    const savedInStorage = await storageService.get<CVProfile | null>(STORAGE_KEYS.CV_PROFILE, null)
    expect(savedInStorage).not.toBeNull()
    expect(savedInStorage?.driveModifiedTime).toBe('2026-09-18T09:30:00Z')
    expect(savedInStorage?.skills.length).toBeGreaterThan(0)
  })
})
