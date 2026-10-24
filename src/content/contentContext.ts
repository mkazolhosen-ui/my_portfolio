import { createContext, useContext } from 'react'
import type { ContentState } from './types'

export const ContentContext = createContext<ContentState | null>(null)

export function useSiteContent(): ContentState {
  const value = useContext(ContentContext)
  if (!value) {
    throw new Error('useSiteContent must be used inside <ContentProvider>.')
  }
  return value
}