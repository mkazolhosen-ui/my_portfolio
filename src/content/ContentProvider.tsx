import { useEffect, useState, type ReactNode } from 'react'
import { ContentContext } from './contentContext'
import { fallbackContent } from './fallback'
import { loadContent } from './fetchContent'
import type { ContentState } from './types'

/** If Supabase has not answered by then, show the built-in content instead. */
const TIMEOUT_MS = 4000

export default function ContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContentState>({
    status: 'loading',
    source: 'fallback',
    content: fallbackContent,
  })

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

    loadContent(controller.signal)
      .then((content) => {
        if (active) setState({ status: 'ready', source: 'supabase', content })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (import.meta.env.DEV) {
          console.warn('[content] Using site.ts fallback:', error)
        }
        setState({ status: 'ready', source: 'fallback', content: fallbackContent })
      })
      .finally(() => window.clearTimeout(timer))

    return () => {
      active = false
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [])

  return <ContentContext.Provider value={state}>{children}</ContentContext.Provider>
}