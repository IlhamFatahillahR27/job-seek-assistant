/**
 * Gemini AI Match & Gap Analysis Type Definitions
 * Strictly aligned with plans/AI_ASSISTANT_GUARDRAILS.md
 */

export type MatchLevel = 'High' | 'Moderate' | 'Low'
export type RelevanceScoreCategory = MatchLevel | 'Medium'

export type ImportanceLevel = 'Crucial' | 'Preferred'

/**
 * Raw JSON schema returned by Gemini API (Template 1)
 */
export interface GeminiRawMatchedSkill {
  skill: string
  cv_evidence: string
}

export interface GeminiRawMissingSkill {
  requirement: string
  importance: ImportanceLevel | 'critical' | 'preferred'
  recommendation: string
}

export interface GeminiRawAnalysisResponse {
  relevance_score: number
  match_level: MatchLevel
  match_summary: string
  matched_skills: GeminiRawMatchedSkill[]
  missing_skills: GeminiRawMissingSkill[]
  interview_highlights: string[]
}

/**
 * Verified & Grounded Skill Match with CV evidence
 */
export interface SkillMatch {
  skill: string
  relevanceExplanation?: string
  cvEvidenceSnippet: string
  isGrounded?: boolean
}

/**
 * Identified Gap with practical mitigation advice
 */
export interface SkillGap {
  missingRequirement: string
  importance: ImportanceLevel
  mitigationAdvice: string
}

/**
 * Full Grounded Analysis Result stored in state and chrome.storage
 */
export interface GroundedAnalysisResult {
  id: string
  jobId: string
  jobTitle?: string
  companyName?: string
  score: number // 0 - 100
  matchLevel: MatchLevel
  scoreCategory?: RelevanceScoreCategory // Compatibility alias
  summary: string
  matchedSkills: SkillMatch[]
  missingSkills: SkillGap[]
  interviewTips: string[]
  analyzedAt: string
  isDemo?: boolean
  isGrounded: boolean
  hallucinationWarnings?: string[]
}

export type AnalysisResult = GroundedAnalysisResult

/**
 * Model info retrieved via ModelService.ListModels
 */
export interface GeminiModelInfo {
  id: string // e.g. "gemini-2.0-flash" (stripped of models/)
  name: string // e.g. "models/gemini-2.0-flash"
  displayName: string
  description?: string
  supportedGenerationMethods: string[]
  isThinking?: boolean
}

/**
 * Instant API Key Validation Response
 */
export interface ConnectionValidationResult {
  valid: boolean
  models?: string[]
  availableModels?: GeminiModelInfo[]
  errorMessage?: string
  testedAt: string
}

