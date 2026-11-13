import { describe, it, expect } from 'vitest'
import { GeminiGuardrailService } from '@/services/geminiGuardrail'
import type { GeminiRawAnalysisResponse } from '@/types/analysis'
import type { JobDetails } from '@/types/job'

describe('GeminiGuardrailService Unit Tests (Zero-Hallucination & Integrity)', () => {
  const sampleJob: JobDetails = {
    id: 'job-sec-1',
    title: 'Lead Frontend Engineer',
    company: 'Fintech Nusantara',
    extractedAt: new Date().toISOString(),
  }

  const sampleCV = `
BUDI SANTOSO
Senior Frontend Developer (Vue 3, TypeScript, Pinia)
Jakarta | budi@example.com

Pengalaman:
- Lead Frontend Developer di PT Solusi Web (2021 - Sekarang)
  Memimpin arsitektur web modern dengan Vue 3 dan TypeScript.
- Web Developer di Studio Digital (2019 - 2021)
  Mengembangkan user interface dengan HTML, CSS, dan JavaScript.

Keahlian:
Vue 3, TypeScript, Pinia, Tailwind CSS, Vite, Jest, Git.
  `

  it('should successfully validate and ground compliant results', () => {
    const rawResponse: GeminiRawAnalysisResponse = {
      relevance_score: 88,
      match_level: 'High',
      match_summary: 'Kandidat memiliki kualifikasi tinggi pada ekosistem Vue 3.',
      matched_skills: [
        {
          skill: 'Vue 3',
          cv_evidence: 'Memimpin arsitektur web modern dengan Vue 3',
        },
        {
          skill: 'TypeScript',
          cv_evidence: 'Keahlian: Vue 3, TypeScript, Pinia',
        },
      ],
      missing_skills: [
        {
          requirement: 'Pengalaman Rust Backend',
          importance: 'Preferred',
          recommendation: 'Jelaskan kemampuan cepat beradaptasi dengan stack baru.',
        },
      ],
      interview_highlights: [
        'Keahlian solid dalam kepemimpinan arsitektur frontend.',
      ],
    }

    const validation = GeminiGuardrailService.validateAndGround(
      rawResponse,
      sampleCV,
      sampleJob
    )

    expect(validation.isValid).toBe(true)
    expect(validation.isGrounded).toBe(true)
    expect(validation.warnings).toHaveLength(0)
    expect(validation.groundedResult.score).toBe(88)
    expect(validation.groundedResult.matchLevel).toBe('High')
    expect(validation.groundedResult.matchedSkills[0].isGrounded).toBe(true)
  })

  it('should detect hallucinated skills not backed by CV evidence and add warning', () => {
    const rawWithHallucination: GeminiRawAnalysisResponse = {
      relevance_score: 75,
      match_level: 'High',
      match_summary: 'Kandidat menguasai AWS Solution Architect dan Solana Blockchain.',
      matched_skills: [
        {
          skill: 'Vue 3',
          cv_evidence: 'Memimpin arsitektur web modern dengan Vue 3',
        },
        {
          skill: 'Solana Smart Contracts',
          cv_evidence: 'Mengembangkan 10+ smart contracts terdesentralisasi di Solana',
        },
      ],
      missing_skills: [],
      interview_highlights: [],
    }

    const validation = GeminiGuardrailService.validateAndGround(
      rawWithHallucination,
      sampleCV,
      sampleJob
    )

    expect(validation.isGrounded).toBe(false)
    expect(validation.warnings.length).toBeGreaterThan(0)
    expect(validation.warnings[0]).toContain('Peringatan Grounding')
    expect(validation.warnings[0]).toContain('Solana Smart Contracts')

    // Matched skill should have isGrounded=false
    const hallucinatedSkill = validation.groundedResult.matchedSkills.find(
      (m) => m.skill === 'Solana Smart Contracts'
    )
    expect(hallucinatedSkill?.isGrounded).toBe(false)
  })

  it('should detect conflicting claims when a skill appears in both matched and missing', () => {
    const rawWithConflict: GeminiRawAnalysisResponse = {
      relevance_score: 60,
      match_level: 'Moderate',
      match_summary: 'Ada konflik pada skill Kubernetes.',
      matched_skills: [
        {
          skill: 'Kubernetes',
          cv_evidence: 'Mengelola cluster k8s',
        },
      ],
      missing_skills: [
        {
          requirement: 'Pengalaman Kubernetes Orchestration',
          importance: 'Crucial',
          recommendation: 'Pelajari dasar containerization.',
        },
      ],
      interview_highlights: [],
    }

    const validation = GeminiGuardrailService.validateAndGround(
      rawWithConflict,
      sampleCV,
      sampleJob
    )

    expect(validation.isGrounded).toBe(false)
    expect(validation.warnings.some((w) => w.includes('Peringatan Integritas'))).toBe(true)
  })

  it('should clamp scores between 0 and 100', () => {
    const rawOver: GeminiRawAnalysisResponse = {
      relevance_score: 150,
      match_level: 'High',
      match_summary: 'Over 100',
      matched_skills: [],
      missing_skills: [],
      interview_highlights: [],
    }

    const valOver = GeminiGuardrailService.validateAndGround(rawOver, sampleCV, sampleJob)
    expect(valOver.groundedResult.score).toBe(100)

    const rawUnder: GeminiRawAnalysisResponse = {
      relevance_score: -25,
      match_level: 'Low',
      match_summary: 'Under 0',
      matched_skills: [],
      missing_skills: [],
      interview_highlights: [],
    }

    const valUnder = GeminiGuardrailService.validateAndGround(rawUnder, sampleCV, sampleJob)
    expect(valUnder.groundedResult.score).toBe(0)
  })

  it('should auto-correct match_level if missing or discordant', () => {
    const rawNoLevel: any = {
      relevance_score: 82,
      match_summary: 'Score 82',
      matched_skills: [],
      missing_skills: [],
      interview_highlights: [],
    }

    const res = GeminiGuardrailService.validateAndGround(rawNoLevel, sampleCV, sampleJob)
    expect(res.groundedResult.matchLevel).toBe('High')
  })
})
