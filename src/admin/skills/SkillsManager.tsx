import { useRef, useState } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog'
import Notice from '../ui/Notice'
import OrderedItems from '../ui/OrderedItems'
import useOrderedList, { type ListApi } from '../ui/useOrderedList'
import SkillGroupForm from './SkillGroupForm'
import {
  createSkillGroup,
  deleteSkillGroup,
  listSkillGroups,
  reorderSkillGroups,
  setSkillGroupPublished,
  updateSkillGroup,
} from './skillsApi'
import { errorText } from '../apiHelpers'
import type { SkillFormValues, SkillGroupRow, SkillValues } from './types'

type View = { mode: 'list' } | { mode: 'new' } | { mode: 'edit'; id: string }

// Module-level so the object identity is stable.
const API: ListApi<SkillGroupRow> = {
  list: listSkillGroups,
  setPublished: setSkillGroupPublished,
  reorder: reorderSkillGroups,
  remove: deleteSkillGroup,
}

const EMPTY_FORM: SkillFormValues = {
  title: '',
  description: '',
  items: [],
  published: false, // draft-first
}

const toFormValues = (g: SkillGroupRow): SkillFormValues => ({
  title: g.title,
  description: g.description,
  items: g.items,
  published: g.published,
})

export default function SkillsManager() {
  const list = useOrderedList<SkillGroupRow>(API, (g) => g.title)
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

  async function handleSave(values: SkillValues): Promise<string | null> {
    try {
      if (view.mode === 'edit') {
        const saved = await updateSkillGroup(view.id, values)
        setItems((cur) => cur.map((g) => (g.id === saved.id ? saved : g)))
        setNotice({ kind: 'success', text: `“${saved.title}” was saved.` })
      } else {
        const nextOrder = items.reduce((max, g) => Math.max(max, g.sort_order), 0) + 10
        const created = await createSkillGroup(values, nextOrder)
        setItems((cur) => [...cur, created])
        setNotice({
          kind: 'success',
          text: created.published
            ? `“${created.title}” was created and is published.`
            : `“${created.title}” was created as a draft.`,
        })
      }
      backToList()
      return null
    } catch (e) {
      return errorText(e)
    }
  }

  async function onConfirmDelete() {
    await confirmDelete()
    focusHeading()
  }

  /* ---------- Form views ---------- */
  if (view.mode === 'new') {
    return (
      <SkillGroupForm
        mode="new"
        initial={EMPTY_FORM}
        otherTitles={items.map((g) => g.title)}
        onSave={handleSave}
        onCancel={backToList}
      />
    )
  }

  if (view.mode === 'edit') {
    const group = items.find((g) => g.id === view.id)
    if (!group) {
      return (
        <div className="container admin-container">
          <p className="alert alert--error" role="alert">
            That skill group no longer exists.
          </p>
          <div>
            <button type="button" className="btn btn--ghost" onClick={backToList}>
              Back to skills
            </button>
          </div>
        </div>
      )
    }
    return (
      <SkillGroupForm
        mode="edit"
        initial={toFormValues(group)}
        otherTitles={items.filter((g) => g.id !== group.id).map((g) => g.title)}
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
            Skills
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
          Add skill group
        </button>
      </div>

      <p className="admin-muted">
        Visitors see only published groups, in the order shown here, in the skill map and the cards
        beside it. The map reads best with about 3 to 8 groups.
      </p>

      <Notice notice={notice} onDismiss={() => setNotice(null)} />

      {load.status === 'loading' && (
        <p className="admin-muted" role="status">
          Loading skill groups…
        </p>
      )}

      {load.status === 'error' && (
        <div className="alert alert--error" role="alert">
          <p>Could not load skill groups: {load.message}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {load.status === 'ready' && items.length === 0 && (
        <div className="empty-panel">
          <h2 className="empty-panel__title">No skill groups yet</h2>
          <p className="admin-muted">
            Add your first group. It starts as a private draft until you publish it.
          </p>
          <div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setView({ mode: 'new' })}
            >
              Add skill group
            </button>
          </div>
        </div>
      )}

        {load.status === 'ready' && items.length > 0 && (
        <OrderedItems<SkillGroupRow>
          items={items}
          titleOf={(g) => g.title}
          metaOf={(g) => `${g.items.length} ${g.items.length === 1 ? 'item' : 'items'}`}
          reordering={reordering}
          busyId={busyId}
          onMove={(id, dir) => void move(id, dir)}
          onEdit={(g) => {
            setNotice(null)
            setView({ mode: 'edit', id: g.id })
          }}
          onToggle={(g) => void togglePublish(g)}
          onDelete={(g) => setToDelete(g)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this skill group?"
        confirmLabel="Delete group"
        danger
        busy={deleting}
        onConfirm={() => void onConfirmDelete()}
        onCancel={() => setToDelete(null)}
      >
        <p>
          “{toDelete?.title}” and its items will be permanently deleted. This cannot be undone. If
          you only want to hide it from visitors, use Unpublish instead.
        </p>
      </ConfirmDialog>
    </div>
  )
}