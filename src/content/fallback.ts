import { site } from '../config/site'
import type { SiteContent } from './types'

/** The original hard-coded content. Used whenever Supabase is unavailable. */
export const fallbackContent: SiteContent = {
  name: site.name,
  eyebrow: site.eyebrow,
  heroName: site.heroName,
  tagline: site.tagline,
  intro: site.intro,
  about: site.about,
  projects: site.projects,
  skills: site.skills,
  contact: site.contact,
}