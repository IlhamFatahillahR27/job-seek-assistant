import type { WorkplaceType } from '@/types/job'
import { cleanJobText, sanitizePromptInjection, extractEmailsFromText, cleanDomElement } from '@/utils/sanitizer'

/**
 * Safely find the first matching selector and return its trimmed text content
 */
export function queryText(root: ParentNode, selectors: string[]): string {
  for (const selector of selectors) {
    try {
      const el = root.querySelector(selector)
      if (el && el.textContent) {
        const text = el.textContent.trim()
        if (text.length > 0) {
          return text
        }
      }
    } catch {
      // Continue to next selector if selector is invalid in target environment
    }
  }
  return ''
}

/**
 * Safely find all matching elements and concatenate text content
 */
export function queryAllText(root: ParentNode, selectors: string[], separator = '\n'): string {
  for (const selector of selectors) {
    try {
      const elements = Array.from(root.querySelectorAll(selector))
      if (elements.length > 0) {
        const text = elements
          .map((el) => el.textContent?.trim() || '')
          .filter((t) => t.length > 0)
          .join(separator)
        if (text.length > 0) {
          return text
        }
      }
    } catch {
      // Continue
    }
  }
  return ''
}

/**
 * Detect workplace arrangement from text badges or description snippets
 */
export function detectWorkplaceType(text: string): WorkplaceType {
  const lower = text.toLowerCase()
  if (lower.includes('remote') || lower.includes('wfh') || lower.includes('daring') || lower.includes('jarak jauh')) {
    return 'Remote'
  }
  if (lower.includes('hybrid') || lower.includes('fleksibel') || lower.includes('flexible')) {
    return 'Hybrid'
  }
  if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('wfo') || lower.includes('luring') || lower.includes('di kantor')) {
    return 'On-site'
  }
  return 'Unspecified'
}

/**
 * Separate job description into main description and requirements if obvious headers exist
 */
export function splitRequirements(fullText: string): { description: string; requirements: string } {
  const reqHeaderPattern = /(?:^|\n)(#{1,4}\s*)?(?:persyaratan|kualifikasi|requirements|qualifications|what\s+you(?:'ll|\s+will)\s+need|who\s+you\s+are|about\s+you|kriteria|skills\s*&\s*experience)(?:[:\s]*\n|:\s+)/i
  const match = fullText.match(reqHeaderPattern)

  if (match && match.index !== undefined) {
    const descPart = fullText.slice(0, match.index).trim()
    const reqPart = fullText.slice(match.index).trim()
    return {
      description: descPart.length > 30 ? descPart : fullText,
      requirements: reqPart,
    }
  }

  return {
    description: fullText,
    requirements: '',
  }
}

/**
 * Sanitize and package scraped content
 */
export function processScrapedContent(params: {
  title: string
  company: string
  location?: string
  workplaceType?: WorkplaceType
  description: string
  requirements?: string
  recruiterEmail?: string
  url: string
}) {
  const cleanedTitle = cleanJobText(params.title)
  const cleanedCompany = cleanJobText(params.company)
  const cleanedLocation = cleanJobText(params.location || '')
  
  let cleanedDesc = cleanJobText(params.description)
  let cleanedReq = cleanJobText(params.requirements || '')

  // If requirements were empty, attempt intelligent split
  if (!cleanedReq && cleanedDesc) {
    const split = splitRequirements(cleanedDesc)
    cleanedDesc = split.description
    cleanedReq = split.requirements
  }

  // Neutralize prompt injection in text bodies
  const safeDesc = sanitizePromptInjection(cleanedDesc)
  const safeReq = sanitizePromptInjection(cleanedReq)

  // Find recruiter email if not explicitly provided
  let recruiterEmail = params.recruiterEmail?.trim()
  if (!recruiterEmail) {
    const detected = extractEmailsFromText(`${safeDesc}\n${safeReq}`)
    if (detected.length > 0) {
      recruiterEmail = detected[0]
    }
  }

  // Detect workplace type if unspecified
  const workplaceType =
    params.workplaceType && params.workplaceType !== 'Unspecified'
      ? params.workplaceType
      : detectWorkplaceType(`${cleanedLocation} ${safeDesc}`)

  return {
    title: cleanedTitle,
    company: cleanedCompany,
    location: cleanedLocation || 'Lokasi tidak tertera',
    workplaceType,
    description: safeDesc,
    requirements: safeReq,
    recruiterEmail: recruiterEmail || '',
  }
}

/**
 * Converts a DOM element to formatted plain text with preserved line breaks,
 * paragraph spacing, and bullet points for list items.
 */
export function domToFormattedText(element: Element): string {
  if (!element) return ''

  // 1. If in a real browser where innerText is available on an attached element,
  // innerText naturally reflects CSS layout, line breaks, and block elements.
  if (typeof (element as any).innerText === 'string' && (element as any).isConnected) {
    const raw = (element as any).innerText.trim()
    if (raw.includes('\n')) {
      return cleanJobText(raw)
    }
  }

  // 2. Structural DOM conversion preserving block elements & list bullets:
  const cloned = element.cloneNode(true) as Element
  cleanDomElement(cloned)

  // Replace <br> tags with newline
  const brTags = Array.from(cloned.querySelectorAll('br'))
  brTags.forEach((br) => {
    br.replaceWith('\n')
  })

  // Format list items with bullet point and newline
  const liTags = Array.from(cloned.querySelectorAll('li'))
  liTags.forEach((li) => {
    const text = li.textContent?.trim() || ''
    if (text) {
      li.textContent = `• ${text}\n`
    }
  })

  // Ensure paragraphs, headings, and table rows end with double newlines
  const blockTags = Array.from(cloned.querySelectorAll('p, h1, h2, h3, h4, h5, h6, tr, blockquote'))
  blockTags.forEach((block) => {
    block.append('\n\n')
  })

  // Ensure sections, divs, and articles end with newline
  const divTags = Array.from(cloned.querySelectorAll('div, section, article, ul, ol'))
  divTags.forEach((d) => {
    d.append('\n')
  })

  const text = cloned.textContent || ''
  return cleanJobText(text)
}

/**
 * Extract clean visible text of the active page/job container for AI analysis or fallback
 */
export function extractPageVisibleText(doc: Document): string {
  try {
    const target =
      doc.querySelector(
        '[data-automation="jobDetailsPage"], [data-automation="splitViewDetails"], [data-automation="jobAdDetails"], [data-automation="jobDescription"], [data-testid="job-details-pane"], main, article, [role="main"]'
      ) || doc.body

    if (!target) return ''

    let text = domToFormattedText(target)
    if (!text || text.length < 50) {
      text = (target as any).innerText || target.textContent || ''
    }

    const cleaned = cleanJobText(text)
    const safe = sanitizePromptInjection(cleaned)

    return safe.slice(0, 15000)
  } catch {
    return ''
  }
}


