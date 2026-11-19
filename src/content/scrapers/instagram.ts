import type { JobScraper, ScrapeResult } from './types'
import {
  processScrapedContent,
  domToFormattedText,
  detectWorkplaceType,
} from './utils'
import { cleanJobText, extractEmailsFromText } from '@/utils/sanitizer'

/**
 * Instagram Post Scraper
 * Extracts job captions, account author, location, and poster flyer images
 * from Instagram posts (/p/*, /reel/*).
 */
export class InstagramScraper implements JobScraper {
  readonly platform = 'instagram' as const
  readonly name = 'Instagram Post'

  matches(url: string): boolean {
    const lower = url.toLowerCase()
    return lower.includes('instagram.com/p/') || lower.includes('instagram.com/reel/') || lower.includes('instagram.com')
  }

  extract(doc: Document, url: string): ScrapeResult | null {
    // 1. Identify post container (modal dialog or article)
    const container =
      doc.querySelector('div[role="dialog"] article') ||
      doc.querySelector('div[role="dialog"]') ||
      doc.querySelector('article') ||
      doc.querySelector('main') ||
      doc.body

    // 2. Extract author/account name
    const author = this.extractAuthor(doc, container)

    // 3. Extract caption text
    const caption = this.extractCaption(doc, container)

    // 4. Extract poster images from post
    const posterImages = this.extractPosterImages(container)

    // 5. Extract company and position title from caption / metadata
    const { title, company } = this.extractTitleAndCompany(caption, author, doc)

    // 6. Detect recruiter email
    const emails = extractEmailsFromText(caption)
    const recruiterEmail = emails.length > 0 ? emails[0] : ''

    // 7. Detect location and workplace type
    const location = this.extractLocation(caption)
    const workplaceType = detectWorkplaceType(caption)

    const processed = processScrapedContent({
      title: title || 'Lowongan Kerja Instagram',
      company: company || (author ? `@${author}` : 'Perusahaan'),
      location,
      workplaceType,
      description: caption || 'Deskripsi postingan Instagram',
      recruiterEmail,
      url,
    })

    return {
      platform: this.platform,
      url,
      ...processed,
      posterImages: posterImages.length > 0 ? posterImages : undefined,
    }
  }

  private extractAuthor(doc: Document, container: Element): string {
    // Try header username link
    const authorEl =
      container.querySelector('header a[role="link"]') ||
      container.querySelector('header a') ||
      container.querySelector('a[role="link"] span')

    if (authorEl && authorEl.textContent) {
      return authorEl.textContent.trim().replace(/^@/, '')
    }

    // Try meta author / og:title
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim()
    if (ogTitle) {
      const match = ogTitle.match(/^([^•|–—]+?)\s+on Instagram/i)
      if (match && match[1]) {
        return match[1].trim().replace(/^@/, '')
      }
    }

    return ''
  }

  private extractCaption(doc: Document, container: Element): string {
    // 1. Try DOM caption elements (often inside h1, or span with dir="auto")
    const captionEl =
      container.querySelector('h1[dir="auto"]') ||
      container.querySelector('h1') ||
      container.querySelector('span[dir="auto"]') ||
      container.querySelector('div[class*="_a9zs"]')

    if (captionEl) {
      const text = domToFormattedText(captionEl)
      if (text && text.length > 30) {
        return text
      }
    }

    // 2. Try Open Graph meta description (frequently contains the full caption)
    const ogDesc =
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() ||
      doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()

    if (ogDesc) {
      // Instagram og:description format: "123 likes, 4 comments - username on date: "Actual caption here""
      const quoteMatch = ogDesc.match(/:\s*["“]([\s\S]+?)["”]?$/)
      if (quoteMatch && quoteMatch[1]) {
        return cleanJobText(quoteMatch[1])
      }
      return cleanJobText(ogDesc)
    }

    // 3. Fallback to container visible text
    const containerText = domToFormattedText(container)
    return containerText.slice(0, 3000)
  }

