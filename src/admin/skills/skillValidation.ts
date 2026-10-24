import { cleanList } from '../ui/validate'
import type { SkillFormValues, SkillValues } from './types'

/** These mirror the CHECK constraints in 01_schema.sql. The database enforces them regardless. */
export const LIMITS = { title: 80, description: 300, items: 20, item: 60 } as const

export interface SkillErrors {
  title?: string
  description?: string
  items?: string
}

export function validateSkillGroup(
  form: SkillFormValues,
  otherTitles: string[],
): { errors: SkillErrors; values: SkillValues | null } {
  const errors: SkillErrors = {}
  const title = form.title.trim()
  const description = form.description.trim()
  const items = cleanList(form.items)

  if (!title) errors.title = 'Enter a group title.'
  else if (title.length > LIMITS.title) {
    errors.title = `Title must be ${LIMITS.title} characters or fewer.`
  } else if (otherTitles.some((t) => t.trim().toLowerCase() === title.toLowerCase())) {
    // The public skill map identifies groups by title.
    errors.title = 'Another group already uses this title.'
  }

  if (description.length > LIMITS.description) {
    errors.description = `Description must be ${LIMITS.description} characters or fewer (currently ${description.length}).`
  }

  if (items.length > LIMITS.items) {
    errors.items = `Use at most ${LIMITS.items} items (currently ${items.length}).`
  } else if (items.some((i) => i.length > LIMITS.item)) {
    errors.items = `Each item must be ${LIMITS.item} characters or fewer.`
  } else if (new Set(items.map((i) => i.toLowerCase())).size !== items.length) {
    errors.items = 'Each item must be unique within the group.'
  }

  if (Object.keys(errors).length > 0) return { errors, values: null }

  return { errors, values: { title, description, items, published: form.published } }
}