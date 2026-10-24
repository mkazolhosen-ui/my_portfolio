import { useEffect } from 'react'

let unsaved = false

export const hasUnsavedChanges = () => unsaved
export const clearUnsavedChanges = () => {
  unsaved = false
}

/**
 * Call with `dirty` from any editor. While true, closing or reloading the tab shows the
 * browser's warning, and AdminApp asks before in-app navigation.
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    unsaved = dirty
    if (!dirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
      unsaved = false
    }
  }, [dirty])
}