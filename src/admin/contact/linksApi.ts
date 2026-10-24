import { client, toError, NOT_APPLIED } from '../apiHelpers'
import type { LinkRow, LinkValues } from './types'

const COLUMNS = 'id, label, display, href, sort_order, published'

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

function parseRow(r: Record<string, unknown>): LinkRow {
  return {
    id: str(r.id),
    label: str(r.label),
    display: str(r.display),
    href: str(r.href),
    sort_order: typeof r.sort_order === 'number' ? r.sort_order : 0,
    published: r.published === true,
  }
}

const rows = (data: unknown) => (Array.isArray(data) ? (data as Record<string, unknown>[]) : [])

export async function listLinks(): Promise<LinkRow[]> {
  const { data, error } = await client()
    .from('contact_links')
    .select(COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw toError(error)
  return rows(data).map(parseRow)
}

export async function createLink(values: LinkValues, sortOrder: number): Promise<LinkRow> {
  const { data, error } = await client()
    .from('contact_links')
    .insert({ ...values, sort_order: sortOrder })
    .select(COLUMNS)
    .single()
  if (error) throw toError(error)
  return parseRow(data as unknown as Record<string, unknown>)
}

export async function updateLink(id: string, values: LinkValues): Promise<LinkRow> {
  const { data, error } = await client()
    .from('contact_links')
    .update(values)
    .eq('id', id)
    .select(COLUMNS)
  if (error) throw toError(error)
  const found = rows(data)
  // RLS can make an update match zero rows without raising an error, so check explicitly.
  if (found.length !== 1) throw new Error(NOT_APPLIED)
  return parseRow(found[0])
}

export async function setLinkPublished(id: string, published: boolean): Promise<LinkRow> {
  const { data, error } = await client()
    .from('contact_links')
    .update({ published })
    .eq('id', id)
    .select(COLUMNS)
  if (error) throw toError(error)
  const found = rows(data)
  if (found.length !== 1) throw new Error(NOT_APPLIED)
  return parseRow(found[0])
}

export async function deleteLink(id: string): Promise<void> {
  const { data, error } = await client().from('contact_links').delete().eq('id', id).select('id')
  if (error) throw toError(error)
  if (!data || data.length !== 1) throw new Error(NOT_APPLIED)
}

export async function reorderLinks(ids: string[]): Promise<void> {
  const { data, error } = await client().rpc('reorder_contact_links', { ids })
  if (error) throw toError(error)
  if (data !== ids.length) throw new Error(NOT_APPLIED)
}