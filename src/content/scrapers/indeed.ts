import type { JobScraper, ScrapeResult } from './types'
import { queryText, processScrapedContent } from './utils'
import { cleanDomElement } from '@/utils/sanitizer'

export class IndeedScraper implements JobScraper {
  readonly platform = 'indeed' as const
  readonly name = 'Indeed'

  matches(url: string): boolean {
    return /indeed\.com/i.test(url)
  }

  extract(doc: Document, url: string): ScrapeResult | null {
    // 1. Job Title
    const title = queryText(doc, [
      'h1[data-testid="jobsearch-JobInfoHeader-title"]',
      '.jobsearch-JobInfoHeader-title',
      'h1.jobsearch-JobInfoHeader-title',
      'h1',
    ])

    if (!title) return null

    // 2. Company Name
    const company = queryText(doc, [
      '[data-testid="inlineHeader-companyName"]',
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader',
      'div[data-testid="jobsearch-CompanyInfoContainer"] a',
      '.jobsearch-CompanyReview--heading',
    ])

    // 3. Location
    const location = queryText(doc, [
      '[data-testid="inlineHeader-companyLocation"]',
      '[data-testid="job-location"]',
      '.jobsearch-JobInfoHeader-companyLocation',
      'div[data-testid="jobsearch-JobInfoHeader-companyLocation"]',
    ])

    // 4. Job Description
    const descContainers = [
      doc.querySelector('#jobDescriptionText'),
      doc.querySelector('.jobsearch-jobDescriptionText'),
      doc.querySelector('[data-testid="jobsearch-JobComponent-description"]'),
    ].filter(Boolean) as Element[]

    let rawDesc = ''
    if (descContainers.length > 0) {
      const cloned = descContainers[0].cloneNode(true) as Element
      cleanDomElement(cloned)
      rawDesc = cloned.textContent || ''
    }

    const processed = processScrapedContent({
      title,
      company: company || 'Perusahaan di Indeed',
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
