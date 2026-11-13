import type { JobPlatform, WorkplaceType } from '@/types/job'

export interface ScrapeResult {
  title: string
  company: string
  location?: string
  workplaceType?: WorkplaceType
  description: string
  requirements?: string
  recruiterEmail?: string
  platform: JobPlatform
  url: string
}

export interface JobScraper {
  readonly platform: JobPlatform
  readonly name: string
  matches(url: string, doc: Document): boolean
  extract(doc: Document, url: string): ScrapeResult | null
}
