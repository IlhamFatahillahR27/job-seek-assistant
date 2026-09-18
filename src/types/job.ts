/**
 * Job Details and Extraction Type Definitions
 */

export type JobPlatform = 'linkedin' | 'glints' | 'jobstreet' | 'indeed' | 'custom'

export type WorkplaceType = 'Remote' | 'Hybrid' | 'On-site' | 'Unspecified'

export interface JobDetails {
  id: string
  url: string
  title: string
  company: string
  location?: string
  workplaceType?: WorkplaceType
  description: string
  requirements?: string
  recruiterEmail?: string
  platform: JobPlatform
  extractedAt: string
  rawHtml?: string
}

export interface JobExtractionStatus {
  status: 'idle' | 'extracting' | 'success' | 'error'
  error?: string
  data?: JobDetails
}
