/** A skill group as stored in the database (admin view, drafts included). */
export interface SkillGroupRow {
  id: string
  title: string
  description: string
  items: string[]
  sort_order: number
  published: boolean
}

/** What the form edits. Items stay as raw strings (blanks allowed) while typing. */
export interface SkillFormValues {
  title: string
  description: string
  items: string[]
  published: boolean
}

/** Cleaned, validated values ready to send to the database. */
export interface SkillValues {
  title: string
  description: string
  items: string[]
  published: boolean
}