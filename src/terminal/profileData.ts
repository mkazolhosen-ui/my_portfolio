export interface EducationEntry {
  institution: string
  program: string
  /** For example a year range, or "In progress". Use your own wording. */
  period: string
  note?: string
}

export interface LabEntry {
  title: string
  /** Where the lab comes from (a platform, a course, ...). */
  source: string
  status: 'completed' | 'in progress' | 'planned'
  note?: string
  /** Optional public link (must start with https://). */
  url?: string
}

export interface ProfileData {
  education: readonly EducationEntry[]
  labs: readonly LabEntry[]
}

/** Only add entries that are true and that you are happy to make public. */
export const profile: ProfileData = {
  education: [],
  labs: [],
}