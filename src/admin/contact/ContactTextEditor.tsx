import { useId, useRef, useState, type FormEvent } from 'react'
import FormField, { type InputEl } from '../ui/FormField'
import Notice, { type NoticeValue } from '../ui/Notice'
import { useUnsavedChanges } from '../unsaved'
import useSiteRow from '../site/useSiteRow'
import type { SitePatch, SiteRow } from '../site/siteApi'

/** These mirror the CHECK constraints in 01_schema.sql. */
const LIMITS = { heading: 120, message: 500 }

interface Values {
  heading: string
  message: string
}
type Key = keyof Values
type Errors = Partial<Record<Key, string>>

const fromRow = (row: SiteRow): Values => ({
  heading: row.contact_heading,
  message: row.contact_message,
})

function validate(v: Values): {
  errors: Errors
  patch: SitePatch | null
  normalized: Values | null
} {
  const errors: Errors = {}
  const heading = v.heading.trim()
  const message = v.message.trim()

  // The heading is the section title, so it must not be empty.
  if (!heading) errors.heading = 'Enter a heading.'
  else if (heading.length > LIMITS.heading) {
    errors.heading = `Must be ${LIMITS.heading} characters or fewer.`
  }

  if (message.length > LIMITS.message) {
    errors.message = `Must be ${LIMITS.message} characters or fewer.`
  }

  if (Object.keys(errors).length > 0) return { errors, patch: null, normalized: null }

  return {
    errors,
    patch: { contact_heading: heading, contact_message: message },
    normalized: { heading, message },
  }
}

function ContactTextForm({
  row,
  save,
}: {
  row: SiteRow
  save: (patch: SitePatch) => Promise<string | null>
}) {
  const uid = useId()
  const [values, setValues] = useState<Values>(() => fromRow(row))
  const [baseline, setBaseline] = useState<Values>(() => fromRow(row))
  const [errors, setErrors] = useState<Errors>({})
  const [notice, setNotice] = useState<NoticeValue | null>(null)
  const [saving, setSaving] = useState(false)
  const refs = useRef<Partial<Record<Key, InputEl | null>>>({})

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline)
  useUnsavedChanges(dirty)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return

    const { errors: found, patch, normalized } = validate(values)
    setErrors(found)
    setNotice(null)

    if (!patch || !normalized) {
      if (found.heading) refs.current.heading?.focus()
      else if (found.message) refs.current.message?.focus()
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
      setNotice({ kind: 'success', text: 'Contact text saved. Reload the public site to see it.' })
    }
  }

  return (
    <>
      <Notice notice={notice} onDismiss={() => setNotice(null)} />

      <form className="editor" onSubmit={onSubmit} noValidate>
        <FormField
          id={`${uid}-heading`}
          label="Section heading"
          value={values.heading}
          onChange={(heading) => setValues((v) => ({ ...v, heading }))}
          inputRef={(el) => {
            refs.current.heading = el
          }}
          disabled={saving}
          maxLength={LIMITS.heading}
          error={errors.heading}
        />

        <FormField
          id={`${uid}-message`}
          label="Message"
          multiline
          rows={4}
          value={values.message}
          onChange={(message) => setValues((v) => ({ ...v, message }))}
          inputRef={(el) => {
            refs.current.message = el
          }}
          disabled={saving}
          counter={`${values.message.length} / ${LIMITS.message}`}
          error={errors.message}
        />

        {(errors.heading || errors.message) && (
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

export default function ContactTextEditor() {
  const { state, reload, save } = useSiteRow()

  return (
    <div className="container admin-container">
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Content</p>
          <h1 className="admin-page-title">Contact</h1>
        </div>
      </div>

      <p className="admin-muted">
        The heading and message above your contact links. Manage the links themselves on the Links
        tab.
      </p>

      {state.status === 'loading' && (
        <p className="admin-muted" role="status">
          Loading contact text…
        </p>
      )}

      {state.status === 'error' && (
        <div className="alert alert--error" role="alert">
          <p>Could not load contact text: {state.message}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && <ContactTextForm row={state.row} save={save} />}
    </div>
  )
}