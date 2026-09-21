import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { CVParserService } from '@/services/cvParser'

describe('Reference CV Parsing Test', () => {
  it('should parse the reference CV into a rich, structured CV profile if present', async () => {
    const refDir = path.resolve(process.cwd(), 'reference')
    let pdfPath = ''
    if (fs.existsSync(refDir)) {
      const pdfFiles = fs.readdirSync(refDir).filter((f) => f.toLowerCase().endsWith('.pdf'))
      if (pdfFiles.length > 0) {
        pdfPath = path.join(refDir, pdfFiles[0])
      }
    }
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      console.log('Reference PDF not found (ignored by git); skipping local reference fixture test.')
      return
    }

    const fileBuffer = fs.readFileSync(pdfPath)
    const rawText = await CVParserService.extractTextFromPdf(fileBuffer)

    expect(rawText.length).toBeGreaterThan(500)
    expect(rawText).toContain('Full Stack Engineer')
    expect(rawText).toContain('Universitas Dinamika')

    const profile = CVParserService.parseTextToProfile(rawText, {
      fileName: path.basename(pdfPath),
      source: 'google_drive',
    })

    // 1. Verify clean headline without phone/location
    expect(profile.headline).toBe('Full Stack Engineer')

    // 2. Verify skills categorization
    expect(profile.skills.length).toBeGreaterThan(0)
    const frontend = profile.skills.find((s) => s.category.includes('Frontend'))
    expect(frontend).toBeDefined()
    expect(frontend?.items).toContain('Vue.js')
    expect(frontend?.items).toContain('TypeScript')

    const backend = profile.skills.find((s) => s.category.includes('Backend'))
    expect(backend).toBeDefined()
    expect(backend?.items).toContain('Laravel')
    expect(backend?.items).toContain('NestJS')

    // 3. Verify experiences
    expect(profile.experiences.length).toBeGreaterThanOrEqual(2)
    const firstExp = profile.experiences[0]
    expect(firstExp.role).toBe('Full Stack Engineer')
    expect(firstExp.company).toBe('Universitas Dinamika')
    expect(firstExp.startDate).toContain('2023')
    expect(firstExp.endDate).toMatch(/Present|Sekarang/i)

    const secondExp = profile.experiences[1]
    expect(secondExp.role).toBe('IT Developer')
    expect(secondExp.company).toBe('PT Todis Karya Bangsa')

    // 4. Verify education
    expect(profile.educations.length).toBeGreaterThanOrEqual(1)
    const firstEdu = profile.educations[0]
    expect(firstEdu.degree).toContain('Diploma 3 in Information Systems')
    expect(firstEdu.institution).toBe('Universitas Dinamika')

    // 5. Verify certifications / training
    expect(profile.certifications.length).toBeGreaterThanOrEqual(1)
  })
})
