/**
 * Email Generator and Dispatch Type Definitions
 * Adheres to plans/ROADMAP_MILESTONES.md Milestone 5 and AI_ASSISTANT_GUARDRAILS.md
 */

export type EmailTone =
  | 'formal'
  | 'impact_focused'
  | 'concise_pitch'
  | 'project'
  | 'concise'

export type EmailLanguage = 'id' | 'en' | 'auto'

export interface GeneratedEmailTemplate {
  id: EmailTone
  title: string
  language: string
  subject: string
  body: string
  highlightedCvPoints?: string[]
  hallucinationWarnings?: string[]
}

export interface RawEmailTemplatesResponse {
  templates: Array<{
    id: string
    title: string
    language: string
    subject: string
    body: string
    highlighted_cv_points?: string[]
  }>
}

export interface EmailRefinementResult {
  revisedSubject: string
  revisedBody: string
  language: string
  changesSummary: string
  hallucinationWarnings?: string[]
}

export interface RawEmailRefinementResponse {
  revised_subject: string
  revised_body: string
  language: string
  changes_summary: string
}

export interface EmailDraft {
  id: string
  jobId?: string
  tone: EmailTone
  language?: EmailLanguage
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
  attachmentFileName?: string
  attachmentMimeType?: string
}

export interface EmailDispatchResult {
  success: boolean
  action: DispatchOption
  messageId?: string
  draftId?: string
  error?: string
  dispatchedAt: string
}

export interface EmailDispatchHistoryItem {
  id: string
  jobId?: string
  jobTitle?: string
  company?: string
  recipientEmail: string
  subject: string
  action: DispatchOption
  status: 'success' | 'failed'
  messageId?: string
  draftId?: string
  attachmentIncluded: boolean
  attachmentName?: string
  dispatchedAt: string
  error?: string
}
