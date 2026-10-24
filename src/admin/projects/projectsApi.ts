import { supabase } from '../../lib/supabase'
import type { ProjectRow, ProjectValues } from './types'

const COLUMNS = 'id, title, kind, description, tags, live_url, repo_url, sort_order, published'

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

function parseRow(r: Record<string, unknown>): ProjectRow {
  return {
    id: str(r.id),
    title: str(r.title),
    kind: str(r.kind),
    description: str(r.description),
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : [],
    live_url: str(r.live_url),
    repo_url: str(r.repo_url),
    sort_order: typeof r.sort_order === 'number' ? r.sort_order : 0,
    published: r.published === true,
  }
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

/** Turns database errors into messages a person can act on. */
function toError(error: { code?: string; message?: string }): Error {
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

const NOT_APPLIED =
  'The change was not applied. The project may have been deleted, or you may not have permission.'

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.'
}

export async function listProjects(): Promise<ProjectRow[]> {
  const { data, error } = await client()
    .from('projects')
    .select(COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw toError(error)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(parseRow)
}

export async function createProject(values: ProjectValues, sortOrder: number): Promise<ProjectRow> {
  const { data, error } = await client()
    .from('projects')
    .insert({ ...values, sort_order: sortOrder })
    .select(COLUMNS)
    .single()
  if (error) throw toError(error)
  return parseRow(data as unknown as Record<string, unknown>)
}

export async function updateProject(id: string, values: ProjectValues): Promise<ProjectRow> {
  const { data, error } = await client()
    .from('projects')
    .update(values)
    .eq('id', id)
    .select(COLUMNS)
  if (error) throw toError(error)
  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  // RLS can make an update match zero rows without raising an error, so check explicitly.
  if (rows.length !== 1) throw new Error(NOT_APPLIED)
  return parseRow(rows[0])
}

export async function setProjectPublished(id: string, published: boolean): Promise<ProjectRow> {
  const { data, error } = await client()
    .from('projects')
    .update({ published })
    .eq('id', id)
    .select(COLUMNS)
  if (error) throw toError(error)
  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  if (rows.length !== 1) throw new Error(NOT_APPLIED)
  return parseRow(rows[0])
}

export async function deleteProject(id: string): Promise<void> {
  const { data, error } = await client().from('projects').delete().eq('id', id).select('id')
  if (error) throw toError(error)
  if (!data || data.length !== 1) throw new Error(NOT_APPLIED)
}

/** Persists a new order. The database function renumbers sort_order as 10, 20, 30... */
export async function reorderProjects(ids: string[]): Promise<void> {
  const { data, error } = await client().rpc('reorder_projects', { ids })
  if (error) throw toError(error)
  if (data !== ids.length) throw new Error(NOT_APPLIED)
}