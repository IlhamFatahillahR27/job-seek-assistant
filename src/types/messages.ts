/**
 * Chrome Message Passing Contracts
 * Strictly typed message definitions according to AI_DEVELOPER_RULES.md
 */

import type { JobDetails } from './job'
import type { SendEmailPayload } from './email'

export type ExtensionMessage =
  | { type: 'SCRAPE_JOB_PAGE' }
  | { type: 'SCRAPE_JOB_SUCCESS'; payload: JobDetails }
  | { type: 'GOOGLE_AUTH_REQUEST' }
  | { type: 'GOOGLE_AUTH_SUCCESS'; payload: { token: string; email: string; name?: string } }
  | { type: 'GOOGLE_LOGOUT_REQUEST' }
  | { type: 'SYNC_CV_REQUEST'; payload: { fileId: string } }
  | { type: 'SEND_GMAIL_REQUEST'; payload: SendEmailPayload }
  | { type: 'API_ERROR'; error: string }
