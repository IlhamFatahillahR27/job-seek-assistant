/**
 * Gemini AI Match & Gap Analysis Type Definitions
 */

export type RelevanceScoreCategory = 'High' | 'Medium' | 'Low'

export interface SkillMatch {
  skill: string
  relevanceExplanation: string
  cvEvidenceSnippet?: string
}

export interface SkillGap {
  missingRequirement: string
  importance: 'critical' | 'preferred'
  mitigationAdvice: string
}

export interface AnalysisResult {
  id: string
  jobId: string
  score: number // 0 - 100
  scoreCategory: RelevanceScoreCategory
  summary: string
  matchedSkills: SkillMatch[]
  missingSkills: SkillGap[]
  interviewTips: string[]
  analyzedAt: string
}
