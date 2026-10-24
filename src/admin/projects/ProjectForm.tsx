import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog'
import FormField from '../ui/FormField'
import { useUnsavedChanges } from '../unsaved'
import { FIELD_ORDER, LIMITS, validateProject, type ProjectErrors } from './projectValidation'
import type { ProjectFormValues, ProjectValues } from './types'

interface ProjectFormProps {
  mode: 'new' | 'edit'
  initial: ProjectFormValues
  /** Resolves to an error message, or null on success. */
  onSave: (values: ProjectValues) => Promise<string | null>
  onCancel: () => void
}

export default function ProjectForm({ mode, initial, onSave, onCancel }: ProjectFormProps) {
  const uid = useId()
  const [values, setValues] = useState<ProjectFormValues>(initial)
  const [errors, setErrors] = useState<ProjectErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const dirty = JSON.stringify(values) !== JSON.stringify(initial)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  // Warn before closing the tab or navigating away with unsaved changes.
  useUnsavedChanges(dirty)

  function set<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return

    const { errors: found, values: clean } = validateProject(values)
    setErrors(found)
    setFormError('')

    if (!clean) {
      // Each field's id is `${uid}-${key}`, so we can focus the first invalid field by id.
      const first = FIELD_ORDER.find((key) => found[key])
      if (first) document.getElementById(`${uid}-${first}`)?.focus()
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
          <p className="eyebrow">Projects</p>
          <h1 className="admin-page-title" ref={headingRef} tabIndex={-1}>
            {mode === 'new' ? 'New project' : 'Edit project'}
          </h1>
        </div>
      </div>

      <form className="editor" onSubmit={onSubmit} noValidate>
        <FormField
          id={`${uid}-title`}
          label="Title"
          value={values.title}
          onChange={(v) => set('title', v)}
          disabled={saving}
          error={errors.title}
        />

        <FormField
          id={`${uid}-kind`}
          label="Type (optional)"
          value={values.kind}
          onChange={(v) => set('kind', v)}
          disabled={saving}
          hint="A short label such as “Browser Game” or “Data Project”."
          error={errors.kind}
        />

        <FormField
          id={`${uid}-description`}
          label="Description"
          multiline
          rows={6}
          value={values.description}
          onChange={(v) => set('description', v)}
          disabled={saving}
          counter={`${values.description.length} / ${LIMITS.description}`}
          error={errors.description}
        />

        <FormField
          id={`${uid}-tags`}
          label="Tags (optional)"
          value={values.tagsText}
          onChange={(v) => set('tagsText', v)}
          disabled={saving}
          hint={`Separate with commas. Up to ${LIMITS.tags} tags of ${LIMITS.tag} characters.`}
          error={errors.tags}
        />

        <FormField
          id={`${uid}-liveUrl`}
          label="Live URL (optional)"
          value={values.liveUrl}
          onChange={(v) => set('liveUrl', v)}
          disabled={saving}
          inputMode="url"
          placeholder="https://"
          hint="Leave empty if there is no live version yet."
          error={errors.liveUrl}
        />

        <FormField
          id={`${uid}-repoUrl`}
          label="Source URL (optional)"
          value={values.repoUrl}
          onChange={(v) => set('repoUrl', v)}
          disabled={saving}
          inputMode="url"
          placeholder="https://"
          hint="Leave empty if the source is not public."
          error={errors.repoUrl}
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
              Published projects are visible to every visitor. Leave unchecked to keep this as a
              private draft.
            </p>
          </div>
        </div>

        {formError && (
          <p className="alert alert--error" role="alert">
            {formError}
          </p>
        )}

        <div className="editor__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : mode === 'new' ? 'Create project' : 'Save changes'}
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