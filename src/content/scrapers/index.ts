import type { JobDetails } from '@/types/job'
import type { JobScraper, ScrapeResult } from './types'
import { LinkedInScraper } from './linkedin'
import { GlintsScraper } from './glints'
import { JobstreetScraper } from './jobstreet'
import { IndeedScraper } from './indeed'
import { UniversalScraper } from './universal'

/**
 * Registry of specialized scrapers
 * Ordered by specificity: dedicated portal scrapers first, heuristic universal fallback last.
 */
export const SCRAPER_REGISTRY: JobScraper[] = [
  new LinkedInScraper(),
  new GlintsScraper(),
  new JobstreetScraper(),
  new IndeedScraper(),
  new UniversalScraper(),
]

/**
 * Extract job details from the current document
 */
export function extractJobFromDocument(doc: Document, url: string): JobDetails {
  let scrapeResult: ScrapeResult | null = null

  // 1. Find matching specialized scraper
  for (const scraper of SCRAPER_REGISTRY) {
    if (scraper.matches(url, doc)) {
      try {
        const result = scraper.extract(doc, url)
        if (result && result.title && (result.description || result.requirements)) {
          scrapeResult = result
          break
        }
      } catch (err) {
        console.warn(`[JobScraper] Scraper "${scraper.name}" encountered an issue:`, err)
      }
    }
  }

  // 2. Fallback to Universal Scraper if specialized didn't yield a valid result
  if (!scrapeResult) {
    const universal = new UniversalScraper()
    scrapeResult = universal.extract(doc, url)
  }

  if (!scrapeResult || !scrapeResult.title) {
    throw new Error(
      'Tidak dapat menemukan rincian lowongan kerja pada halaman ini. Pastikan Anda berada di halaman detail lowongan atau gunakan input manual.'
    )
  }

  const jobDetails: JobDetails = {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    url: scrapeResult.url,
    title: scrapeResult.title,
    company: scrapeResult.company,
    location: scrapeResult.location,
    workplaceType: scrapeResult.workplaceType || 'Unspecified',
    description: scrapeResult.description,
    requirements: scrapeResult.requirements,
    recruiterEmail: scrapeResult.recruiterEmail,
    platform: scrapeResult.platform,
    extractedAt: new Date().toISOString(),
  }

  return jobDetails
}
