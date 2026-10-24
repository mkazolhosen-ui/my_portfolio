import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type AdminStatus = 'checking' | 'signed-out' | 'forbidden' | 'error' | 'admin'

interface AdminCheck {
  userId: string
  result: 'admin' | 'forbidden' | 'error'
}

/**
 * Tracks the Supabase session and asks the database (is_admin()) whether it belongs to the admin.
 * Note: this only decides what the UI shows. Row Level Security is what actually protects the data.
 */
export default function useAdminAuth() {
  // undefined = not known yet, null = signed out
  const [session, setSession] = useState<Session | null | undefined>(
    supabase ? undefined : null,
  )
  const [check, setCheck] = useState<AdminCheck | null>(null)
  const [attempt, setAttempt] = useState(0)

  // 1. Follow the session. The callback must stay synchronous (no awaiting Supabase calls inside it).
  useEffect(() => {
    if (!supabase) return
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session)
      })
      .catch(() => {
        if (active) setSession(null)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) setCheck(null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // 2. Whenever the signed-in user changes (or on retry), ask the database if they are the admin.
  const userId = session?.user.id
  useEffect(() => {
    if (!supabase || !userId) return
    const client = supabase
    let active = true

    ;(async () => {
      let result: AdminCheck['result']
      try {
        const { data, error } = await client.rpc('is_admin')
        result = error ? 'error' : data === true ? 'admin' : 'forbidden'
      } catch {
        result = 'error'
      }
      if (active) setCheck({ userId, result })
    })()

    return () => {
      active = false
    }
  }, [userId, attempt])

  let status: AdminStatus
  if (session === undefined) status = 'checking'
  else if (session === null) status = 'signed-out'
  else if (check?.userId !== session.user.id) status = 'checking'
  else status = check.result

  const retry = useCallback(() => {
    setCheck(null)
    setAttempt((a) => a + 1)
  }, [])

  /** Returns an error message, or null on success. */
  const signOut = useCallback(async (): Promise<string | null> => {
    if (!supabase) return null
    setCheck(null)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      return error ? 'Could not sign out. Check your connection and try again.' : null
    } catch {
      return 'Could not sign out. Check your connection and try again.'
    }
  }, [])

  return { status, email: session?.user.email ?? '', retry, signOut }
}