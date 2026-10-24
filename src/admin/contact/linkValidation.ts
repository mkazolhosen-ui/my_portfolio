import type { LinkFormValues, LinkValues } from './types'

/** These mirror the CHECK constraints in 01_schema.sql. The database enforces them regardless. */
export const LIMITS = { label: 40, display: 120, href: 2048 } as const

export interface LinkErrors {
  label?: string
  display?: string
  href?: string
}

const PLAIN_EMAIL = /^[^\s@:/?]+@[^\s@/?]+\.[^\s@/?]+$/
const MAILTO = /^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+(\?\S*)?$/i

/** A bare email address becomes a mailto: link. Anything else is left as typed. */
export function normalizeHref(raw: string): string {
  const v = raw.trim()
  return PLAIN_EMAIL.test(v) ? `mailto:${v}` : v
}

function checkHref(href: string): string | null {
  if (href === '') return null
  if (href.length > LIMITS.href) return `Must be ${LIMITS.href} characters or fewer.`
  if (/^mailto:/i.test(href)) {
    return MAILTO.test(href) ? null : 'Enter a valid email address.'
  }
  if (/^https?:\/\/\S+$/i.test(href)) {
    try {
      new URL(href)
      return null
    } catch {
      return 'Enter a valid URL.'
    }
  }
  return 'Use a link starting with https:// or an email address.'
}

export function validateLink(form: LinkFormValues): {
  errors: LinkErrors
  values: LinkValues | null
} {
  const errors: LinkErrors = {}
  const label = form.label.trim()
  const display = form.display.trim()
  const href = normalizeHref(form.href)

  if (!label) errors.label = 'Enter a label, such as “GitHub”.'
  else if (label.length > LIMITS.label) {
    errors.label = `Label must be ${LIMITS.label} characters or fewer.`
  }

  if (display.length > LIMITS.display) {
    errors.display = `Must be ${LIMITS.display} characters or fewer.`
  }

  const hrefError = checkHref(href)
  if (hrefError) errors.href = hrefError
  else if (form.published && href === '') {
    // The public site hides links without a URL, so publishing one would do nothing.
    errors.href = 'Add a URL before publishing, or leave this link as a draft.'
  }

  if (Object.keys(errors).length > 0) return { errors, values: null }

  return { errors, values: { label, display, href, published: form.published } }
}