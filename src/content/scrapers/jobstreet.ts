import type { JobScraper, ScrapeResult } from './types'
import { queryText, processScrapedContent, domToFormattedText } from './utils'
import { cleanDomElement } from '@/utils/sanitizer'
import { UniversalScraper } from './universal'

export class JobstreetScraper implements JobScraper {
  readonly platform = 'jobstreet' as const
  readonly name = 'Jobstreet / SEEK'

  matches(url: string): boolean {
    return (
      /(?:jobstreet|jobsdb)\.(?:co\.id|com|com\.sg|com\.my|com\.ph|com\.hk)|id\.jobstreet\.com|my\.jobstreet\.com|sg\.jobstreet\.com|ph\.jobstreet\.com|seek\.(?:com\.au|co\.nz)/i.test(
        url
      )
    )
  }

  extract(doc: Document, url: string): ScrapeResult | null {
    // 0. State Script & JSON-LD Extraction (Tier 1: Instant, complete data from SEEK GraphQL/Redux cache)
    const stateResult = this.extractFromStateScript(doc, url)
    if (
      stateResult &&
      stateResult.title &&
      stateResult.description &&
      stateResult.description.trim().length > 50 &&
      !stateResult.description.includes('tidak ditemukan')
    ) {
      return stateResult
    }

    // 1. Job Title
    const title = queryText(doc, [
      '[data-automation="job-detail-title"]',
      'h1[data-automation="job-header-title"]',
      'h1[data-automation="jobTitle"]',
      'h1[data-automation="job-title"]',
      '[data-testid="job-detail-title"]',
      '[data-testid="job-title"]',
      '[data-automation="jobDetailsPage"] h1',
      '[data-automation="splitViewDetails"] h1',
      '[data-automation="jobAdDetails"] h1',
      '[data-automation="splitViewDetails"] [data-automation*="title"]',
      '[data-automation="jobDetailsPage"] [data-automation*="title"]',
      'article h1',
    ])

    if (!title) return null

    // 2. Company Name
    const company = queryText(doc, [
      '[data-automation="jobDetailsPage"] [data-automation="advertiser-name"]',
      '[data-automation="splitViewDetails"] [data-automation="advertiser-name"]',
      '[data-automation="detailsTitle"] span',
      '[data-automation="advertiser-name"]',
      'span[data-automation="job-header-company-name"]',
      'a[data-automation="job-header-company-name"]',
      '[data-automation="job-company"]',
      '[data-automation="jobCompany"]',
      '[data-automation="company-name"]',
      '[data-testid="advertiser-name"]',
      '[data-testid="job-company"]',
    ])

    // 3. Location
    const location = queryText(doc, [
      '[data-automation="jobDetailsPage"] [data-automation="job-detail-location"]',
      '[data-automation="splitViewDetails"] [data-automation="job-detail-location"]',
      '[data-automation="job-detail-location"]',
      'span[data-automation="job-detail-location"]',
      '[data-automation="job-header-location"]',
      '[data-automation="job-location"]',
      '[data-automation="jobLocation"]',
      '[data-testid="job-detail-location"]',
    ])

    // 4. Job Highlights (if available on SEEK/Jobstreet)
    let highlightsText = ''
    const highlightsEl = doc.querySelector(
      '[data-automation="job-details-job-highlights"], [data-automation="job-highlights"]'
    )
    if (highlightsEl) {
      const cloned = highlightsEl.cloneNode(true) as Element
      cleanDomElement(cloned)
      const text = cloned.textContent?.trim() || ''
      if (text.length > 10) {
        highlightsText = `Poin Utama & Keuntungan:\n${text}\n\n`
      }
    }

    // 5. Job Description - Multi-Tier Selection (SEEK & Jobstreet modern architecture)
    const descSelectors = [
      '[data-automation="jobAdDetails"]',
      '[data-automation="jobDescription"]',
      '[data-automation="splitViewDetails"] [data-automation="jobAdDetails"]',
      '[data-automation="jobDetailsPage"] [data-automation="jobAdDetails"]',
      '[data-automation="splitViewDetails"] [data-automation="jobDescription"]',
      '[data-automation="jobDetailsPage"] [data-automation="jobDescription"]',
      '[data-automation="job-detail-job-description"]',
      '[data-automation="job-details-job-description"]',
      '[data-automation="job-detail-work-requirements"]',
      '[data-automation="job-detail-responsibilities"]',
      '[data-automation="job-details"]',
      '[data-automation="jobDetails"]',
      '[data-automation="desktop-job-details"]',
      '[data-automation="mobile-job-details"]',
      '[data-testid="job-ad-details"]',
      '[data-testid="job-description"]',
      '[data-testid="job-details"]',
      '#jobDescription',
      '[class*="jobAdDetails"]',
      '[class*="jobDescription"]',
      '[class*="job-description"]',
      '[class*="jobDetails"]',
      '[class*="job-details"]',
    ]

    let rawDesc = ''

    for (const selector of descSelectors) {
      try {
        const el = doc.querySelector(selector)
        if (el) {
          const text = domToFormattedText(el)
          if (text.length > 30) {
            rawDesc = text
            break
          }
        }
      } catch {
        // Continue to next selector
      }
    }

    // Fallback A: Heading-based section search (climb up DOM hierarchy)
    if (!rawDesc || rawDesc.length < 50) {
      const headingRegex =
        /deskripsi|job description|rincian pekerjaan|tanggung jawab|responsibilities|persyaratan|requirements|kualifikasi|qualifications|about the role|tentang pekerjaan/i
      const headings = Array.from(doc.querySelectorAll('h2, h3, h4, h5, strong, b, p, span, div[class*="heading"]'))

      for (const h of headings) {
        if (headingRegex.test(h.textContent || '') && (h.textContent?.trim().length || 0) < 60) {
          // Walk up to find the enclosing section/container that contains the actual body text
          let container: Element | null = h.parentElement
          while (container && container !== doc.body && (container.textContent?.trim().length || 0) < 120) {
            container = container.parentElement
          }

          if (container && container !== doc.body) {
            const text = domToFormattedText(container)
            if (text.length > 50) {
              rawDesc = text
              break
            }
          }
        }
      }
    }

    // Fallback B: Contextual right-pane container search around job title
    if (!rawDesc || rawDesc.length < 50) {
      const h1List = Array.from(doc.querySelectorAll('h1, [data-automation*="title"], [data-testid*="title"]'))
      for (const heading of h1List) {
        let parent: Element | null = heading.parentElement
        while (parent && parent !== doc.body && (parent.textContent?.trim().length || 0) < 250) {
          parent = parent.parentElement
        }
        if (parent && parent !== doc.body) {
          const text = domToFormattedText(parent)
          if (text.length > 80) {
            rawDesc = text
            break
          }
        }
      }
    }

    // Fallback C: Contextual main/article container search
    if (!rawDesc || rawDesc.length < 50) {
      const contextualParent = doc.querySelector('[data-automation="splitViewDetails"], [data-automation="jobDetailsPage"]')
      if (contextualParent) {
        const text = domToFormattedText(contextualParent)
        if (text.length > 50) {
          rawDesc = text
        }
      }
    }

    // Combine Highlights if available
    if (highlightsText && !rawDesc.includes(highlightsText.trim())) {
      rawDesc = highlightsText + rawDesc
    }

    // Final Fallback: If specialized extraction still yields < 40 chars, invoke UniversalScraper heuristic
    if (!rawDesc || rawDesc.trim().length < 40) {
      try {
        const universal = new UniversalScraper()
        const uResult = universal.extract(doc, url)
        if (
          uResult &&
          uResult.description &&
          uResult.description.length > 40 &&
          !uResult.description.includes('tidak ditemukan')
        ) {
          rawDesc = uResult.description
        }
      } catch {
        // Ignore universal fallback error
      }
    }

    // If still completely empty
    if (!rawDesc.trim()) {
      rawDesc = 'Deskripsi pekerjaan tidak ditemukan'
    }

    const processed = processScrapedContent({
      title,
      company: company || 'Perusahaan di Jobstreet',
      location,
      description: rawDesc,
      url,
    })

    return {
      platform: this.platform,
      url,
      ...processed,
    }
  }

