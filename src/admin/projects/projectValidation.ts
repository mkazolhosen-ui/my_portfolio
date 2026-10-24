import type { ProjectFormValues, ProjectValues } from './types'

/** These mirror the CHECK constraints in 01_schema.sql. The database enforces them regardless. */
export const LIMITS = {
  title: 120,
  kind: 60,
  description: 1200,
  tags: 8,
  tag: 30,
  url: 2048,
} as const

export type FieldKey = 'title' | 'kind' | 'description' | 'tags' | 'liveUrl' | 'repoUrl'
export type ProjectErrors = Partial<Record<FieldKey, string>>

/** Order used to focus the first invalid field. */
export const FIELD_ORDER: FieldKey[] = [
  'title',
  'kind',
  'description',
  'tags',
  'liveUrl',
  'repoUrl',
]

export function parseTags(text: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const part of text.split(/[,\n]/)) {
    const tag = part.trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }
  return tags
}

function checkUrl(value: string): string | null {
  if (value === '') return null
  if (value.length > LIMITS.url) return `URL must be ${LIMITS.url} characters or fewer.`
  if (!/^https?:\/\/\S+$/i.test(value)) {
    return 'Must start with http:// or https:// and contain no spaces.'
  }
  try {
    new URL(value)
  } catch {
    return 'Enter a valid URL.'
  }
  return null
}

export function validateProject(form: ProjectFormValues): {
  errors: ProjectErrors
  values: ProjectValues | null
} {
  const errors: ProjectErrors = {}

  const title = form.title.trim()
  const kind = form.kind.trim()
  const description = form.description.trim()
  const liveUrl = form.liveUrl.trim()
  const repoUrl = form.repoUrl.trim()
  const tags = parseTags(form.tagsText)

  if (title.length === 0) errors.title = 'Enter a title.'
  else if (title.length > LIMITS.title) {
    errors.title = `Title must be ${LIMITS.title} characters or fewer.`
  }

  if (kind.length > LIMITS.kind) {
    errors.kind = `Type must be ${LIMITS.kind} characters or fewer.`
  }

  if (description.length > LIMITS.description) {
    errors.description = `Description must be ${LIMITS.description} characters or fewer (currently ${description.length}).`
  }

  if (tags.length > LIMITS.tags) {
    errors.tags = `Use at most ${LIMITS.tags} tags (currently ${tags.length}).`
  } else if (tags.some((t) => t.length > LIMITS.tag)) {
    errors.tags = `Each tag must be ${LIMITS.tag} characters or fewer.`
  }

  const liveError = checkUrl(liveUrl)
  if (liveError) errors.liveUrl = liveError
  const repoError = checkUrl(repoUrl)
  if (repoError) errors.repoUrl = repoError

  if (Object.keys(errors).length > 0) return { errors, values: null }

  return {
    errors,
    values: {
      title,
      kind,
      description,
      tags,
      live_url: liveUrl,
      repo_url: repoUrl,
      published: form.published,
    },
  }
}