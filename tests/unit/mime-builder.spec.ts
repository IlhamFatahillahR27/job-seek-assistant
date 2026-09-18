import { describe, it, expect } from 'vitest'
import { MimeBuilderService } from '@/services/mimeBuilder'

describe('MimeBuilderService Unit Tests', () => {
  it('should base64url encode strings and Uint8Array without +, /, or =', () => {
    const plain = 'Hello world! Test & encode: >=<+/?'
    const encoded = MimeBuilderService.base64UrlEncode(plain)

    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
    expect(typeof encoded).toBe('string')
    expect(encoded.length).toBeGreaterThan(0)
  })

  it('should encode header to RFC 2047 UTF-8 B-encoding', () => {
    const header = 'Lamaran Pekerjaan: Senior Engineer — Ilham'
    const encoded = MimeBuilderService.encodeHeaderUtf8(header)

    expect(encoded.startsWith('=?UTF-8?B?')).toBe(true)
    expect(encoded.endsWith('?=')).toBe(true)
  })

  it('should build standard plain text RFC 2822 message without attachment', () => {
    const raw = MimeBuilderService.buildRfc2822Raw({
      to: 'recruiter@company.com',
      subject: 'Application for Frontend Engineer',
      body: 'Dear Hiring Team,\n\nI am applying for the role.\n\nBest regards.',
      from: 'applicant@gmail.com',
    })

    expect(raw).toContain('To: recruiter@company.com')
    expect(raw).toContain('From: applicant@gmail.com')
    expect(raw).toContain('Subject: =?UTF-8?B?')
    expect(raw).toContain('MIME-Version: 1.0')
    expect(raw).toContain('Content-Type: text/plain; charset="UTF-8"')
    expect(raw).toContain('Content-Transfer-Encoding: 8bit')
    expect(raw).toContain('Dear Hiring Team,\n\nI am applying for the role.')
  })

  it('should build multipart/mixed RFC 2822 message with binary PDF attachment', () => {
    const dummyPdf = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]) // %PDF-1.4

    const raw = MimeBuilderService.buildRfc2822Raw({
      to: 'hr@startup.io',
      subject: 'Senior Vue Architect - CV Attached',
      body: 'Please find my resume attached.',
      attachment: {
        filename: 'Ilham_Resume.pdf',
        mimeType: 'application/pdf',
        data: dummyPdf.buffer,
      },
    })

    expect(raw).toContain('Content-Type: multipart/mixed; boundary="boundary_job_seek_')
    expect(raw).toContain('Content-Type: text/plain; charset="UTF-8"')
    expect(raw).toContain('Please find my resume attached.')
    expect(raw).toContain('Content-Type: application/pdf; name="Ilham_Resume.pdf"')
    expect(raw).toContain('Content-Disposition: attachment; filename="Ilham_Resume.pdf"')
    expect(raw).toContain('Content-Transfer-Encoding: base64')
    // Check base64 of "%PDF-1.4" -> JVBERi0xLjQ=
    expect(raw).toContain('JVBERi0xLjQ=')
  })

  it('should generate valid base64url encoded output for Gmail API', () => {
    const base64Url = MimeBuilderService.buildRfc2822Base64Url({
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
    })

    expect(base64Url).toBeDefined()
    expect(base64Url).not.toContain('+')
    expect(base64Url).not.toContain('/')
    expect(base64Url).not.toContain('=')
  })
})
