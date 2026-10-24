import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Tally {
  published: number
  draft: number
}

interface Counts {
  projects: Tally
  skills: Tally
  links: Tally
  updatedAt: string | null
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; counts: Counts }

function tally(rows: unknown): Tally {
  const list = Array.isArray(rows) ? (rows as { published?: unknown }[]) : []
  const published = list.filter((r) => r.published === true).length
  return { published, draft: list.length - published }
}

function StatCard({ label, value }: { label: string; value: Tally }) {
  return (
    <div className="stat">
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value.published + value.draft}</p>
      <p className="stat__meta">
        {value.published} published · {value.draft} draft
      </p>
    </div>
  )
}

export default function Dashboard() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const client = supabase
    if (!client) return
    let active = true

    ;(async () => {
      try {
        // These run with the admin's session, so RLS lets them see drafts too.
        const [projects, skills, links, site] = await Promise.all([
          client.from('projects').select('published'),
          client.from('skill_groups').select('published'),
          client.from('contact_links').select('published'),
          client.from('site_content').select('updated_at').eq('id', true).maybeSingle(),
        ])

        const failed = projects.error ?? skills.error ?? links.error ?? site.error
        if (failed) throw new Error(failed.message)

        const updated = (site.data as { updated_at?: unknown } | null)?.updated_at
        if (active) {
          setState({
            status: 'ready',
            counts: {
              projects: tally(projects.data),
              skills: tally(skills.data),
              links: tally(links.data),
              updatedAt: typeof updated === 'string' ? updated : null,
            },
          })
        }
      } catch (e) {
        if (active) {
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'Unknown error.',
          })
        }
      }
    })()

    return () => {
      active = false
    }
  }, [attempt])

  function refresh() {
    setState({ status: 'loading' })
    setAttempt((a) => a + 1)
  }

  return (
    <div className="container admin-container">
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="admin-page-title">Dashboard</h1>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={refresh}
          disabled={state.status === 'loading'}
        >
          Refresh
        </button>
      </div>

      {state.status === 'loading' && (
        <p className="admin-muted" role="status">
          Loading content summary…
        </p>
      )}

      {state.status === 'error' && (
        <div className="alert alert--error" role="alert">
          <p>Could not load the summary: {state.message}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <div className="stats">
            <StatCard label="Projects" value={state.counts.projects} />
            <StatCard label="Skill groups" value={state.counts.skills} />
            <StatCard label="Contact links" value={state.counts.links} />
          </div>

          <p className="admin-muted">
            Counts are read with your admin session, so drafts are included. Visitors only
            ever receive published items.
            {state.counts.updatedAt &&
              ` Site text last edited ${new Date(state.counts.updatedAt).toLocaleString()}.`}
          </p>

         <div className="admin-soon">
            <h2 className="admin-soon__title">Editors</h2>
            <p className="admin-muted">
              Use the tabs above to edit the hero text, About section, projects, skills, contact
              text and links.
            </p>
          </div>
        </>
      )}
    </div>
  )
}