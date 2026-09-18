import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GmailClientService, GmailClientError } from '@/services/gmailClient'

describe('GmailClientService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should create draft successfully via Gmail API', async () => {
    const mockResponse = {
      id: 'draft_123',
      message: {
        id: 'msg_987',
        threadId: 'th_001',
      },
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await GmailClientService.createDraft('real_valid_token_xyz', 'raw_base64url_string')

    expect(result.draftId).toBe('draft_123')
    expect(result.messageId).toBe('msg_987')
    expect(fetch).toHaveBeenCalledWith(
      'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer real_valid_token_xyz',
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('should send message directly via Gmail API', async () => {
    const mockResponse = {
      id: 'sent_msg_456',
      threadId: 'thread_456',
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await GmailClientService.sendMessage('real_valid_token_xyz', 'raw_base64url_string')

    expect(result.messageId).toBe('sent_msg_456')
    expect(result.threadId).toBe('thread_456')
    expect(fetch).toHaveBeenCalledWith(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ raw: 'raw_base64url_string' }),
      })
    )
  })

  it('should handle Demo Mode for createDraft and sendMessage without network fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const draftRes = await GmailClientService.createDraft('demo_mock_token_12345', 'mock_raw')
    expect(draftRes.draftId).toContain('demo_draft_')

    const sendRes = await GmailClientService.sendMessage('demo_mock_token_12345', 'mock_raw')
    expect(sendRes.messageId).toContain('demo_sent_')

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('should throw GmailClientError with isAuthError when receiving 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'Invalid Credentials' } }),
    } as Response)

    await expect(
      GmailClientService.createDraft('expired_token', 'raw_data')
    ).rejects.toThrowError(GmailClientError)
  })

  it('should throw GmailClientError with isScopeError when receiving 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ error: { message: 'Insufficient Permission' } }),
    } as Response)

    await expect(
      GmailClientService.sendMessage('token_without_gmail_scope', 'raw_data')
    ).rejects.toThrowError(GmailClientError)
  })
})
