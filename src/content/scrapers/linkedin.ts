import type { JobScraper, ScrapeResult } from './types'
import { queryText, processScrapedContent, detectWorkplaceType, domToFormattedText } from './utils'

export class LinkedInScraper implements JobScraper {
  readonly platform = 'linkedin' as const
  readonly name = 'LinkedIn Jobs'

  matches(url: string): boolean {
    return /linkedin\.com\/(jobs|in\/jobs)/i.test(url)
  }

  extract(doc: Document, url: string): ScrapeResult | null {
    // 1. Job Title
    const title = queryText(doc, [
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      'h1.topcard__title',
      'h1.top-card-layout__title',
      '.jobs-search__job-details h1',
      '.job-view-layout h1',
      'h1',
    ])

    if (!title) return null

    // 2. Company Name
    const company = queryText(doc, [
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
      'a.topcard__org-name-link',
      '.job-details-jobs-unified-top-card__primary-description a',
      '.jobs-unified-top-card__subtitle-primary-grouping a',
      '.topcard__flavor-row a',
      '[data-tracking-control-name="public_jobs_topcard-org-name"]',
    ])

    // 3. Location & Workplace Type
    const location = queryText(doc, [
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.job-details-jobs-unified-top-card__primary-description-container',
      '.jobs-unified-top-card__bullet',
      '.topcard__flavor--bullet',
      '.jobs-unified-top-card__workplace-type',
      'span.topcard__flavor--bullet',
    ])

    const workplaceSnippet = queryText(doc, [
      '.jobs-unified-top-card__workplace-type',
      '.job-details-jobs-unified-top-card__workplace-type',
      '.ui-label--accent-3',
    ])

    // 4. Job Description & Requirements
    const descContainers = [
      doc.querySelector('#job-details'),
      doc.querySelector('.jobs-description__content'),
      doc.querySelector('.jobs-description-content__text'),
      doc.querySelector('.jobs-box__html-content'),
      doc.querySelector('.show-more-less-html__markup'),
      doc.querySelector('.description__text'),
    ].filter(Boolean) as Element[]

    let rawDesc = ''
    if (descContainers.length > 0) {
      rawDesc = domToFormattedText(descContainers[0])
    }

    const workplace = workplaceSnippet
      ? detectWorkplaceType(workplaceSnippet)
      : detectWorkplaceType(location)

    const processed = processScrapedContent({
      title,
      company: company || 'Perusahaan tidak diketahui',
      location,
      workplaceType: workplace !== 'Unspecified' ? workplace : undefined,
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
