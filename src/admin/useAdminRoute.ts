import { useCallback, useSyncExternalStore } from 'react'

const EVENT = 'admin:navigate'

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback)
  window.addEventListener(EVENT, callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener(EVENT, callback)
  }
}

const getSnapshot = () => window.location.pathname
const getServerSnapshot = () => '/admin'

/** Minimal client-side routing for /admin/*, with no router dependency. */
export default function useAdminRoute() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const path = raw.replace(/\/+$/, '') || '/'

  const navigate = useCallback((to: string) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, '', to)
      window.dispatchEvent(new Event(EVENT))
    }
    window.scrollTo(0, 0)
  }, [])

  return { path, navigate }
}