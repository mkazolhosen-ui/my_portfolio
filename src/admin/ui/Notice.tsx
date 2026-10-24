export interface NoticeValue {
  kind: 'success' | 'error'
  text: string
}

interface NoticeProps {
  notice: NoticeValue | null
  onDismiss: () => void
}

/** A dismissible status message. The wrapper is always mounted so screen readers announce changes. */
export default function Notice({ notice, onDismiss }: NoticeProps) {
  return (
    <div className="notice-region" role="status">
      {notice && (
        <div className={`alert alert--${notice.kind === 'error' ? 'error' : 'success'}`}>
          <p>{notice.text}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}