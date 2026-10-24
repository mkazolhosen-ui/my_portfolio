import { useId, useState, type FormEvent } from 'react'
import FormField from '../ui/FormField'
import Notice, { type NoticeValue } from '../ui/Notice'
import { splitWords } from '../ui/validate'
import { useUnsavedChanges } from '../unsaved'
import useSiteRow from './useSiteRow'
import type { SitePatch, SiteRow } from './siteApi'

/** These mirror the CHECK constraints in 01_schema.sql. */
const LIMITS = { siteName: 100, eyebrow: 60, words: 6, word: 30, tagline: 200, intro: 500 }

interface HeroValues {
  siteName: string
  eyebrow: string
  heroText: string
  tagline: string
  intro: string
}
type Key = keyof HeroValues
type Errors = Partial<Record<Key, string>>
const ORDER: Key[] = ['siteName', 'eyebrow', 'heroText', 'tagline', 'intro']

function fromRow(row: SiteRow): HeroValues {
  return {
    siteName: row.site_name,
    eyebrow: row.eyebrow,
    heroText: row.hero_name.join(' '),
    tagline: row.tagline,
    intro: row.intro,
  }
}

function validate(v: HeroValues): {
  errors: Errors
  patch: SitePatch | null
  normalized: HeroValues | null
} {
  const errors: Errors = {}
  const siteName = v.siteName.trim()
  const eyebrow = v.eyebrow.trim()
  const words = splitWords(v.heroText)
  const tagline = v.tagline.trim()
  const intro = v.intro.trim()

  if (!siteName) errors.siteName = 'Enter your name. It appears in the page footer.'
  else if (siteName.length > LIMITS.siteName) {
    errors.siteName = `Must be ${LIMITS.siteName} characters or fewer.`
  }

  if (eyebrow.length > LIMITS.eyebrow) {
    errors.eyebrow = `Must be ${LIMITS.eyebrow} characters or fewer.`
  }

  if (words.length === 0) errors.heroText = 'Enter at least one word.'
  else if (words.length > LIMITS.words) {
    errors.heroText = `Use at most ${LIMITS.words} words (currently ${words.length}).`
  } else if (words.some((w) => w.length > LIMITS.word)) {
    errors.heroText = `Each word must be ${LIMITS.word} characters or fewer.`
  }

  if (!tagline) errors.tagline = 'Enter a tagline.'
  else if (tagline.length > LIMITS.tagline) {
    errors.tagline = `Must be ${LIMITS.tagline} characters or fewer.`
  }

  if (intro.length > LIMITS.intro) {
    errors.intro = `Must be ${LIMITS.intro} characters or fewer.`
  }

  if (Object.keys(errors).length > 0) return { errors, patch: null, normalized: null }

  return {
    errors,
    patch: { site_name: siteName, eyebrow, hero_name: words, tagline, intro },
    normalized: { siteName, eyebrow, heroText: words.join(' '), tagline, intro },
  }
}

function HeroForm({
  row,
  save,
}: {
  row: SiteRow
  save: (patch: SitePatch) => Promise<string | null>
}) {
  const uid = useId()
  const [values, setValues] = useState<HeroValues>(() => fromRow(row))
  const [baseline, setBaseline] = useState<HeroValues>(() => fromRow(row))
  const [errors, setErrors] = useState<Errors>({})
  const [notice, setNotice] = useState<NoticeValue | null>(null)
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline)
  useUnsavedChanges(dirty)

  const set = (k: Key, v: string) => setValues((cur) => ({ ...cur, [k]: v }))

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return

    const { errors: found, patch, normalized } = validate(values)
    setErrors(found)
    setNotice(null)

    if (!patch || !normalized) {
      // Each field's id is `${uid}-${key}`, so we can focus the first invalid field by id.
      const first = ORDER.find((k) => found[k])
      if (first) document.getElementById(`${uid}-${first}`)?.focus()
      return
    }

    setSaving(true)
    const message = await save(patch)
    setSaving(false)

    if (message) {
      setNotice({ kind: 'error', text: message })
    } else {
      setValues(normalized)
      setBaseline(normalized)
      setNotice({ kind: 'success', text: 'Hero text saved. Reload the public site to see it.' })
    }
  }

  const wordCount = splitWords(values.heroText).length

  return (
    <>
      <Notice notice={notice} onDismiss={() => setNotice(null)} />

      <form className="editor" onSubmit={onSubmit} noValidate>
        <FormField
          id={`${uid}-heroText`}
          label="Hero name"
          value={values.heroText}
          onChange={(v) => set('heroText', v)}
          disabled={saving}
          hint={`The big title. Separate words with spaces, and each word is shown and animated separately (up to ${LIMITS.words}).`}
          counter={`${wordCount} / ${LIMITS.words} words`}
          error={errors.heroText}
        />

        <FormField
          id={`${uid}-eyebrow`}
          label="Eyebrow (small line above the name)"
          value={values.eyebrow}
          onChange={(v) => set('eyebrow', v)}
          disabled={saving}
          maxLength={LIMITS.eyebrow}
          error={errors.eyebrow}
        />

        <FormField
          id={`${uid}-tagline`}
          label="Tagline"
          value={values.tagline}
          onChange={(v) => set('tagline', v)}
          disabled={saving}
          hint="Shown in quotation marks, so don't add your own."
          counter={`${values.tagline.length} / ${LIMITS.tagline}`}
          error={errors.tagline}
        />

        <FormField
          id={`${uid}-intro`}
          label="Introduction"
          multiline
          rows={4}
          value={values.intro}
          onChange={(v) => set('intro', v)}
          disabled={saving}
          counter={`${values.intro.length} / ${LIMITS.intro}`}
          error={errors.intro}
        />

        <FormField
          id={`${uid}-siteName`}
          label="Full name (used in the footer)"
          value={values.siteName}
          onChange={(v) => set('siteName', v)}
          disabled={saving}
          maxLength={LIMITS.siteName}
          error={errors.siteName}
        />

        {Object.keys(errors).length > 0 && (
          <p className="alert alert--error" role="alert">
            Please fix the highlighted fields.
          </p>
        )}

        <div className="editor__actions">
          <button type="submit" className="btn btn--primary" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {dirty && !saving && <span className="admin-muted">You have unsaved changes.</span>}
        </div>
      </form>
    </>
  )
}

export default function HeroEditor() {
  const { state, reload, save } = useSiteRow()

  return (
    <div className="container admin-container">
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Content</p>
          <h1 className="admin-page-title">Hero</h1>
        </div>
      </div>

      {state.status === 'loading' && (
        <p className="admin-muted" role="status">
          Loading hero text…
        </p>
      )}

      {state.status === 'error' && (
        <div className="alert alert--error" role="alert">
          <p>Could not load hero text: {state.message}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && <HeroForm row={state.row} save={save} />}
    </div>
  )
}