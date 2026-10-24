import { useEffect, useId, useRef, useState } from 'react'

interface TextListEditorProps {
  /** Group label, for example "Paragraphs". */
  label: string
  /** Singular noun used in button labels and announcements, for example "paragraph". */
  noun: string
  items: string[]
  onChange: (items: string[]) => void
  maxItems: number
  maxLength: number
  multiline?: boolean
  disabled?: boolean
  hint?: string
  error?: string
}

type Pending =
  | { kind: 'input'; index: number }
  | { kind: 'move'; index: number; dir: -1 | 1 }
  | { kind: 'group' }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * An editable, reorderable list of strings with keyboard-accessible Up, Down and Remove buttons.
 * Focus is managed after every add, move and remove, and changes are announced to screen readers.
 */
export default function TextListEditor({
  label,
  noun,
  items,
  onChange,
  maxItems,
  maxLength,
  multiline = false,
  disabled = false,
  hint,
  error,
}: TextListEditorProps) {
  const uid = useId()
  const groupRef = useRef<HTMLFieldSetElement>(null)
  const pending = useRef<Pending | null>(null)
  const [announce, setAnnounce] = useState('')

  useEffect(() => {
    const p = pending.current
    if (!p) return
    pending.current = null

    if (p.kind === 'input') {
      document.getElementById(`${uid}-input-${p.index}`)?.focus()
    } else if (p.kind === 'move') {
      const preferred = document.getElementById(
        `${uid}-${p.dir < 0 ? 'up' : 'down'}-${p.index}`,
      ) as HTMLButtonElement | null
      const other = document.getElementById(
        `${uid}-${p.dir < 0 ? 'down' : 'up'}-${p.index}`,
      ) as HTMLButtonElement | null
      ;(preferred && !preferred.disabled ? preferred : other)?.focus()
    } else {
      groupRef.current?.focus()
    }
  }, [items, uid])

  function add() {
    if (items.length >= maxItems) return
    pending.current = { kind: 'input', index: items.length }
    onChange([...items, ''])
    setAnnounce(`Added ${noun} ${items.length + 1}.`)
  }

  function update(index: number, value: string) {
    onChange(items.map((item, i) => (i === index ? value : item)))
  }

  function remove(index: number) {
    pending.current = { kind: 'group' }
    onChange(items.filter((_, i) => i !== index))
    setAnnounce(`Removed ${noun} ${index + 1}.`)
  }

  function move(index: number, dir: -1 | 1) {
    const to = index + dir
    if (to < 0 || to >= items.length) return
    const next = items.slice()
    ;[next[index], next[to]] = [next[to], next[index]]
    pending.current = { kind: 'move', index: to, dir }
    onChange(next)
    setAnnounce(`Moved ${noun} ${index + 1} to position ${to + 1} of ${items.length}.`)
  }

  const describedBy =
    [hint ? `${uid}-hint` : null, error ? `${uid}-error` : null].filter(Boolean).join(' ') ||
    undefined

  return (
    <fieldset
      ref={groupRef}
      className="listedit"
      tabIndex={-1}
      disabled={disabled}
      aria-describedby={describedBy}
    >
      <legend className="field__label listedit__legend">{label}</legend>

      {hint && (
        <p id={`${uid}-hint`} className="field__hint">
          {hint}
        </p>
      )}

      {items.length === 0 ? (
        <p className="field__hint">No {noun}s yet.</p>
      ) : (
        <ul className="listedit__rows" role="list">
          {items.map((item, i) => (
            <li key={i} className="listedit__row">
              <div className="listedit__input">
                {multiline ? (
                  <textarea
                    id={`${uid}-input-${i}`}
                    className="field__input field__input--area"
                    rows={4}
                    value={item}
                    maxLength={maxLength}
                    aria-label={`${cap(noun)} ${i + 1}`}
                    onChange={(e) => update(i, e.target.value)}
                  />
                ) : (
                  <input
                    id={`${uid}-input-${i}`}
                    className="field__input"
                    type="text"
                    value={item}
                    maxLength={maxLength}
                    autoComplete="off"
                    aria-label={`${cap(noun)} ${i + 1}`}
                    onChange={(e) => update(i, e.target.value)}
                  />
                )}
                {multiline && (
                  <span className="field__counter">
                    {item.length} / {maxLength}
                  </span>
                )}
              </div>

              <div className="listedit__btns">
                <button
                  type="button"
                  id={`${uid}-up-${i}`}
                  className="btn btn--ghost btn--sm"
                  aria-label={`Move ${noun} ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  id={`${uid}-down-${i}`}
                  className="btn btn--ghost btn--sm"
                  aria-label={`Move ${noun} ${i + 1} down`}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn--danger-ghost btn--sm"
                  aria-label={`Remove ${noun} ${i + 1}`}
                  onClick={() => remove(i)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="listedit__footer">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={add}
          disabled={items.length >= maxItems}
        >
          + Add {noun}
        </button>
        <span className="field__hint">
          {items.length} / {maxItems}
        </span>
      </div>

      {error && (
        <p id={`${uid}-error`} className="field__error">
          {error}
        </p>
      )}

      <p className="sr-only" role="status">
        {announce}
      </p>
    </fieldset>
  )
}