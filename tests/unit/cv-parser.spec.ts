import { describe, it, expect } from 'vitest'
import { CVParserService } from '@/services/cvParser'
import { DEMO_DOC_TEXT } from '@/services/googleDrive'

describe('CVParserService Unit Tests', () => {
  it('should parse structured CV text into a comprehensive CVProfile', () => {
    const profile = CVParserService.parseTextToProfile(DEMO_DOC_TEXT, {
      fileName: 'Test_User_Resume.pdf',
      fileId: 'file_drive_123',
      source: 'google_drive',
      mimeType: 'application/pdf',
      driveModifiedTime: '2026-09-18T10:00:00Z',
      fileSize: 142000,
    })

    expect(profile.id).toBeDefined()
    expect(profile.fileName).toBe('Test_User_Resume.pdf')
    expect(profile.fileId).toBe('file_drive_123')
    expect(profile.source).toBe('google_drive')
    expect(profile.driveModifiedTime).toBe('2026-09-18T10:00:00Z')
    expect(profile.fileSize).toBe(142000)

    // Verify Headline
    expect(profile.headline).toContain('Senior Frontend Engineer')

    // Verify Skills Categorization
    expect(profile.skills.length).toBeGreaterThan(0)
    const frontendCategory = profile.skills.find((c) => c.category.includes('Frontend'))
    expect(frontendCategory).toBeDefined()
    expect(frontendCategory?.items).toContain('Vue 3')
    expect(frontendCategory?.items).toContain('TypeScript')
    expect(frontendCategory?.items).toContain('Tailwind CSS')

    const devopsCategory = profile.skills.find((c) => c.category.includes('Cloud'))
    expect(devopsCategory).toBeDefined()
    expect(devopsCategory?.items).toContain('Docker')
    expect(devopsCategory?.items).toContain('Git')

    // Verify Experiences
    expect(profile.experiences.length).toBeGreaterThan(0)
    const firstExp = profile.experiences[0]
    expect(firstExp.startDate).toBeDefined()
    expect(firstExp.endDate).toBeDefined()

    // Verify Education
    expect(profile.educations.length).toBeGreaterThan(0)
    const firstEdu = profile.educations[0]
    expect(firstEdu.degree).toMatch(/Sarjana/i)
  })

  it('should handle fallback for sparse or unstructured text gracefully', () => {
    const sparseText = `John Doe
Web Developer
Skills: React, Node.js
Experience:
2021 - 2023 at Studio Alpha
Developed web applications`

    const profile = CVParserService.parseTextToProfile(sparseText, {
      fileName: 'Simple_Resume.txt',
      source: 'manual_paste',
    })

    expect(profile.fileName).toBe('Simple_Resume.txt')
    expect(profile.source).toBe('manual_paste')
    expect(profile.headline).toBe('Web Developer')
    expect(profile.skills.length).toBeGreaterThan(0)
  })

  it('should extract text from binary buffer via fallback extractor when PDF.js worker is unavailable', async () => {
    // Construct simple binary buffer with readable strings
    const encoder = new TextEncoder()
    const buffer = encoder.encode('BT (Test User) Tj ET\nBT (Senior Software Engineer) Tj ET')

    const extracted = await CVParserService.extractTextFromPdf(buffer.buffer)
    expect(extracted).toBeTruthy()
    expect(typeof extracted).toBe('string')
  })
})
