/**
 * Google Gmail API Client Service
 * Handles creating drafts (users.me.drafts.create) and sending direct messages (users.me.messages.send)
 * with base64url RFC 2822 payload, error handling, and demo simulation.
 */

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

export class GmailClientError extends Error {
  public status?: number
  public isAuthError: boolean
  public isScopeError: boolean
  public isOfflineError: boolean

  constructor(message: string, status?: number, isOffline = false) {
    super(message)
    this.name = 'GmailClientError'
    this.status = status
    this.isOfflineError = isOffline
    this.isAuthError = status === 401
    this.isScopeError = status === 403
  }
}

export interface GmailDraftResponse {
  draftId: string
  messageId?: string
}

export interface GmailSendResponse {
  messageId: string
  threadId?: string
}

export class GmailClientService {
  /**
   * Create a draft in the user's Gmail mailbox
   */
  static async createDraft(
    token: string,
    rawBase64Url: string
  ): Promise<GmailDraftResponse> {
    if (token === 'demo_mock_token_12345') {
      // Simulate demo network delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      return {
        draftId: `demo_draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        messageId: `demo_msg_${Date.now()}`,
      }
    }

    if (token !== 'demo_mock_token_12345' && typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new GmailClientError(
        'Koneksi internet terputus (offline). Tidak dapat menyimpan draf ke Gmail tanpa koneksi internet.',
        undefined,
        true
      )
    }

    const endpoint = `${GMAIL_API_BASE}/drafts`
    const payload = {
      message: {
        raw: rawBase64Url,
      },
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        await this.handleErrorResponse(res, 'menyimpan draf email')
      }

      const data = await res.json()
      return {
        draftId: data.id,
        messageId: data.message?.id,
      }
    } catch (err: any) {
      if (err instanceof GmailClientError) throw err
      const isOffline =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError')

      if (isOffline) {
        throw new GmailClientError(
          'Koneksi internet terputus (offline). Gagal menghubungi server Gmail.',
          undefined,
          true
        )
      }
      throw new GmailClientError(err.message || 'Gagal menyimpan draf ke Gmail.')
    }
  }

  /**
   * Send an email directly via Gmail API
   */
  static async sendMessage(
    token: string,
    rawBase64Url: string
  ): Promise<GmailSendResponse> {
    if (token === 'demo_mock_token_12345') {
      await new Promise((resolve) => setTimeout(resolve, 600))
      return {
        messageId: `demo_sent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        threadId: `demo_thread_${Date.now()}`,
      }
    }

    if (token !== 'demo_mock_token_12345' && typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new GmailClientError(
        'Koneksi internet terputus (offline). Tidak dapat mengirim email langsung tanpa koneksi internet.',
        undefined,
        true
      )
    }

    const endpoint = `${GMAIL_API_BASE}/messages/send`
    const payload = {
      raw: rawBase64Url,
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        await this.handleErrorResponse(res, 'mengirim email langsung')
      }

      const data = await res.json()
      return {
        messageId: data.id,
        threadId: data.threadId,
      }
    } catch (err: any) {
      if (err instanceof GmailClientError) throw err
      const isOffline =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError')

      if (isOffline) {
        throw new GmailClientError(
          'Koneksi internet terputus (offline). Gagal menghubungi server Gmail.',
          undefined,
          true
        )
      }
      throw new GmailClientError(err.message || 'Gagal mengirim email via Gmail.')
    }
  }

  /**
   * Process error responses from Gmail API
   */
  private static async handleErrorResponse(res: Response, actionDesc: string): Promise<never> {
    let errorDetail = res.statusText
    try {
      const errJson = await res.json()
      if (errJson?.error?.message) {
        errorDetail = errJson.error.message
      }
    } catch {
      // ignore
    }

    if (res.status === 401) {
      throw new GmailClientError(
        'Sesi Google telah kedaluwarsa. Silakan hubungkan ulang akun Google Workspace Anda.',
        401
      )
    }

    if (res.status === 403) {
      throw new GmailClientError(
        `Izin Gmail tidak mencukupi untuk ${actionDesc}. Pastikan Anda telah memberikan izin Gmail saat menghubungkan akun. Detail: ${errorDetail}`,
        403
      )
    }

    throw new GmailClientError(`Gagal ${actionDesc} (${res.status}): ${errorDetail}`, res.status)
  }
}
