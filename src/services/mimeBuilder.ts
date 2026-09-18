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
   * Convert an ArrayBuffer or Uint8Array to a standard base64 string
   */
  static bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    let binary = ''
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
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
    // If ASCII only and no special characters, it can stay as is,
    // but wrapping in RFC 2047 ensures 100% UTF-8 character preservation across email clients
    const base64 = this.stringToBase64Utf8(headerValue)
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
    const encodedSubject = this.encodeHeaderUtf8(subject)

    const headers: string[] = [
      `To: ${to.trim()}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
    ]

    if (from && from.trim()) {
      headers.push(`From: ${from.trim()}`)
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
      `Content-Type: ${attachment.mimeType || 'application/pdf'}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
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
