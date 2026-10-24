import { useState, type FormEvent } from 'react'
import Notice, { type NoticeValue } from '../ui/Notice'
import TextListEditor from '../ui/TextListEditor'
import { cleanList } from '../ui/validate'
import { useUnsavedChanges } from '../unsaved'
import useSiteRow from './useSiteRow'
import type { SitePatch, SiteRow } from './siteApi'

/** These mirror the CHECK constraints in 01_schema.sql. */
const LIMITS = { paragraphs: 10, paragraph: 1500, focus: 12, focusItem: 60 }

interface AboutValues {
  paragraphs: string[]
  focus: string[]
}
interface AboutErrors {
  paragraphs?: string
  focus?: string
}

function fromRow(row: SiteRow): AboutValues {
  return { paragraphs: row.about_paragraphs, focus: row.about_focus }
}

function validate(v: AboutValues): {
  errors: AboutErrors
  patch: SitePatch | null
  normalized: AboutValues | null
} {
  const errors: AboutErrors = {}
  const paragraphs = cleanList(v.paragraphs)
  const focus = cleanList(v.focus)

  if (paragraphs.length > LIMITS.paragraphs) {
    errors.paragraphs = `Use at most ${LIMITS.paragraphs} paragraphs.`
  } else if (paragraphs.some((p) => p.length > LIMITS.paragraph)) {
    errors.paragraphs = `Each paragraph must be ${LIMITS.paragraph} characters or fewer.`
  }

  if (focus.length > LIMITS.focus) {
    errors.focus = `Use at most ${LIMITS.focus} focus areas.`
  } else if (focus.some((f) => f.length > LIMITS.focusItem)) {
    errors.focus = `Each focus area must be ${LIMITS.focusItem} characters or fewer.`
  }

  if (errors.paragraphs || errors.focus) return { errors, patch: null, normalized: null }

  return {
    errors,
    patch: { about_paragraphs: paragraphs, about_focus: focus },
    normalized: { paragraphs, focus },
  }
}

function AboutForm({
  row,
  save,
}: {
  row: SiteRow
  save: (patch: SitePatch) => Promise<string | null>
}) {
  const [values, setValues] = useState<AboutValues>(() => fromRow(row))
  const [baseline, setBaseline] = useState<AboutValues>(() => fromRow(row))
  const [errors, setErrors] = useState<AboutErrors>({})
  const [notice, setNotice] = useState<NoticeValue | null>(null)
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline)
  useUnsavedChanges(dirty)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return

    const { errors: found, patch, normalized } = validate(values)
    setErrors(found)
    setNotice(null)
    if (!patch || !normalized) return

    setSaving(true)
    const message = await save(patch)
    setSaving(false)

    if (message) {
      setNotice({ kind: 'error', text: message })
    } else {
      setValues(normalized)
      setBaseline(normalized)
      setNotice({ kind: 'success', text: 'About section saved. Reload the public site to see it.' })
    }
  }

  return (
    <>
      <Notice notice={notice} onDismiss={() => setNotice(null)} />

      <form className="editor" onSubmit={onSubmit} noValidate>
        <TextListEditor
          label="Paragraphs"
          noun="paragraph"
          items={values.paragraphs}
          onChange={(paragraphs) => setValues((v) => ({ ...v, paragraphs }))}
          maxItems={LIMITS.paragraphs}
          maxLength={LIMITS.paragraph}
          multiline
          disabled={saving}
          hint="The first paragraph is shown larger. Blank entries are removed when you save."
          error={errors.paragraphs}
        />

        <TextListEditor
          label="Focus areas"
          noun="focus area"
          items={values.focus}
          onChange={(focus) => setValues((v) => ({ ...v, focus }))}
          maxItems={LIMITS.focus}
          maxLength={LIMITS.focusItem}
          disabled={saving}
          hint="Short labels shown as chips next to the text."
          error={errors.focus}
        />

        {(errors.paragraphs || errors.focus) && (
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

export default function AboutEditor() {
  const { state, reload, save } = useSiteRow()

  return (
    <div className="container admin-container">
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Content</p>
          <h1 className="admin-page-title">About</h1>
        </div>
      </div>

      {state.status === 'loading' && (
        <p className="admin-muted" role="status">
          Loading About section…
        </p>
      )}

      {state.status === 'error' && (
        <div className="alert alert--error" role="alert">
          <p>Could not load the About section: {state.message}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && <AboutForm row={state.row} save={save} />}
    </div>
  )
}