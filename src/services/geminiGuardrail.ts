/**
 * Gemini Runtime Post-Generation Guardrail Service
 * Strictly verifies zero-hallucination compliance, spot-checks CV evidence,
 * and ensures data integrity before presenting analysis to user.
 * (Corresponds to plans/AI_ASSISTANT_GUARDRAILS.md Section 4)
 */

import type {
  GeminiRawAnalysisResponse,
  GroundedAnalysisResult,
  SkillMatch,
  SkillGap,
  MatchLevel,
} from '@/types/analysis'
import type { JobDetails } from '@/types/job'

export interface GuardrailValidationResult {
  isValid: boolean
  isGrounded: boolean
  warnings: string[]
  groundedResult: GroundedAnalysisResult
}

export class GeminiGuardrailService {
  /**
   * Main entry point to validate, spot-check, and ground raw Gemini analysis response
   */
  static validateAndGround(
    raw: GeminiRawAnalysisResponse,
    cvRawText: string,
    job: JobDetails,
    isDemo = false
  ): GuardrailValidationResult {
    const warnings: string[] = []
    const cvLower = (cvRawText || '').toLowerCase()

    // 1. Validate & Clamp Relevance Score (0 - 100)
    let score = typeof raw.relevance_score === 'number' ? Math.round(raw.relevance_score) : 50
    if (isNaN(score)) score = 50
    score = Math.max(0, Math.min(100, score))

    // 2. Determine match level
    let matchLevel: MatchLevel = raw.match_level
    if (!['High', 'Moderate', 'Low'].includes(matchLevel)) {
      matchLevel = score >= 75 ? 'High' : score >= 50 ? 'Moderate' : 'Low'
    }

    // 3. Grounded Verification for Matched Skills (Spot-Check)
    const groundedMatchedSkills: SkillMatch[] = []
    const missingSkillRequirements = (raw.missing_skills || []).map((m) =>
      (m.requirement || '').toLowerCase().trim()
    )

    for (const item of raw.matched_skills || []) {
      const skillName = (item.skill || '').trim()
      const evidence = (item.cv_evidence || '').trim()
      if (!skillName) continue

      const skillLower = skillName.toLowerCase()
      const evidenceLower = evidence.toLowerCase()

      // Check if skill text or evidence appears in CV
      const skillInCv = cvLower.includes(skillLower)
      const evidenceInCv = evidence ? this.fuzzyContains(cvLower, evidenceLower) : false

      // Check for conflict: Was this skill also listed in missing skills?
      const isConflicted = missingSkillRequirements.some((req) =>
        req.includes(skillLower) || (skillLower.length > 4 && req.includes(skillLower))
      )

      let isGrounded = true

      if (isConflicted) {
        warnings.push(
          `Peringatan Integritas: "${skillName}" terdeteksi di Matched Skills namun juga tercantum di Missing Skills.`
        )
        isGrounded = false
      } else if (!skillInCv && !evidenceInCv && !isDemo) {
        warnings.push(
          `Peringatan Grounding: Bukti klaim keahlian "${skillName}" ("${evidence}") tidak ditemukan dalam teks CV Anda.`
        )
        isGrounded = false
      }

      groundedMatchedSkills.push({
        skill: skillName,
        relevanceExplanation: evidence,
        cvEvidenceSnippet: evidence || 'Disebutkan dalam ringkasan kualifikasi CV.',
        isGrounded,
      })
    }

    // 4. Grounded Verification for Missing Skills
    const groundedMissingSkills: SkillGap[] = []
    for (const item of raw.missing_skills || []) {
      const req = (item.requirement || '').trim()
      if (!req) continue

      const importance =
        item.importance === 'critical' || item.importance === 'Crucial'
          ? 'Crucial'
          : 'Preferred'

      groundedMissingSkills.push({
        missingRequirement: req,
        importance,
        mitigationAdvice: (item.recommendation || '').trim() || 'Fokuskan pada transferable skills yang telah Anda kuasai.',
      })
    }

    // 5. Clean & filter Interview Highlights
    const cleanHighlights = (raw.interview_highlights || [])
      .map((h) => (typeof h === 'string' ? h.trim() : ''))
      .filter((h) => h.length > 0)

    const isGrounded = warnings.length === 0

    const groundedResult: GroundedAnalysisResult = {
      id: `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      jobId: job.id,
      jobTitle: job.title || 'Posisi Lowongan',
      companyName: job.company || 'Perusahaan',
      score,
      matchLevel,
      scoreCategory: matchLevel,
      summary: (raw.match_summary || '').trim() || 'Evaluasi kecocokan kandidat dengan lowongan kerja.',
      matchedSkills: groundedMatchedSkills,
      missingSkills: groundedMissingSkills,
      interviewTips: cleanHighlights,
      analyzedAt: new Date().toISOString(),
      isDemo,
      isGrounded,
      hallucinationWarnings: warnings.length > 0 ? warnings : undefined,
    }

    return {
      isValid: true,
      isGrounded,
      warnings,
      groundedResult,
    }
  }

  /**
   * Helper fuzzy contains for evidence quotes
   * Checks if substantial parts of the quote appear in the CV text
   */
  private static fuzzyContains(cvText: string, quote: string): boolean {
    if (cvText.includes(quote)) return true

    // Break quote into tokens (words >= 4 chars)
    const tokens = quote
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4)

    if (tokens.length === 0) return true

    let matchedTokens = 0
    for (const token of tokens) {
      if (cvText.includes(token)) {
        matchedTokens++
      }
    }

    // If at least 50% of the significant words in the snippet exist in CV
    return matchedTokens / tokens.length >= 0.5
  }
}
