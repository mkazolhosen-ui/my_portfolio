import { useEffect, useRef, useState, type ReactNode } from 'react'
import AdminNav from './AdminNav'

interface AdminLayoutProps {
  email: string
  path: string
  onNavigate: (to: string) => void
  onSignOut: () => Promise<string | null>
  children: ReactNode
}

export default function AdminLayout({
  email,
  path,
  onNavigate,
  onSignOut,
  children,
}: AdminLayoutProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  // After in-app navigation, move focus to the main region so screen-reader and keyboard users land on the new page.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus()
  }, [path])

  async function handleSignOut() {
    setBusy(true)
    setError('')
    const message = await onSignOut()
    // On success this component unmounts; on failure we stay and explain.
    if (message) {
      setError(message)
      setBusy(false)
    }
  }

  return (
    <div className="admin">
      <a className="skip-link" href="#admin-main">
        Skip to content
      </a>

      <header className="admin-header">
        <div className="admin-header__inner">
          <div className="admin-brand">
            <span className="nav__mark" aria-hidden="true" />
            <span className="admin-brand__name">CYBER // REALITY</span>
            <span className="admin-brand__tag">Admin</span>
          </div>

          <div className="admin-user">
            <span className="admin-user__email" title={email}>
              {email}
            </span>
            <a className="btn btn--ghost btn--sm" href="/">
              View site
            </a>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleSignOut}
              disabled={busy}
            >
              {busy ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>

        <AdminNav path={path} onNavigate={onNavigate} />

        {error && (
          <p className="alert alert--error admin-header__alert" role="alert">
            {error}
          </p>
        )}
      </header>

      <main className="admin-main" id="admin-main" ref={mainRef} tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}