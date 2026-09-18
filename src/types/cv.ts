/**
 * CV and Profile Type Definitions
 */

export interface CVExperience {
  id?: string
  role: string
  company: string
  location?: string
  startDate: string
  endDate: string // or 'Present'
  description?: string
  keyAchievements?: string[]
}

export interface CVEducation {
  id?: string
  institution: string
  degree: string
  fieldOfStudy?: string
  graduationYear?: string
  gpa?: string
}

export interface CVSkillCategory {
  category: string // e.g. "Languages", "Frameworks", "Cloud & DevOps"
  items: string[]
}

export interface CVProfile {
  id: string
  fileName: string
  fileId?: string // Google Drive File ID
  source: 'google_drive' | 'manual_paste'
  lastModified?: string
  parsedAt: string
  rawText: string
  summary?: string
  headline?: string
  skills: CVSkillCategory[]
  experiences: CVExperience[]
  educations: CVEducation[]
  certifications?: string[]
}
