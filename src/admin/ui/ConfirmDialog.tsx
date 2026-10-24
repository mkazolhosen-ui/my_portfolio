import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal confirmation built on the native <dialog> element: focus is trapped inside,
 * Esc cancels, and focus returns to the opener on close. Cancel is first in the DOM,
 * so it receives initial focus (the safe default for destructive actions).
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      onCancel={(e) => {
        // Esc key
        e.preventDefault()
        if (!busy) onCancel()
      }}
      onMouseDown={(e) => {
        // Click on the backdrop (the dialog element itself has no padding)
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      {open && (
        <div className="dialog__body">
          <h2 id={`${id}-title`} className="dialog__title">
            {title}
          </h2>
          <div id={`${id}-desc`} className="dialog__text">
            {children}
          </div>
          <div className="dialog__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`btn btn--sm ${danger ? 'btn--danger' : 'btn--primary'}`}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}