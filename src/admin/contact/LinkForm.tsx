import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog'
import FormField, { type InputEl } from '../ui/FormField'
import { useUnsavedChanges } from '../unsaved'
import { LIMITS, validateLink, type LinkErrors } from './linkValidation'
import type { LinkFormValues, LinkValues } from './types'

interface LinkFormProps {
  mode: 'new' | 'edit'
  initial: LinkFormValues
  /** Resolves to an error message, or null on success. */
  onSave: (values: LinkValues) => Promise<string | null>
  onCancel: () => void
}

export default function LinkForm({ mode, initial, onSave, onCancel }: LinkFormProps) {
  const uid = useId()
  const [values, setValues] = useState<LinkFormValues>(initial)
  const [errors, setErrors] = useState<LinkErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const labelRef = useRef<InputEl | null>(null)
  const displayRef = useRef<InputEl | null>(null)
  const hrefRef = useRef<InputEl | null>(null)

  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  useUnsavedChanges(dirty)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  function set<K extends keyof LinkFormValues>(key: K, value: LinkFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return

    const { errors: found, values: clean } = validateLink(values)
    setErrors(found)
    setFormError('')

    if (!clean) {
      if (found.label) labelRef.current?.focus()
      else if (found.display) displayRef.current?.focus()
      else if (found.href) hrefRef.current?.focus()
      return
    }

    setSaving(true)
    const message = await onSave(clean)
    // On success the manager closes this form, so only the failure path needs to react.
    if (message) {
      setFormError(message)
      setSaving(false)
    }
  }

  function requestCancel() {
    if (dirty) setConfirmDiscard(true)
    else onCancel()
  }

  return (
    <div className="container admin-container">
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Contact links</p>
          <h1 className="admin-page-title" ref={headingRef} tabIndex={-1}>
            {mode === 'new' ? 'New link' : 'Edit link'}
          </h1>
        </div>
      </div>

      <form className="editor" onSubmit={onSubmit} noValidate>
        <FormField
          id={`${uid}-label`}
          label="Label"
          value={values.label}
          onChange={(v) => set('label', v)}
          inputRef={(el) => {
            labelRef.current = el
          }}
          disabled={saving}
          maxLength={LIMITS.label}
          hint="For example “Email”, “GitHub” or “LinkedIn”."
          error={errors.label}
        />

        <FormField
          id={`${uid}-href`}
          label="URL or email address"
          value={values.href}
          onChange={(v) => set('href', v)}
          inputRef={(el) => {
            hrefRef.current = el
          }}
          disabled={saving}
          inputMode="url"
          placeholder="https://"
          hint="Use a full https:// link, or type an email address (it is saved as a mailto: link). The first published email link becomes the large email address with a Copy button."
          error={errors.href}
        />

        <FormField
          id={`${uid}-display`}
          label="Display text (optional)"
          value={values.display}
          onChange={(v) => set('display', v)}
          inputRef={(el) => {
            displayRef.current = el
          }}
          disabled={saving}
          maxLength={LIMITS.display}
          hint="What visitors read for this link, such as your handle. If left empty, the URL is shown. Email links always show the address."
          error={errors.display}
        />

        <div className="check">
          <input
            id={`${uid}-published`}
            type="checkbox"
            checked={values.published}
            disabled={saving}
            aria-describedby={`${uid}-published-hint`}
            onChange={(e) => set('published', e.target.checked)}
          />
          <div>
            <label htmlFor={`${uid}-published`} className="check__label">
              Published
            </label>
            <p id={`${uid}-published-hint`} className="field__hint">
              Published links are visible to every visitor and need a URL. Leave unchecked to keep
              this as a private draft.
            </p>
          </div>
        </div>

        {(errors.label || errors.display || errors.href) && (
          <p className="alert alert--error" role="alert">
            Please fix the highlighted fields.
          </p>
        )}

        {formError && (
          <p className="alert alert--error" role="alert">
            {formError}
          </p>
        )}

        <div className="editor__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : mode === 'new' ? 'Create link' : 'Save changes'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={requestCancel}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard changes?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        danger
        onConfirm={onCancel}
        onCancel={() => setConfirmDiscard(false)}
      >
        <p>You have unsaved changes. If you leave now they will be lost.</p>
      </ConfirmDialog>
    </div>
  )
}