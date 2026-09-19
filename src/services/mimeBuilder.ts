/**
 * RFC 2822 MIME Message Builder Service
 * Constructs standards-compliant MIME email messages supporting UTF-8 encoding,
 * RFC 2047 encoded Subject headers, multipart/mixed binary attachments,
 * and base64url encoding for Gmail API consumption.
 */

export interface MimeAttachment {
  filename: string
  mimeType: string
  data: ArrayBuffer | Uint8Array | string
}

export interface MimeMessageOptions {
  to: string
  subject: string
  body: string
  from?: string
  attachment?: MimeAttachment
}

export class MimeBuilderService {
  /**
   * Sanitize header values against CRLF injection (CWE-93)
   */
  static sanitizeHeaderValue(val: string): string {
    return (val || '').replace(/[\r\n]+/g, ' ').trim()
  }

  /**
   * Sanitize attachment filename against quote escaping and CRLF injection
   */
  static sanitizeFilename(filename: string): string {
    const stripped = this.sanitizeHeaderValue(filename).replace(/["\\]/g, '_')
    return stripped || 'attachment.pdf'
  }

  /**
   * Convert an ArrayBuffer or Uint8Array to a standard base64 string
   * Uses 32KB chunking to avoid maximum call stack errors and memory thrashing on large buffers
   */
  static bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    const len = bytes.byteLength
    const chunkSize = 0x8000 // 32KB chunk
    let binary = ''
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len))
      binary += String.fromCharCode.apply(null, chunk as unknown as number[])
    }
    return btoa(binary)
  }

  /**
   * Convert a UTF-8 string to a standard base64 string
   */
  static stringToBase64Utf8(str: string): string {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(str)
    return this.bufferToBase64(bytes)
  }

  /**
   * Base64url encode a string or Uint8Array (RFC 4648 URL-safe)
   * Replaces '+' with '-', '/' with '_', and removes trailing '='
   */
  static base64UrlEncode(input: string | Uint8Array): string {
    let base64 = ''
    if (typeof input === 'string') {
      base64 = this.stringToBase64Utf8(input)
    } else {
      base64 = this.bufferToBase64(input)
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  /**
   * Encodes a header according to RFC 2047 (B-encoding) for non-ASCII safety
   */
  static encodeHeaderUtf8(headerValue: string): string {
    // Sanitize any newline before encoding
    const safeValue = this.sanitizeHeaderValue(headerValue)
    const base64 = this.stringToBase64Utf8(safeValue)
    return `=?UTF-8?B?${base64}?=`
  }

  /**
   * Splits a base64 string into 76-character lines according to RFC 2045 MIME spec
   */
  static chunkBase64(base64: string, chunkSize = 76): string {
    const regex = new RegExp(`.{1,${chunkSize}}`, 'g')
    const chunks = base64.match(regex)
    return chunks ? chunks.join('\r\n') : base64
  }

  /**
   * Build a raw RFC 2822 MIME message string
   */
  static buildRfc2822Raw(options: MimeMessageOptions): string {
    const { to, subject, body, from, attachment } = options
    const safeTo = this.sanitizeHeaderValue(to)
    const safeSubject = this.encodeHeaderUtf8(subject)

    const headers: string[] = [
      `To: ${safeTo}`,
      `Subject: ${safeSubject}`,
      'MIME-Version: 1.0',
    ]

    if (from && from.trim()) {
      const safeFrom = this.sanitizeHeaderValue(from)
      headers.push(`From: ${safeFrom}`)
    }

    if (!attachment) {
      // Simple text/plain message
      headers.push('Content-Type: text/plain; charset="UTF-8"')
      headers.push('Content-Transfer-Encoding: 8bit')

      return `${headers.join('\r\n')}\r\n\r\n${body}`
    }

    // Multipart/mixed message with attachment
    const boundary = `boundary_job_seek_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)

    // Prepare attachment base64 content
    let attachmentBase64 = ''
    if (typeof attachment.data === 'string') {
      attachmentBase64 = attachment.data.includes('\n')
        ? attachment.data.replace(/\r?\n/g, '')
        : attachment.data
    } else {
      attachmentBase64 = this.bufferToBase64(attachment.data)
    }
    const formattedAttachmentData = this.chunkBase64(attachmentBase64)
    const safeAttachmentFilename = this.sanitizeFilename(attachment.filename)

    const parts: string[] = [
      headers.join('\r\n'),
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      body,
      '',
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType || 'application/pdf'}; name="${safeAttachmentFilename}"`,
      `Content-Disposition: attachment; filename="${safeAttachmentFilename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      formattedAttachmentData,
      `--${boundary}--`,
      '',
    ]

    return parts.join('\r\n')
  }

  /**
   * Build an RFC 2822 message and encode it directly to base64url for Gmail API
   */
  static buildRfc2822Base64Url(options: MimeMessageOptions): string {
    const rawMime = this.buildRfc2822Raw(options)
    return this.base64UrlEncode(rawMime)
  }
}
