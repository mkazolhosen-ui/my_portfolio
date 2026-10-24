import { client, toError, NOT_APPLIED } from '../apiHelpers'
import type { SkillGroupRow, SkillValues } from './types'

const COLUMNS = 'id, title, description, items, sort_order, published'

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

function parseRow(r: Record<string, unknown>): SkillGroupRow {
  return {
    id: str(r.id),
    title: str(r.title),
    description: str(r.description),
    items: Array.isArray(r.items) ? r.items.filter((x): x is string => typeof x === 'string') : [],
    sort_order: typeof r.sort_order === 'number' ? r.sort_order : 0,
    published: r.published === true,
  }
}

const rows = (data: unknown) => (Array.isArray(data) ? (data as Record<string, unknown>[]) : [])

export async function listSkillGroups(): Promise<SkillGroupRow[]> {
  const { data, error } = await client()
    .from('skill_groups')
    .select(COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw toError(error)
  return rows(data).map(parseRow)
}

export async function createSkillGroup(
  values: SkillValues,
  sortOrder: number,
): Promise<SkillGroupRow> {
  const { data, error } = await client()
    .from('skill_groups')
    .insert({ ...values, sort_order: sortOrder })
    .select(COLUMNS)
    .single()
  if (error) throw toError(error)
  return parseRow(data as unknown as Record<string, unknown>)
}

export async function updateSkillGroup(id: string, values: SkillValues): Promise<SkillGroupRow> {
  const { data, error } = await client()
    .from('skill_groups')
    .update(values)
    .eq('id', id)
    .select(COLUMNS)
  if (error) throw toError(error)
  const found = rows(data)
  // RLS can make an update match zero rows without raising an error, so check explicitly.
  if (found.length !== 1) throw new Error(NOT_APPLIED)
  return parseRow(found[0])
}

export async function setSkillGroupPublished(
  id: string,
  published: boolean,
): Promise<SkillGroupRow> {
  const { data, error } = await client()
    .from('skill_groups')
    .update({ published })
    .eq('id', id)
    .select(COLUMNS)
  if (error) throw toError(error)
  const found = rows(data)
  if (found.length !== 1) throw new Error(NOT_APPLIED)
  return parseRow(found[0])
}

export async function deleteSkillGroup(id: string): Promise<void> {
  const { data, error } = await client().from('skill_groups').delete().eq('id', id).select('id')
  if (error) throw toError(error)
  if (!data || data.length !== 1) throw new Error(NOT_APPLIED)
}

export async function reorderSkillGroups(ids: string[]): Promise<void> {
  const { data, error } = await client().rpc('reorder_skill_groups', { ids })
  if (error) throw toError(error)
  if (data !== ids.length) throw new Error(NOT_APPLIED)
}