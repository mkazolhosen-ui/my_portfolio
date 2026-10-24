import { supabase } from '../lib/supabase'
import type { ContactLink, Project, SkillGroup } from '../config/site'
import { fallbackContent } from './fallback'
import type { SiteContent } from './types'

type Row = Record<string, unknown>

// Defensive helpers: never trust the shape of remote data blindly.
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
const rowsOf = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : [])

// The database already enforces these formats. This is a second line of defence for hrefs.
const httpUrl = (v: unknown): string => {
  const s = str(v)
  return /^https?:\/\/\S+$/i.test(s) ? s : ''
}
const linkHref = (v: unknown): string => {
  const s = str(v)
  return /^(https?:\/\/|mailto:)\S+$/i.test(s) ? s : ''
}

/**
 * Loads the published public content from Supabase.
 * Throws on any problem (not configured, network error, RLS/DB error, missing row, abort),
 * and the caller then falls back to site.ts.
 */
export async function loadContent(signal: AbortSignal): Promise<SiteContent> {
  if (!supabase) {
    throw new Error('Supabase is not configured (missing VITE_ environment variables).')
  }

  const [siteRes, projectsRes, skillsRes, linksRes] = await Promise.all([
    supabase
      .from('site_content')
      .select(
        'site_name, eyebrow, hero_name, tagline, intro, about_paragraphs, about_focus, contact_heading, contact_message',
      )
      .eq('id', true)
      .abortSignal(signal)
      .maybeSingle(),

    supabase
      .from('projects')
      .select('title, kind, description, tags, live_url, repo_url')
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .abortSignal(signal),

    supabase
      .from('skill_groups')
      .select('title, description, items')
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .abortSignal(signal),

    supabase
      .from('contact_links')
      .select('label, display, href')
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .abortSignal(signal),
  ])

  const failed = siteRes.error ?? projectsRes.error ?? skillsRes.error ?? linksRes.error
  if (failed) throw new Error(failed.message)
  if (!siteRes.data) throw new Error('The site_content row was not found.')

  const s = siteRes.data as Row
  const heroName = strs(s.hero_name)

  const projects = rowsOf(projectsRes.data).map(
    (r): Project => ({
      title: str(r.title),
      kind: str(r.kind),
      description: str(r.description),
      tags: strs(r.tags),
      liveUrl: httpUrl(r.live_url),
      repoUrl: httpUrl(r.repo_url),
    }),
  )

  const skills = rowsOf(skillsRes.data).map(
    (r): SkillGroup => ({
      title: str(r.title),
      description: str(r.description),
      items: strs(r.items),
    }),
  )

  const links = rowsOf(linksRes.data).map(
    (r): ContactLink => ({
      label: str(r.label),
      display: str(r.display),
      href: linkHref(r.href),
    }),
  )

  return {
    name: str(s.site_name) || fallbackContent.name,
    eyebrow: str(s.eyebrow) || fallbackContent.eyebrow,
    heroName: heroName.length > 0 ? heroName : fallbackContent.heroName,
    tagline: str(s.tagline),
    intro: str(s.intro),
    about: {
      paragraphs: strs(s.about_paragraphs),
      focus: strs(s.about_focus),
    },
    projects,
    skills,
    contact: {
      heading: str(s.contact_heading),
      message: str(s.contact_message),
      links,
    },
  }
}