  /**
   * Extract job details directly from SEEK Redux / Apollo cache scripts or JSON-LD
   */
  private extractFromStateScript(doc: Document, url: string): ScrapeResult | null {
    try {
      const scripts = Array.from(doc.querySelectorAll('script'))
      if (scripts.length === 0) return null

      // Check for JSON-LD first
      for (const s of scripts) {
        if (s.type === 'application/ld+json') {
          try {
            const data = JSON.parse(s.textContent || '')
            if (data && (data['@type'] === 'JobPosting' || data.title)) {
              let cleanDesc = data.description || ''
              try {
                const tempDiv = doc.createElement('div')
                tempDiv.innerHTML = cleanDesc
                cleanDomElement(tempDiv)
                cleanDesc = tempDiv.textContent?.trim() || cleanDesc
              } catch {
                cleanDesc = cleanDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
              }

              const processed = processScrapedContent({
                title: data.title,
                company: data.hiringOrganization?.name || 'Perusahaan di Jobstreet',
                location: data.jobLocation?.address?.addressLocality || data.jobLocation?.address?.addressRegion || 'Indonesia',
                description: cleanDesc,
                url,
              })
              return {
                platform: this.platform,
                url,
                ...processed,
              }
            }
          } catch {}
        }
      }

      // Check SEEK Apollo / Redux cache scripts
      const jobIdMatch = url.match(/[?&]jobId=(\d+)/i) || url.match(/\/job\/(\d+)/i)
      const targetJobId = jobIdMatch ? jobIdMatch[1] : null

      for (const s of scripts) {
        const text = s.textContent || ''
        if (!text.includes('content2') && !text.includes('jobTitle') && !text.includes('jobDetails')) {
          continue
        }

        if (targetJobId && !text.includes(targetJobId) && !text.includes('content2')) {
          continue
        }

        // 1. Extract Job Title
        let title = ''
        const titleRegexes = [
          targetJobId
            ? new RegExp(`"id"\\s*:\\s*"${targetJobId}"[\\s\\S]{0,1500}?"title"\\s*:\\s*"([^"]+)"`, 'i')
            : null,
          /"jobTitle"\s*:\s*"([^"]+)"/i,
          /"title"\s*:\s*"([^"]+)"/i,
        ].filter(Boolean) as RegExp[]

        for (const reg of titleRegexes) {
          const m = text.match(reg)
          if (m && m[1] && !m[1].startsWith('http') && m[1].length > 2 && m[1].length < 150) {
            title = m[1].trim()
            break
          }
        }

        // 2. Extract Company Name
        let company = ''
        const companyRegexes = [
          /"advertiserName"\s*:\s*"([^"]+)"/i,
          /"advertiser"\s*:\s*\{[^\}]*?"name(?:[^"]*)?"\s*:\s*"([^"]+)"/i,
          /"companyName"\s*:\s*"([^"]+)"/i,
        ]
        for (const reg of companyRegexes) {
          const m = text.match(reg)
          if (m && m[1] && m[1].length > 1 && m[1].length < 150) {
            company = m[1].trim()
            break
          }
        }

        // 3. Extract Location
        let location = ''
        const locationRegexes = [
          /"location"\s*:\s*\{[^\}]*?"label(?:[^"]*)?"\s*:\s*"([^"]+)"/i,
          /"jobWhere"\s*:\s*"([^"]+)"/i,
        ]
        for (const reg of locationRegexes) {
          const m = text.match(reg)
          if (m && m[1] && m[1].length > 1 && m[1].length < 100) {
            location = m[1].trim()
            break
          }
        }

        // 4. Extract Description HTML (content2 in SEEK)
        let descHtml = ''
        const content2Regex = /"content2(?:\([^)]*\))?"\s*:\s*"((?:\\.|[^"\\])*)"/
        const cMatch = text.match(content2Regex)
        if (cMatch && cMatch[1] && cMatch[1].length > 50) {
          try {
            descHtml = JSON.parse(`"${cMatch[1]}"`)
          } catch {
            descHtml = cMatch[1]
              .replace(/\\"/g, '"')
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '')
              .replace(/\\u002F/g, '/')
          }
        }

        // Fallback: abstract
        if (!descHtml || descHtml.length < 50) {
          const abstractMatch = text.match(/"abstract"\s*:\s*"([^"]+)"/i)
          if (abstractMatch && abstractMatch[1]) {
            descHtml = abstractMatch[1]
          }
        }

        // Only return if both title AND a non-empty description are available
        if (title && descHtml && descHtml.trim().length > 30) {
          const tempDiv = doc.createElement('div')
          tempDiv.innerHTML = descHtml
          const cleanDesc = domToFormattedText(tempDiv)

          const processed = processScrapedContent({
            title,
            company: company || 'Perusahaan di Jobstreet',
            location: location || 'Indonesia',
            description: cleanDesc,
            url,
          })

          return {
            platform: this.platform,
            url,
            ...processed,
          }
        }
      }
    } catch (err) {
      console.warn('[JobstreetScraper] State script extraction failed:', err)
    }
    return null
  }
}
