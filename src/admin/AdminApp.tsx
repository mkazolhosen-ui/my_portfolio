import { useEffect, useState, type ReactNode } from 'react'
import '../styles/admin.css'
import '../styles/admin-editors.css'
import '../styles/admin-forms.css'
import { isSupabaseConfigured } from '../lib/supabase'
import useAdminAuth from './useAdminAuth'
import useAdminRoute from './useAdminRoute'
import { clearUnsavedChanges, hasUnsavedChanges } from './unsaved'
import LoginForm from './LoginForm'
import AdminLayout from './AdminLayout'
import Dashboard from './Dashboard'
import HeroEditor from './site/HeroEditor'
import AboutEditor from './site/AboutEditor'
import ProjectsManager from './projects/ProjectsManager'
import SkillsManager from './skills/SkillsManager'
import ContactTextEditor from './contact/ContactTextEditor'
import LinksManager from './contact/LinksManager'
import ConfirmDialog from './ui/ConfirmDialog'

/** The admin area should not appear in search results. (Security does not depend on this.) */
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)

    const previousTitle = document.title
    document.title = 'Admin — CYBER // REALITY'

    return () => {
      meta.remove()
      document.title = previousTitle
    }
  }, [])
}

function Center({ children }: { children: ReactNode }) {
  return <div className="admin admin-center">{children}</div>
}

export default function AdminApp() {
  useNoIndex()
  const { status, email, retry, signOut } = useAdminAuth()
  const { path, navigate } = useAdminRoute()
  const [pendingNav, setPendingNav] = useState<string | null>(null)

  /** In-app navigation that asks first when an editor has unsaved changes. */
  function guardedNavigate(to: string) {
    if (to !== path && hasUnsavedChanges()) setPendingNav(to)
    else navigate(to)
  }

  if (!isSupabaseConfigured) {
    return (
      <Center>
        <div className="admin-card">
          <h1 className="admin-card__title">Admin is not configured</h1>
          <p className="admin-muted">
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>{' '}
            in <code>.env.local</code>, then restart the dev server.
          </p>
        </div>
      </Center>
    )
  }

  if (status === 'checking') {
    return (
      <Center>
        <p className="admin-muted" role="status">
          Checking access…
        </p>
      </Center>
    )
  }

  if (status === 'signed-out') {
    return (
      <Center>
        <LoginForm />
      </Center>
    )
  }

  if (status === 'forbidden') {
    return (
      <Center>
        <div className="admin-card">
          <h1 className="admin-card__title">Not authorized</h1>
          <p className="admin-muted">
            {email ? `${email} is` : 'This account is'} signed in but is not allowed to manage
            this site.
          </p>
          <button type="button" className="btn btn--ghost" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </Center>
    )
  }

  if (status === 'error') {
    return (
      <Center>
        <div className="admin-card">
          <h1 className="admin-card__title">Could not verify access</h1>
          <p className="admin-muted">
            The server could not confirm your permissions. This can be a network problem or an
            expired session.
          </p>
          <div className="admin-actions">
            <button type="button" className="btn btn--primary" onClick={retry}>
              Try again
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </Center>
    )
  }

  let page: ReactNode
  switch (path) {
    case '/admin':
      page = <Dashboard />
      break
    case '/admin/hero':
      page = <HeroEditor />
      break
    case '/admin/about':
      page = <AboutEditor />
      break
    case '/admin/projects':
      page = <ProjectsManager />
      break
    case '/admin/skills':
      page = <SkillsManager />
      break
    case '/admin/contact':
      page = <ContactTextEditor />
      break
    case '/admin/links':
      page = <LinksManager />
      break
    default:
      page = (
        <div className="container admin-container">
          <h1 className="admin-page-title">Page not found</h1>
          <p className="admin-muted">There is no admin page at this address.</p>
          <div>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => guardedNavigate('/admin')}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )
  }

  return (
    <>
      <AdminLayout email={email} path={path} onNavigate={guardedNavigate} onSignOut={signOut}>
        {page}
      </AdminLayout>

      <ConfirmDialog
        open={pendingNav !== null}
        title="Leave without saving?"
        confirmLabel="Leave page"
        cancelLabel="Stay here"
        danger
        onConfirm={() => {
          const target = pendingNav
          setPendingNav(null)
          clearUnsavedChanges()
          if (target) navigate(target)
        }}
        onCancel={() => setPendingNav(null)}
      >
        <p>You have unsaved changes on this page. If you leave now they will be lost.</p>
      </ConfirmDialog>
    </>
  )
}