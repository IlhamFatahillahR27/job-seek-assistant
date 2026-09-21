import type { JobDetails } from '@/types/job'
import type { JobScraper, ScrapeResult } from './types'
import { LinkedInScraper } from './linkedin'
import { GlintsScraper } from './glints'
import { JobstreetScraper } from './jobstreet'
import { IndeedScraper } from './indeed'
import { UniversalScraper } from './universal'
import { extractPageVisibleText } from './utils'

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
  let fallbackCandidate: ScrapeResult | null = null

  // 1. Find matching specialized scraper
  for (const scraper of SCRAPER_REGISTRY) {
    if (scraper.matches(url, doc)) {
      try {
        const result = scraper.extract(doc, url)
        if (result && result.title) {
          if (!fallbackCandidate) {
            fallbackCandidate = result
          }
          const hasValidDesc =
            (result.description &&
              result.description.trim().length > 30 &&
              !result.description.includes('tidak ditemukan')) ||
            (result.requirements && result.requirements.trim().length > 30)

          if (hasValidDesc) {
            scrapeResult = result
            break
          }
        }
      } catch (err) {
        console.warn(`[JobScraper] Scraper "${scraper.name}" encountered an issue:`, err)
      }
    }
  }

  // 2. Fallback to Universal Scraper if specialized didn't yield a valid description
  if (!scrapeResult) {
    try {
      const universal = new UniversalScraper()
      const uResult = universal.extract(doc, url)
      if (uResult && uResult.title) {
        // If specialized scraper had better title/company/location, preserve it
        if (fallbackCandidate) {
          scrapeResult = {
            ...uResult,
            platform: fallbackCandidate.platform,
            title: fallbackCandidate.title || uResult.title,
            company:
              fallbackCandidate.company && !fallbackCandidate.company.includes('Perusahaan')
                ? fallbackCandidate.company
                : uResult.company,
            location: fallbackCandidate.location || uResult.location,
          }
        } else {
          scrapeResult = uResult
        }
      }
    } catch (uErr) {
      console.warn('[JobScraper] Universal scraper fallback encountered an issue:', uErr)
    }
  }

  // 3. Use fallback candidate if universal produced nothing
  if (!scrapeResult && fallbackCandidate) {
    scrapeResult = fallbackCandidate
  }

  const visibleText = extractPageVisibleText(doc)

  if (!scrapeResult || !scrapeResult.title) {
    if (visibleText && visibleText.length > 80) {
      return {
        id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        url,
        title: doc.title ? doc.title.split(/[-|–]/)[0].trim() : 'Lowongan Pekerjaan',
        company: 'Perusahaan',
        location: 'Lokasi tidak tertera',
        workplaceType: 'Unspecified',
        description: 'Deskripsi pekerjaan tidak ditemukan oleh DOM scraper.',
        requirements: '',
        recruiterEmail: '',
        platform: 'custom',
        extractedAt: new Date().toISOString(),
        rawPageText: visibleText,
        extractionMethod: 'dom',
      }
    }

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
    rawPageText: visibleText,
    extractionMethod: 'dom',
  }

  return jobDetails
}
