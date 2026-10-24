import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog'
import FormField, { type InputEl } from '../ui/FormField'
import TextListEditor from '../ui/TextListEditor'
import { useUnsavedChanges } from '../unsaved'
import { LIMITS, validateSkillGroup, type SkillErrors } from './skillValidation'
import type { SkillFormValues, SkillValues } from './types'

interface SkillGroupFormProps {
  mode: 'new' | 'edit'
  initial: SkillFormValues
  /** Titles of the other groups, used to reject duplicates. */
  otherTitles: string[]
  /** Resolves to an error message, or null on success. */
  onSave: (values: SkillValues) => Promise<string | null>
  onCancel: () => void
}

export default function SkillGroupForm({
  mode,
  initial,
  otherTitles,
  onSave,
  onCancel,
}: SkillGroupFormProps) {
  const uid = useId()
  const [values, setValues] = useState<SkillFormValues>(initial)
  const [errors, setErrors] = useState<SkillErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const titleRef = useRef<InputEl | null>(null)
  const descRef = useRef<InputEl | null>(null)

  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  useUnsavedChanges(dirty)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return

    const { errors: found, values: clean } = validateSkillGroup(values, otherTitles)
    setErrors(found)
    setFormError('')

    if (!clean) {
      if (found.title) titleRef.current?.focus()
      else if (found.description) descRef.current?.focus()
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
          <p className="eyebrow">Skills</p>
          <h1 className="admin-page-title" ref={headingRef} tabIndex={-1}>
            {mode === 'new' ? 'New skill group' : 'Edit skill group'}
          </h1>
        </div>
      </div>

      <form className="editor" onSubmit={onSubmit} noValidate>
        <FormField
          id={`${uid}-title`}
          label="Group title"
          value={values.title}
          onChange={(title) => setValues((v) => ({ ...v, title }))}
          inputRef={(el) => {
            titleRef.current = el
          }}
          disabled={saving}
          maxLength={LIMITS.title}
          hint="For example “Software Development”. Must be unique."
          error={errors.title}
        />

        <FormField
          id={`${uid}-description`}
          label="Short description (optional)"
          value={values.description}
          onChange={(description) => setValues((v) => ({ ...v, description }))}
          inputRef={(el) => {
            descRef.current = el
          }}
          disabled={saving}
          counter={`${values.description.length} / ${LIMITS.description}`}
          error={errors.description}
        />

        <TextListEditor
          label="Items"
          noun="item"
          items={values.items}
          onChange={(items) => setValues((v) => ({ ...v, items }))}
          maxItems={LIMITS.items}
          maxLength={LIMITS.item}
          disabled={saving}
          hint="Only list things you can honestly claim. The public skill map reads best with a handful of items per group. Blank entries are removed when you save."
          error={errors.items}
        />

        <div className="check">
          <input
            id={`${uid}-published`}
            type="checkbox"
            checked={values.published}
            disabled={saving}
            aria-describedby={`${uid}-published-hint`}
            onChange={(e) => setValues((v) => ({ ...v, published: e.target.checked }))}
          />
          <div>
            <label htmlFor={`${uid}-published`} className="check__label">
              Published
            </label>
            <p id={`${uid}-published-hint`} className="field__hint">
              Published groups are visible to every visitor. Leave unchecked to keep this as a
              private draft.
            </p>
          </div>
        </div>

        {(errors.title || errors.description || errors.items) && (
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
            {saving ? 'Saving…' : mode === 'new' ? 'Create group' : 'Save changes'}
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