import { useRef, useState } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog'
import Notice from '../ui/Notice'
import OrderedItems from '../ui/OrderedItems'
import useOrderedList, { type ListApi } from '../ui/useOrderedList'
import { errorText } from '../apiHelpers'
import LinkForm from './LinkForm'
import {
  createLink,
  deleteLink,
  listLinks,
  reorderLinks,
  setLinkPublished,
  updateLink,
} from './linksApi'
import type { LinkFormValues, LinkRow, LinkValues } from './types'

type View = { mode: 'list' } | { mode: 'new' } | { mode: 'edit'; id: string }

// Module-level so the object identity is stable.
const API: ListApi<LinkRow> = {
  list: listLinks,
  setPublished: setLinkPublished,
  reorder: reorderLinks,
  remove: deleteLink,
}

const EMPTY_FORM: LinkFormValues = {
  label: '',
  display: '',
  href: '',
  published: false, // draft-first
}

const toFormValues = (l: LinkRow): LinkFormValues => ({
  label: l.label,
  display: l.display,
  href: l.href,
  published: l.published,
})

function metaOf(l: LinkRow): string {
  if (!l.href) return 'No URL yet'
  return l.href.replace(/^mailto:/i, '')
}

export default function LinksManager() {
  const list = useOrderedList<LinkRow>(API, (l) => l.label)
  const {
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
  } = list

  const [view, setView] = useState<View>({ mode: 'list' })
  const headingRef = useRef<HTMLHeadingElement>(null)

  function focusHeading() {
    window.setTimeout(() => headingRef.current?.focus(), 0)
  }

  function backToList() {
    setView({ mode: 'list' })
    focusHeading()
  }

  async function handleSave(values: LinkValues): Promise<string | null> {
    try {
      if (view.mode === 'edit') {
        const saved = await updateLink(view.id, values)
        setItems((cur) => cur.map((l) => (l.id === saved.id ? saved : l)))
        setNotice({ kind: 'success', text: `“${saved.label}” was saved.` })
      } else {
        const nextOrder = items.reduce((max, l) => Math.max(max, l.sort_order), 0) + 10
        const created = await createLink(values, nextOrder)
        setItems((cur) => [...cur, created])
        setNotice({
          kind: 'success',
          text: created.published
            ? `“${created.label}” was created and is published.`
            : `“${created.label}” was created as a draft.`,
        })
      }
      backToList()
      return null
    } catch (e) {
      return errorText(e)
    }
  }

  function onToggle(l: LinkRow) {
    // The public site hides links without a URL, so publishing one would do nothing.
    if (!l.published && !l.href) {
      setNotice({
        kind: 'error',
        text: `Add a URL to “${l.label}” before publishing it. Use Edit to add one.`,
      })
      return
    }
    void togglePublish(l)
  }

  async function onConfirmDelete() {
    await confirmDelete()
    focusHeading()
  }

  /* ---------- Form views ---------- */
  if (view.mode === 'new') {
    return <LinkForm mode="new" initial={EMPTY_FORM} onSave={handleSave} onCancel={backToList} />
  }

  if (view.mode === 'edit') {
    const link = items.find((l) => l.id === view.id)
    if (!link) {
      return (
        <div className="container admin-container">
          <p className="alert alert--error" role="alert">
            That link no longer exists.
          </p>
          <div>
            <button type="button" className="btn btn--ghost" onClick={backToList}>
              Back to links
            </button>
          </div>
        </div>
      )
    }
    return (
      <LinkForm
        mode="edit"
        initial={toFormValues(link)}
        onSave={handleSave}
        onCancel={backToList}
      />
    )
  }

  /* ---------- List view ---------- */
  return (
    <div className="container admin-container">
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Content</p>
          <h1 className="admin-page-title" ref={headingRef} tabIndex={-1}>
            Contact links
          </h1>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => {
            setNotice(null)
            setView({ mode: 'new' })
          }}
          disabled={load.status !== 'ready'}
        >
          Add link
        </button>
      </div>

      <p className="admin-muted">
        Visitors see only published links that have a URL. The first published email link becomes
        the large email address with a Copy button, and the others appear as a list below it.
        Fill in only your real details.
      </p>

      <Notice notice={notice} onDismiss={() => setNotice(null)} />

      {load.status === 'loading' && (
        <p className="admin-muted" role="status">
          Loading links…
        </p>
      )}

      {load.status === 'error' && (
        <div className="alert alert--error" role="alert">
          <p>Could not load links: {load.message}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {load.status === 'ready' && items.length === 0 && (
        <div className="empty-panel">
          <h2 className="empty-panel__title">No links yet</h2>
          <p className="admin-muted">
            Add an email address or a profile link. It starts as a private draft until you publish
            it.
          </p>
          <div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setView({ mode: 'new' })}
            >
              Add link
            </button>
          </div>
        </div>
      )}

           {load.status === 'ready' && items.length > 0 && (
        <OrderedItems<LinkRow>
          items={items}
          titleOf={(l) => l.label}
          metaOf={metaOf}
          reordering={reordering}
          busyId={busyId}
          onMove={(id, dir) => void move(id, dir)}
          onEdit={(l) => {
            setNotice(null)
            setView({ mode: 'edit', id: l.id })
          }}
          onToggle={onToggle}
          onDelete={(l) => setToDelete(l)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this link?"
        confirmLabel="Delete link"
        danger
        busy={deleting}
        onConfirm={() => void onConfirmDelete()}
        onCancel={() => setToDelete(null)}
      >
        <p>
          “{toDelete?.label}” will be permanently deleted. This cannot be undone. If you only want
          to hide it from visitors, use Unpublish instead.
        </p>
      </ConfirmDialog>
    </div>
  )
}