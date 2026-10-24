import { client, toError, NOT_APPLIED } from '../apiHelpers'

/** The single site_content row (hero, About and Contact text). */
export interface SiteRow {
  site_name: string
  eyebrow: string
  hero_name: string[]
  tagline: string
  intro: string
  about_paragraphs: string[]
  about_focus: string[]
  contact_heading: string
  contact_message: string
  updated_at: string
}

/** Editors send only the columns they own, so saving one page never overwrites another. */
export type SitePatch = Partial<Omit<SiteRow, 'updated_at'>>

const COLUMNS =
  'site_name, eyebrow, hero_name, tagline, intro, about_paragraphs, about_focus, contact_heading, contact_message, updated_at'

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

function parseRow(r: Record<string, unknown>): SiteRow {
  return {
    site_name: str(r.site_name),
    eyebrow: str(r.eyebrow),
    hero_name: strs(r.hero_name),
    tagline: str(r.tagline),
    intro: str(r.intro),
    about_paragraphs: strs(r.about_paragraphs),
    about_focus: strs(r.about_focus),
    contact_heading: str(r.contact_heading),
    contact_message: str(r.contact_message),
    updated_at: str(r.updated_at),
  }
}

export async function getSiteRow(): Promise<SiteRow> {
  const { data, error } = await client()
    .from('site_content')
    .select(COLUMNS)
    .eq('id', true)
    .maybeSingle()
  if (error) throw toError(error)
  if (!data) throw new Error('The site content row is missing. Re-run 02_seed.sql.')
  return parseRow(data as unknown as Record<string, unknown>)
}

export async function updateSiteRow(patch: SitePatch): Promise<SiteRow> {
  const { data, error } = await client()
    .from('site_content')
    .update(patch)
    .eq('id', true)
    .select(COLUMNS)
  if (error) throw toError(error)
  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  if (rows.length !== 1) throw new Error(NOT_APPLIED)
  return parseRow(rows[0])
}