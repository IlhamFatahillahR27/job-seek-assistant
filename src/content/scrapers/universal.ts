import type { JobScraper, ScrapeResult } from './types'
import { queryText, processScrapedContent } from './utils'
import { cleanDomElement } from '@/utils/sanitizer'

/**
 * Universal Heuristic Scraper
 * Extracts job information from company career portals (Greenhouse, Lever, Workable, Ashby,
 * BambooHR, or custom enterprise career sites) by stripping noise and targeting semantic content.
 */
export class UniversalScraper implements JobScraper {
  readonly platform = 'custom' as const
  readonly name = 'Universal Career Page'

  matches(_url: string): boolean {
    return true // Universal fallback matches any web page
  }

  extract(doc: Document, url: string): ScrapeResult | null {
    // 1. Extract Position Title
    let title = this.extractTitle(doc)
    if (!title) {
      // If no title can be extracted, page is likely not a job posting
      return null
    }

    // 2. Extract Company Name
    const company = this.extractCompany(doc, url)

    // 3. Extract Location
    const location = this.extractLocation(doc)

    // 4. Extract Main Job Description Container
    const description = this.extractMainContent(doc)

    const processed = processScrapedContent({
      title,
      company: company || 'Perusahaan',
      location,
      description: description || 'Deskripsi pekerjaan tidak ditemukan',
      url,
    })

    return {
      platform: this.platform,
      url,
      ...processed,
    }
  }

  private extractTitle(doc: Document): string {
    // Check h1 inside main/article first
    const contextualH1 = queryText(doc, [
      'main h1',
      'article h1',
      '[role="main"] h1',
      '[class*="job-title"]',
      '[class*="job_title"]',
      '[class*="jobTitle"]',
      '[class*="position-title"]',
      '[class*="posting-headline"] h2',
      'h1',
    ])
    if (contextualH1) return contextualH1

    // Check Open Graph title
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim()
    if (ogTitle) {
      return this.cleanTitleString(ogTitle)
    }

    // Check document title
    if (doc.title) {
      return this.cleanTitleString(doc.title)
    }

    return ''
  }

  private cleanTitleString(raw: string): string {
    // Remove typical site suffixes like " | Google Careers" or " - Job Application"
    return raw
      .replace(/\s*[-|–—:]\s*(?:careers|jobs|lowongan|hiring|karir|recruitment).*/i, '')
      .replace(/\s*[-|–—]\s*[^-|–—]+$/, '')
      .trim()
  }

  private extractCompany(doc: Document, url: string): string {
    // Check og:site_name
    const ogSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim()
    if (ogSite) return ogSite

    // Check dedicated company metadata or class
    const metaCompany = queryText(doc, [
      '[class*="company-name"]',
      '[class*="employer-name"]',
      '[class*="org-name"]',
      '[class*="posting-categories"] [class*="company"]',
    ])
    if (metaCompany) return metaCompany

    // Check application ATS platforms with URL structures
    try {
      const parsedUrl = new URL(url)
      const hostname = parsedUrl.hostname.toLowerCase()

      // Greenhouse: boards.greenhouse.io/<company>/jobs/...
      if (hostname.includes('greenhouse.io')) {
        const parts = parsedUrl.pathname.split('/').filter(Boolean)
        if (parts.length > 0 && parts[0] !== 'jobs') {
          return this.capitalize(parts[0])
        }
      }

      // Lever: jobs.lever.co/<company>/...
      if (hostname.includes('lever.co')) {
        const parts = parsedUrl.pathname.split('/').filter(Boolean)
        if (parts.length > 0) {
          return this.capitalize(parts[0])
        }
      }

      // Workable: apply.workable.com/<company>/...
      if (hostname.includes('workable.com')) {
        const parts = parsedUrl.pathname.split('/').filter(Boolean)
        if (parts.length > 0) {
          return this.capitalize(parts[0])
        }
      }

      // Ashby: jobs.ashbyhq.com/<company>/...
      if (hostname.includes('ashbyhq.com')) {
        const parts = parsedUrl.pathname.split('/').filter(Boolean)
        if (parts.length > 0) {
          return this.capitalize(parts[0])
        }
      }

      // Default: Clean company name from hostname (e.g. careers.shopee.com -> Shopee)
      const domainParts = hostname.split('.')
      const nonGeneric = domainParts.filter((p) => !['careers', 'jobs', 'www', 'com', 'co', 'id', 'org', 'io', 'net'].includes(p))
      if (nonGeneric.length > 0) {
        return this.capitalize(nonGeneric[0])
      }
    } catch {
      // Ignore URL parsing errors
    }

    return 'Perusahaan'
  }

  private extractLocation(doc: Document): string {
    return queryText(doc, [
      '[class*="location"]',
      '[data-testid*="location"]',
      '[class*="workplace"]',
      '[class*="posting-category"]',
      '[class*="job-info"] [class*="place"]',
    ])
  }

  private extractMainContent(doc: Document): string {
    // List of candidate main containers
    const candidates: Element[] = []

    const highPrioritySelectors = [
      '[class*="job-description"]',
      '[class*="job_description"]',
      '[class*="jobDescription"]',
      '[class*="posting-description"]',
      '[class*="role-description"]',
      '[id*="job-description"]',
      '[id*="jobDescription"]',
      'main',
      'article',
      '[role="main"]',
      '.content',
      '#content',
    ]

    for (const selector of highPrioritySelectors) {
      try {
        const els = Array.from(doc.querySelectorAll(selector))
        for (const el of els) {
          if (!candidates.includes(el)) {
            candidates.push(el)
          }
        }
      } catch {
        // Ignore selector errors
      }
    }

    // If no candidate found, fallback to body
    if (candidates.length === 0 && doc.body) {
      candidates.push(doc.body)
    }

    // Score candidates by text length and job-related keywords
    let bestText = ''
    let highestScore = -1

    const keywords = [
      'requirements',
      'responsibilities',
      'qualifications',
      'kualifikasi',
      'persyaratan',
      'tanggung jawab',
      'about the role',
      'skills',
      'what you will do',
      'experience',
      'we are looking for',
      'deskripsi',
      'benefit',
    ]

    for (const candidate of candidates) {
      const cloned = candidate.cloneNode(true) as Element
      cleanDomElement(cloned)

      const text = cloned.textContent || ''
      if (text.length < 50) continue

      let score = text.length
      const lowerText = text.toLowerCase()

      for (const kw of keywords) {
        if (lowerText.includes(kw)) {
          score += 500
        }
      }

      if (score > highestScore) {
        highestScore = score
        bestText = text
      }
    }

    return bestText
  }

  private capitalize(str: string): string {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/[-_]/g, ' ')
  }
}
