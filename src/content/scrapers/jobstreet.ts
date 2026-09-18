import type { JobScraper, ScrapeResult } from './types'
import { queryText, processScrapedContent } from './utils'
import { cleanDomElement } from '@/utils/sanitizer'

export class JobstreetScraper implements JobScraper {
  readonly platform = 'jobstreet' as const
  readonly name = 'Jobstreet / SEEK'

  matches(url: string): boolean {
    return /jobstreet\.(?:co\.id|com|com\.sg|com\.my|com\.ph)|seek\.com\.au/i.test(url)
  }

  extract(doc: Document, url: string): ScrapeResult | null {
    // 1. Job Title
    const title = queryText(doc, [
      '[data-automation="job-detail-title"]',
      'h1[data-automation="job-header-title"]',
      'h1[data-automation="jobTitle"]',
      '[data-automation="job-title"]',
      'h1',
    ])

    if (!title) return null

    // 2. Company Name
    const company = queryText(doc, [
      '[data-automation="advertiser-name"]',
      'span[data-automation="job-header-company-name"]',
      '[data-automation="job-company"]',
      '[data-automation="company-name"]',
    ])

    // 3. Location
    const location = queryText(doc, [
      '[data-automation="job-detail-location"]',
      '[data-automation="job-header-location"]',
      '[data-automation="job-location"]',
      'span[data-automation="job-detail-location"]',
    ])

    // 4. Job Description
    const descContainers = [
      doc.querySelector('[data-automation="jobDescription"]'),
      doc.querySelector('[data-automation="job-details"]'),
      doc.querySelector('[data-automation="job-detail-work-requirements"]'),
      doc.querySelector('#jobDescription'),
    ].filter(Boolean) as Element[]

    let rawDesc = ''
    if (descContainers.length > 0) {
      const cloned = descContainers[0].cloneNode(true) as Element
      cleanDomElement(cloned)
      rawDesc = cloned.textContent || ''
    }

    const processed = processScrapedContent({
      title,
      company: company || 'Perusahaan di Jobstreet',
      location,
      description: rawDesc || 'Deskripsi pekerjaan tidak ditemukan',
      url,
    })

    return {
      platform: this.platform,
      url,
      ...processed,
    }
  }
}
