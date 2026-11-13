import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupChromeMock } from '../mocks/chrome'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import { useEmailGenerator } from '@/composables/useEmailGenerator'
import type { CVProfile } from '@/types/cv'
import type { JobDetails } from '@/types/job'

const mockCV: CVProfile = {
  id: 'cv_123',
  source: 'google_drive',
  fileName: 'Test_User_Resume.pdf',
  fileId: 'gdrive_file_999',
  parsedAt: new Date().toISOString(),
  profileSummary: 'Senior Frontend Engineer with 5+ years experience.',
  rawText: `Test User
Senior Frontend Engineer
Keahlian: Vue.js 3, TypeScript, Tailwind CSS.
Pengalaman: Tech Titan Nusantara, meningkatkan performa web 45%.`,
  workHistory: [],
  skills: ['Vue 3', 'TypeScript'],
  education: [],
}

const mockJob: JobDetails = {
  id: 'job_456',
  url: 'https://glints.com/id/opportunities/jobs/123',
  title: 'Lead Frontend Developer',
  company: 'Nusantara Tech',
  description: 'Mencari Lead Frontend Developer untuk membangun platform web modern.',
  recruiterEmail: 'talent@nusantara.tech',
  platform: 'glints',
  extractedAt: new Date().toISOString(),
}

describe('useEmailGenerator Composable Unit Tests', () => {
  let chromeMock: any

  beforeEach(async () => {
    chromeMock = setupChromeMock()
    await storageService.clear()
    await storageService.set(STORAGE_KEYS.CV_PROFILE, mockCV)
    await storageService.set(STORAGE_KEYS.CURRENT_JOB, mockJob)
    await storageService.set(STORAGE_KEYS.SETTINGS, {
      useDemoGeminiMode: true,
      defaultEmailLanguage: 'id',
    })
  })

  it('should initialize and generate templates in Demo Mode', async () => {
    const {
      templates,
      activeTone,
      recipientEmail,
      subject,
      body,
      generateTemplates,
      initEmailState,
    } = useEmailGenerator()

    await initEmailState()
    expect(recipientEmail.value).toBe('talent@nusantara.tech')

    const generated = await generateTemplates(true)
    expect(generated).toHaveLength(3)
    expect(templates.value).toHaveLength(3)
    expect(activeTone.value).toBe('formal')
    expect(subject.value).toContain('Lamaran Posisi')
    expect(body.value).toContain('Vue 3')
  })

  it('should switch tones properly and update subject and body', async () => {
    const {
      activeTone,
      subject,
      body,
      selectTone,
      generateTemplates,
    } = useEmailGenerator()

    await generateTemplates(true)

    selectTone('impact_focused')
    expect(activeTone.value).toBe('impact_focused')
    expect(subject.value).toContain('Performa Web')

    selectTone('concise_pitch')
    expect(activeTone.value).toBe('concise_pitch')
    expect(subject.value).toContain('Aplikasi')
  })

  it('should refine draft based on user feedback', async () => {
    const {
      subject,
      body,
      changesSummary,
      generateTemplates,
      refineDraft,
    } = useEmailGenerator()

    await generateTemplates(true)
    const initialBody = body.value

    await refineDraft('Buat kalimat pembuka lebih ramah')
    expect(body.value).not.toBe(initialBody)
    expect(changesSummary.value).toBeDefined()
  })

  it('should send SEND_GMAIL_REQUEST for saveDraft and sendDirectly', async () => {
    const {
      recipientEmail,
      subject,
      body,
      includeAttachment,
      generateTemplates,
      saveDraft,
      sendDirectly,
    } = useEmailGenerator()

    await generateTemplates(true)
    recipientEmail.value = 'recruiter@company.com'
    subject.value = 'Valid Subject'
    body.value = 'Valid Body Content'
    includeAttachment.value = true

    // Mock chrome.runtime.sendMessage response
    chromeMock.runtime.sendMessage.mockResolvedValueOnce({
      type: 'SEND_GMAIL_SUCCESS',
      payload: {
        success: true,
        action: 'draft',
        draftId: 'draft_mock_abc',
        dispatchedAt: new Date().toISOString(),
      },
    })

    const draftResult = await saveDraft()
    expect(draftResult.success).toBe(true)
    expect(draftResult.draftId).toBe('draft_mock_abc')
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SEND_GMAIL_REQUEST',
        payload: expect.objectContaining({
          action: 'draft',
          attachmentFileId: 'gdrive_file_999',
        }),
      })
    )

    // Direct send
    chromeMock.runtime.sendMessage.mockResolvedValueOnce({
      type: 'SEND_GMAIL_SUCCESS',
      payload: {
        success: true,
        action: 'direct',
        messageId: 'msg_mock_xyz',
        dispatchedAt: new Date().toISOString(),
      },
    })

    const sendResult = await sendDirectly()
    expect(sendResult.success).toBe(true)
    expect(sendResult.messageId).toBe('msg_mock_xyz')
  })

  it('should validate email format before dispatching', async () => {
    const {
      recipientEmail,
      subject,
      body,
      saveDraft,
    } = useEmailGenerator()

    recipientEmail.value = 'invalid-email-format'
    subject.value = 'Subject'
    body.value = 'Body'

    await expect(saveDraft()).rejects.toThrow('Format alamat email penerima tidak valid.')
  })
})
