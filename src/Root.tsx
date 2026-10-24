import { Suspense, lazy } from 'react'
import App from './App.tsx'

// The admin app (and its CSS) is a separate chunk that public visitors never download.
const AdminApp = lazy(() => import('./admin/AdminApp'))

const isAdminRoute = /^\/admin(\/|$)/.test(window.location.pathname)

export default function Root() {
  if (isAdminRoute) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    )
  }
  return <App />
}