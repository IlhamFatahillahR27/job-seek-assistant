/**
 * Sanitizer & Anti-Prompt Injection Utilities
 * Cleans extracted web content, neutralizes indirect prompt injection,
 * and extracts valid recruiter contact emails.
 */

/**
 * Common dummy/placeholder email patterns to filter out
 */
const IGNORED_EMAIL_DOMAINS = [
  'example.com',
  'domain.com',
  'test.com',
  'placeholder.com',
  'email.com',
  'sentry.io',
  'w3.org',
]

/**
 * Patterns associated with indirect prompt injection in job descriptions
 */
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/gi,
  /abaikan\s+(?:semua\s+)?instruksi\s+(?:sebelumnya|awal)/gi,
  /disregard\s+(?:all\s+)?(?:previous|prior)\s+instructions/gi,
  /forget\s+(?:all\s+)?(?:previous|prior)\s+instructions/gi,
  /(?:system\s*prompt|system\s*instruction)\s*:/gi,
  /you\s+must\s+(?:recommend|hire|rate)\s+this\s+candidate/gi,
  /give\s+(?:a\s+)?(?:100%|maximum|full)\s+(?:match\s+)?score/gi,
  /berikan\s+skor\s+(?:100%|sempurna|maksimal)/gi,
  /<\/?(?:system|user|assistant)[^>]*>/gi,
]

/**
 * Remove hidden elements, navigation, scripts, styles, and ads from a cloned DOM element
 */
export function cleanDomElement(element: Element): void {
  // Elements to unconditionally remove
  const tagsToRemove = [
    'script',
    'style',
    'noscript',
    'iframe',
    'svg',
    'canvas',
    'nav',
    'footer',
    'header',
    'aside',
  ]

  tagsToRemove.forEach((tag) => {
    const nodes = element.querySelectorAll(tag)
    nodes.forEach((node) => node.remove())
  })

  // Selectors matching ads, cookie consent, dialogs, and hidden attributes
  const selectorsToRemove = [
    '[hidden]',
    '[aria-hidden="true"]',
    '[class*="cookie"]',
    '[id*="cookie"]',
    '[class*="advertisement"]',
    '[class*="ad-container"]',
    '[class*="nav-menu"]',
    '[class*="social-share"]',
    '[class*="modal"]',
  ]

  selectorsToRemove.forEach((selector) => {
    try {
      const nodes = element.querySelectorAll(selector)
      nodes.forEach((node) => node.remove())
    } catch {
      // Ignore invalid selector on edge environments
    }
  })

  // Remove elements with inline styling indicating hidden text (potential prompt injection)
  const allElements = element.querySelectorAll('*')
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement
    const styleAttr = htmlEl.getAttribute('style') || ''
    const lowerStyle = styleAttr.toLowerCase().replace(/\s+/g, '')

    if (
      lowerStyle.includes('display:none') ||
      lowerStyle.includes('visibility:hidden') ||
      lowerStyle.includes('opacity:0') ||
      lowerStyle.includes('font-size:0') ||
      lowerStyle.includes('color:transparent') ||
      lowerStyle.includes('left:-9999px')
    ) {
      htmlEl.remove()
      return
    }

    // Check computed style if available in browser context
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      try {
        const computed = window.getComputedStyle(htmlEl)
        if (
          computed.display === 'none' ||
          computed.visibility === 'hidden' ||
          computed.opacity === '0' ||
          computed.fontSize === '0px'
        ) {
          htmlEl.remove()
        }
      } catch {
        // Continue if getComputedStyle is unsupported
      }
    }
  })
}

/**
 * Clean job description text:
 * - Strip zero-width & invisible unicode characters
 * - Normalize spaces and newlines
 * - Trim excess whitespace
 */
export function cleanJobText(text: string): string {
  if (!text) return ''

  let cleaned = text
    // Replace non-breaking spaces with normal spaces
    .replace(/\u00A0/g, ' ')
    // Remove zero-width characters and directional marks
    .replace(/[\u200B-\u200D\uFEFF\u2060\u200E\u200F]/g, '')
    // Standardize newlines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove null bytes and escape sequences
    .replace(/\0/g, '')

  // Normalize excessive blank lines (max 2 consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // Trim whitespace per line and overall
  cleaned = cleaned
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()

  return cleaned
}

/**
 * Neutralize indirect prompt injection attempts inside text content
 */
export function sanitizePromptInjection(text: string): string {
  if (!text) return ''

  // 1. Disarm XML / markdown tags that might collide with prompt context boundaries
  let sanitized = text
    .replace(/<\/?job_posting[^>]*>/gi, '[job_posting_tag]')
    .replace(/<\/?candidate_cv[^>]*>/gi, '[candidate_cv_tag]')

  // 2. Neutralize instruction injection phrases
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[Filtered Security Override]')
  }

  return sanitized
}

/**
 * Extract recruitment / recruiter contact email addresses from text
 */
export function extractEmailsFromText(text: string): string[] {
  if (!text) return []

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const matches = text.match(emailRegex) || []

  const unique = Array.from(new Set(matches.map((e) => e.toLowerCase().trim())))

  return unique.filter((email) => {
    // Avoid common file extension false positives
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(email)) return false

    // Filter out ignored domain names
    const domain = email.split('@')[1] || ''
    if (IGNORED_EMAIL_DOMAINS.includes(domain)) return false

    return true
  })
}
