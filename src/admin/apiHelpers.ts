import { supabase } from '../lib/supabase'

/** The shared Supabase client, or an error if the env vars are missing. */
export function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

/** Turns database errors into messages a person can act on. */
export function toError(error: { code?: string; message?: string }): Error {
  switch (error.code) {
    case '23514':
      return new Error(
        'The database rejected a value (too long or wrongly formatted). Check the fields and try again.',
      )
    case '42501':
      return new Error('Permission denied. Your session may have expired. Try signing in again.')
    default:
      return new Error(error.message || 'The request failed. Please try again.')
  }
}

/** Row Level Security can make an update match zero rows without raising an error. */
export const NOT_APPLIED =
  'The change was not applied. The item may have been deleted, or you may not have permission.'

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.'
}