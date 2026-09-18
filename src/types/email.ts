/**
 * Email Generator and Dispatch Type Definitions
 */

export type EmailTone = 'formal' | 'project' | 'concise'

export interface EmailDraft {
  id: string
  jobId?: string
  tone: EmailTone
  recipientEmail: string
  subject: string
  body: string
  includeCvAttachment: boolean
  createdAt: string
  updatedAt: string
}

export type DispatchOption = 'draft' | 'direct'

export interface SendEmailPayload {
  recipientEmail: string
  subject: string
  body: string
  action: DispatchOption
  attachmentFileId?: string
}

export interface EmailDispatchResult {
  success: boolean
  action: DispatchOption
  messageId?: string
  draftId?: string
  error?: string
  dispatchedAt: string
}
