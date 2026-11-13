import type { JobScraper, ScrapeResult } from './types'
import { queryText, processScrapedContent, domToFormattedText } from './utils'

export class GlintsScraper implements JobScraper {
  readonly platform = 'glints' as const
  readonly name = 'Glints'

  matches(url: string): boolean {
    return /glints\.com/i.test(url)
  }

  extract(doc: Document, url: string): ScrapeResult | null {
    // 1. Job Title
    const title = queryText(doc, [
      'h1[data-testid="job-title"]',
      'h1[class*="TopFoldJobTitle"]',
      '[class*="TopFoldJobTitle"]',
      '[class*="JobOverviewHeaderTitle"]',
      'h1',
    ])

    if (!title) return null

    // 2. Company Name
    const company = queryText(doc, [
      '[data-testid="company-name"]',
      'a[href*="/companies/"]',
      '[class*="TopFoldCompanyName"]',
      '[class*="JobOverviewHeaderCompanyName"]',
      'a[class*="CompanyLink"]',
    ])

    // 3. Location
    const location = queryText(doc, [
      '[data-testid="job-location"]',
      '[class*="JobOverviewHeaderLocation"]',
      '[class*="TopFoldLocation"]',
      '[class*="JobDetailLocation"]',
    ])

    // 4. Description & Requirements Container
    const descContainers = [
      doc.querySelector('[data-testid="job-description"]'),
      doc.querySelector('[class*="JobDescriptionContainer"]'),
      doc.querySelector('[class*="JobDescriptionTab"]'),
      doc.querySelector('[class*="JobDescriptionSection"]'),
      doc.querySelector('#job-description'),
    ].filter(Boolean) as Element[]

    let rawDesc = ''
    if (descContainers.length > 0) {
      rawDesc = domToFormattedText(descContainers[0])
    }

    // Glints sometimes has a separate skills list
    const skillsElements = Array.from(
      doc.querySelectorAll('[data-testid="skill-tag"], [class*="SkillTag"], [class*="TagContainer"] span')
    )
    let skillsText = ''
    if (skillsElements.length > 0) {
      skillsText = 'Keahlian yang Dibutuhkan:\n' + skillsElements.map((el) => `- ${el.textContent?.trim()}`).join('\n')
    }

    const processed = processScrapedContent({
      title,
      company: company || 'Perusahaan di Glints',
      location,
      description: rawDesc || 'Deskripsi pekerjaan tidak ditemukan',
      requirements: skillsText,
      url,
    })

    return {
      platform: this.platform,
      url,
      ...processed,
    }
  }
}
