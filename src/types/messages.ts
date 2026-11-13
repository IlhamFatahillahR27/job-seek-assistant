/**
 * Chrome Message Passing Contracts
 * Strictly typed message definitions according to AI_DEVELOPER_RULES.md
 */

import type { JobDetails } from './job'
import type { SendEmailPayload, EmailDispatchResult } from './email'
import type { GoogleDriveFileItem, CVProfile, CVSyncResult } from './cv'

export type ExtensionMessage =
  | { type: 'SCRAPE_JOB_PAGE' }
  | { type: 'SCRAPE_JOB_SUCCESS'; payload: JobDetails }
  | { type: 'GOOGLE_AUTH_REQUEST'; payload?: { interactive?: boolean; customClientId?: string } }
  | { type: 'GOOGLE_AUTH_SUCCESS'; payload: { token: string; email: string; name?: string; avatar?: string } }
  | { type: 'GOOGLE_AUTH_CHECK' }
  | { type: 'GOOGLE_LOGOUT_REQUEST' }
  | { type: 'DRIVE_LIST_FILES_REQUEST'; payload?: { query?: string } }
  | { type: 'DRIVE_LIST_FILES_SUCCESS'; payload: GoogleDriveFileItem[] }
  | { type: 'DRIVE_FETCH_CV_REQUEST'; payload: { fileId: string; fileName: string; mimeType: string } }
  | { type: 'DRIVE_FETCH_CV_SUCCESS'; payload: CVProfile }
  | { type: 'SYNC_CV_REQUEST'; payload?: { fileId?: string } }
  | { type: 'SYNC_CV_SUCCESS'; payload: CVSyncResult }
  | { type: 'SEND_GMAIL_REQUEST'; payload: SendEmailPayload }
  | { type: 'SEND_GMAIL_SUCCESS'; payload: EmailDispatchResult }
  | { type: 'API_ERROR'; error: string }
