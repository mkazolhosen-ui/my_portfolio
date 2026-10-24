import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog'
import ProjectForm from './ProjectForm'
import {
  createProject,
  deleteProject,
  errorText,
  listProjects,
  reorderProjects,
  setProjectPublished,
  updateProject,
} from './projectsApi'
import type { ProjectFormValues, ProjectRow, ProjectValues } from './types'

type View = { mode: 'list' } | { mode: 'new' } | { mode: 'edit'; id: string }
type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }
interface Notice {
  kind: 'success' | 'error'
  text: string
}

const EMPTY_FORM: ProjectFormValues = {
  title: '',
  kind: '',
  description: '',
  tagsText: '',
  liveUrl: '',
  repoUrl: '',
  published: false, // draft-first
}

function toFormValues(p: ProjectRow): ProjectFormValues {
  return {
    title: p.title,
    kind: p.kind,
    description: p.description,
    tagsText: p.tags.join(', '),
    liveUrl: p.live_url,
    repoUrl: p.repo_url,
    published: p.published,
  }
}

export default function ProjectsManager() {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [view, setView] = useState<View>({ mode: 'list' })
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [toDelete, setToDelete] = useState<ProjectRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef<{ id: string; dir: -1 | 1 } | null>(null)

  useEffect(() => {
    let active = true
    listProjects()
      .then((rows) => {
        if (!active) return
        setProjects(rows)
        setLoad({ status: 'ready' })
      })
      .catch((e: unknown) => {
        if (active) setLoad({ status: 'error', message: errorText(e) })
      })
    return () => {
      active = false
    }
  }, [reloadKey])

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
  }, [projects])

  function reload() {
    setLoad({ status: 'loading' })
    setReloadKey((k) => k + 1)
  }

  function focusHeading() {
    window.setTimeout(() => headingRef.current?.focus(), 0)
  }

  function backToList() {
    setView({ mode: 'list' })
    focusHeading()
  }

  async function handleSave(values: ProjectValues): Promise<string | null> {
    try {
      if (view.mode === 'edit') {
        const saved = await updateProject(view.id, values)
        setProjects((list) => list.map((p) => (p.id === saved.id ? saved : p)))
        setNotice({ kind: 'success', text: `“${saved.title}” was saved.` })
      } else {
        const nextOrder = projects.reduce((max, p) => Math.max(max, p.sort_order), 0) + 10
        const created = await createProject(values, nextOrder)
        setProjects((list) => [...list, created])
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

  async function togglePublish(p: ProjectRow) {
    if (busyId || reordering) return
    setBusyId(p.id)
    setNotice(null)
    try {
      const saved = await setProjectPublished(p.id, !p.published)
      setProjects((list) => list.map((x) => (x.id === saved.id ? saved : x)))
      setNotice({
        kind: 'success',
        text: saved.published
          ? `“${saved.title}” is now published.`
          : `“${saved.title}” is now a draft and hidden from visitors.`,
      })
    } catch (e) {
      setNotice({ kind: 'error', text: errorText(e) })
    } finally {
      setBusyId(null)
    }
  }

  async function move(id: string, dir: -1 | 1) {
    if (busyId || reordering) return
    const from = projects.findIndex((p) => p.id === id)
    const to = from + dir
    if (from < 0 || to < 0 || to >= projects.length) return

    const previous = projects
    const next = projects.slice()
    ;[next[from], next[to]] = [next[to], next[from]]
    const renumbered = next.map((p, i) => ({ ...p, sort_order: (i + 1) * 10 }))

    // Optimistic update, rolled back if the database refuses.
    pendingFocus.current = { id, dir }
    setProjects(renumbered)
    setReordering(true)
    setNotice(null)
    try {
      await reorderProjects(renumbered.map((p) => p.id))
      setNotice({
        kind: 'success',
        text: `Moved “${renumbered[to].title}” to position ${to + 1} of ${renumbered.length}.`,
      })
    } catch (e) {
      pendingFocus.current = null
      setProjects(previous)
      setNotice({ kind: 'error', text: `Could not reorder: ${errorText(e)}` })
    } finally {
      setReordering(false)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteProject(toDelete.id)
      setProjects((list) => list.filter((p) => p.id !== toDelete.id))
      setNotice({ kind: 'success', text: `“${toDelete.title}” was deleted.` })
    } catch (e) {
      setNotice({ kind: 'error', text: errorText(e) })
    } finally {
      setDeleting(false)
      setToDelete(null)
      focusHeading()
    }
  }

  /* ---------- Form views ---------- */
  if (view.mode === 'new') {
    return (
      <ProjectForm mode="new" initial={EMPTY_FORM} onSave={handleSave} onCancel={backToList} />
    )
  }

  if (view.mode === 'edit') {
    const project = projects.find((p) => p.id === view.id)
    if (!project) {
      // The project disappeared (for example it was deleted elsewhere).
      return (
        <div className="container admin-container">
          <p className="alert alert--error" role="alert">
            That project no longer exists.
          </p>
          <div>
            <button type="button" className="btn btn--ghost" onClick={backToList}>
              Back to projects
            </button>
          </div>
        </div>
      )
    }
    return (
      <ProjectForm
        mode="edit"
        initial={toFormValues(project)}
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
            Projects
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
          Add project
        </button>
      </div>

      <p className="admin-muted">
        Visitors see only published projects, in the order shown here. Drafts are visible to you
        alone. The public site picks up changes on the next page load.
      </p>

      <div className="notice-region" role="status">
        {notice && (
          <div className={`alert alert--${notice.kind === 'error' ? 'error' : 'success'}`}>
            <p>{notice.text}</p>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {load.status === 'loading' && (
        <p className="admin-muted" role="status">
          Loading projects…
        </p>
      )}

      {load.status === 'error' && (
        <div className="alert alert--error" role="alert">
          <p>Could not load projects: {load.message}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {load.status === 'ready' && projects.length === 0 && (
        <div className="empty-panel">
          <h2 className="empty-panel__title">No projects yet</h2>
          <p className="admin-muted">
            Add your first project. It starts as a private draft until you publish it.
          </p>
          <div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setView({ mode: 'new' })}
            >
              Add project
            </button>
          </div>
        </div>
      )}

      {load.status === 'ready' && projects.length > 0 && (
        <ul className="items" role="list" aria-busy={reordering}>
          {projects.map((p, i) => {
            const rowBusy = busyId === p.id
            return (
              <li key={p.id} className="item">
                <div className="item__main">
                  <div className="item__title-row">
                    <span className="item__index" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h2 className="item__title">{p.title}</h2>
                    <span className={`badge ${p.published ? 'badge--live' : 'badge--draft'}`}>
                      {p.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  {p.kind && <p className="item__meta">{p.kind}</p>}
                </div>

                <div className="item__actions">
                  <button
                    type="button"
                    id={`up-${p.id}`}
                    className="btn btn--ghost btn--sm"
                    aria-label={`Move ${p.title} up`}
                    disabled={i === 0}
                    onClick={() => void move(p.id, -1)}
                  >
                    ↑ Up
                  </button>
                  <button
                    type="button"
                    id={`down-${p.id}`}
                    className="btn btn--ghost btn--sm"
                    aria-label={`Move ${p.title} down`}
                    disabled={i === projects.length - 1}
                    onClick={() => void move(p.id, 1)}
                  >
                    ↓ Down
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    aria-label={`Edit ${p.title}`}
                    onClick={() => {
                      setNotice(null)
                      setView({ mode: 'edit', id: p.id })
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    aria-label={`${p.published ? 'Unpublish' : 'Publish'} ${p.title}`}
                    disabled={rowBusy}
                    onClick={() => void togglePublish(p)}
                  >
                    {rowBusy ? 'Working…' : p.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger-ghost btn--sm"
                    aria-label={`Delete ${p.title}`}
                    onClick={() => setToDelete(p)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this project?"
        confirmLabel="Delete project"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      >
        <p>
          “{toDelete?.title}” will be permanently deleted. This cannot be undone. If you only want
          to hide it from visitors, use Unpublish instead.
        </p>
      </ConfirmDialog>
    </div>
  )
}