  private extractPosterImages(container: Element): string[] {
    const images: string[] = []
    const imgElements = Array.from(container.querySelectorAll('img'))

    for (const img of imgElements) {
      // Filter out user profile / avatar photos
      const alt = (img.getAttribute('alt') || '').toLowerCase()
      if (alt.includes('profile') || alt.includes('profil')) continue
      if (img.closest('header')) continue

      // Filter out very small icons
      const width = img.naturalWidth || img.width || 0
      const height = img.naturalHeight || img.height || 0
      if ((width > 0 && width < 180) || (height > 0 && height < 180)) continue

      // Pick highest resolution src (srcset or src)
      let bestSrc = img.currentSrc || img.src || img.getAttribute('src') || ''
      const srcset = img.getAttribute('srcset')
      if (srcset) {
        const candidates = srcset.split(',').map((s) => s.trim().split(/\s+/))
        if (candidates.length > 0) {
          // Take the last candidate in srcset which is usually highest res
          const lastCandidate = candidates[candidates.length - 1][0]
          if (lastCandidate) {
            bestSrc = lastCandidate
          }
        }
      }

      if (bestSrc && (bestSrc.startsWith('http') || bestSrc.startsWith('data:'))) {
        if (!images.includes(bestSrc)) {
          images.push(bestSrc)
        }
      }

      if (images.length >= 5) break
    }

    return images
  }

  private extractTitleAndCompany(
    caption: string,
    author: string,
    doc: Document
  ): { title: string; company: string } {
    let title = ''
    let company = ''

    // Detect company patterns in caption (e.g. "PT Wowrack Indonesia", "Company X is looking for")
    const ptMatch = caption.match(/(PT\s+[A-Z0-9][A-Za-z0-9\s.,&]+?)(?:\s+(?:is|sedang|membuka|looking|\n|,))/i)
    if (ptMatch && ptMatch[1]) {
      company = ptMatch[1].trim()
    }

    if (!company) {
      const companyLookingMatch = caption.match(/([A-Z][A-Za-z0-9\s&]{2,30}?)\s+is looking for/i)
      if (companyLookingMatch && companyLookingMatch[1]) {
        company = companyLookingMatch[1].trim()
      }
    }

    // Detect job title patterns (e.g. "looking for a Software Development Admin", "hiring: Backend Engineer")
    const lookingMatch = caption.match(
      /(?:looking for (?:a|an)?\s*|hiring\s*:\s*|posisi\s*:\s*|lowongan\s*:\s*)([A-Za-z0-9\s/&–-]{3,45}?)(?:\s+to join|\s+in\s+[A-Z]|\s+for|\.|\!|\n|,)/i
    )
    if (lookingMatch && lookingMatch[1]) {
      title = lookingMatch[1].trim()
    }

    if (!title) {
      const weAreHiringMatch = caption.match(/WE ARE HIRING![\s\n]*([A-Za-z0-9\s/&]{3,40}?)(?:\n|\.|\!)/i)
      if (weAreHiringMatch && weAreHiringMatch[1]) {
        title = weAreHiringMatch[1].trim()
      }
    }

    // Fallbacks
    if (!company && author) {
      company = author
    }

    if (!title && doc.title) {
      title = doc.title.split(/[-|•–]/)[0].trim()
      if (title.toLowerCase().includes('instagram') || title.length < 3) {
        title = 'Lowongan Kerja Instagram'
      }
    }

    return { title, company }
  }

  private extractLocation(caption: string): string {
    const locMatch = caption.match(/(?:in|di|lokasi|penempatan|area)\s+([A-Z][a-zA-Z\s]{2,25}?)(?:\s*\(|\s*\[|\.|\!|\n|,)/)
    if (locMatch && locMatch[1]) {
      const candidate = locMatch[1].trim()
      const lower = candidate.toLowerCase()
      if (!['surabaya', 'jakarta', 'bandung', 'yogyakarta', 'bali', 'semarang', 'medan', 'indonesia', 'remote'].some(c => lower.includes(c))) {
        // If not typical city, check common Indonesian cities
        return candidate
      }
      return candidate
    }
    return 'Lokasi tidak tertera'
  }
}
