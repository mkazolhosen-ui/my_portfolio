export type InputEl = HTMLInputElement | HTMLTextAreaElement

interface FormFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  inputRef?: (el: InputEl | null) => void
  disabled?: boolean
  hint?: string
  error?: string
  counter?: string
  multiline?: boolean
  rows?: number
  placeholder?: string
  maxLength?: number
  inputMode?: 'url' | 'text' | 'email'
}

export default function FormField({
  id,
  label,
  value,
  onChange,
  inputRef,
  disabled = false,
  hint,
  error,
  counter,
  multiline = false,
  rows = 5,
  placeholder,
  maxLength,
  inputMode,
}: FormFieldProps) {
  const describedBy =
    [hint || counter ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          ref={inputRef}
          className="field__input field__input--area"
          rows={rows}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          ref={inputRef}
          className="field__input"
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {(hint || counter) && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
          {counter && <span className="field__counter">{counter}</span>}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  )
}