import type { WorkplaceType } from '@/types/job'
import { cleanJobText, sanitizePromptInjection, extractEmailsFromText } from '@/utils/sanitizer'

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
  const reqHeaderPattern = /(?:^|\n)(#{1,4}\s*)?(?:persyaratan|kualifikasi|requirements|qualifications|what\s+you(?:'ll|\s+will)\s+need|who\s+you\s+are|kriteria|skills\s*&\s*experience)[:\s]*\n/i
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
