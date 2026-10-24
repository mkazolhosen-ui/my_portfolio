import { useCallback, useEffect, useRef, useState } from 'react'
import { errorText } from '../apiHelpers'
import type { NoticeValue } from './Notice'

export interface ListItem {
  id: string
  published: boolean
  sort_order: number
}

/** Pass a module-level constant: it is a dependency of the loading effect. */
export interface ListApi<T extends ListItem> {
  list: () => Promise<T[]>
  setPublished: (id: string, published: boolean) => Promise<T>
  reorder: (ids: string[]) => Promise<void>
  remove: (id: string) => Promise<void>
}

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }

/**
 * Shared state for an ordered, publishable list: loading, publish toggle, reorder
 * (optimistic, with rollback) and confirmed delete. Used by the Skills and Links managers.
 */
export default function useOrderedList<T extends ListItem>(
  api: ListApi<T>,
  labelOf: (item: T) => string,
) {
  const [items, setItems] = useState<T[]>([])
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState<NoticeValue | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [toDelete, setToDelete] = useState<T | null>(null)
  const [deleting, setDeleting] = useState(false)
  const pendingFocus = useRef<{ id: string; dir: -1 | 1 } | null>(null)

  useEffect(() => {
    let active = true
    api
      .list()
      .then((rows) => {
        if (!active) return
        setItems(rows)
        setLoad({ status: 'ready' })
      })
      .catch((e: unknown) => {
        if (active) setLoad({ status: 'error', message: errorText(e) })
      })
    return () => {
      active = false
    }
  }, [api, reloadKey])

  // After a move, put keyboard focus back on the moved item's Up/Down button.
  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    const preferred = document.getElementById(
      `${target.dir < 0 ? 'up' : 'down'}-${target.id}`,
    ) as HTMLButtonElement | null
    const other = document.getElementById(
      `${target.dir < 0 ? 'down' : 'up'}-${target.id}`,
    ) as HTMLButtonElement | null
    ;(preferred && !preferred.disabled ? preferred : other)?.focus()
  }, [items])

  const reload = useCallback(() => {
    setLoad({ status: 'loading' })
    setReloadKey((k) => k + 1)
  }, [])

  async function togglePublish(item: T) {
    if (busyId || reordering) return
    setBusyId(item.id)
    setNotice(null)
    try {
      const saved = await api.setPublished(item.id, !item.published)
      setItems((list) => list.map((x) => (x.id === saved.id ? saved : x)))
      setNotice({
        kind: 'success',
        text: saved.published
          ? `“${labelOf(saved)}” is now published.`
          : `“${labelOf(saved)}” is now a draft and hidden from visitors.`,
      })
    } catch (e) {
      setNotice({ kind: 'error', text: errorText(e) })
    } finally {
      setBusyId(null)
    }
  }

  async function move(id: string, dir: -1 | 1) {
    if (busyId || reordering) return
    const from = items.findIndex((p) => p.id === id)
    const to = from + dir
    if (from < 0 || to < 0 || to >= items.length) return

    const previous = items
    const next = items.slice()
    ;[next[from], next[to]] = [next[to], next[from]]
    const renumbered: T[] = next.map((p, i) => ({ ...p, sort_order: (i + 1) * 10 }))

    // Optimistic update, rolled back if the database refuses.
    pendingFocus.current = { id, dir }
    setItems(renumbered)
    setReordering(true)
    setNotice(null)
    try {
      await api.reorder(renumbered.map((p) => p.id))
      setNotice({
        kind: 'success',
        text: `Moved “${labelOf(renumbered[to])}” to position ${to + 1} of ${renumbered.length}.`,
      })
    } catch (e) {
      pendingFocus.current = null
      setItems(previous)
      setNotice({ kind: 'error', text: `Could not reorder: ${errorText(e)}` })
    } finally {
      setReordering(false)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.remove(toDelete.id)
      setItems((list) => list.filter((p) => p.id !== toDelete.id))
      setNotice({ kind: 'success', text: `“${labelOf(toDelete)}” was deleted.` })
    } catch (e) {
      setNotice({ kind: 'error', text: errorText(e) })
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  return {
    items,
    setItems,
    load,
    reload,
    notice,
    setNotice,
    busyId,
    reordering,
    togglePublish,
    move,
    toDelete,
    setToDelete,
    deleting,
    confirmDelete,
  }
}