import type { ContactLink, Project, SkillGroup } from '../config/site'

/** The editable content of the public site. Identical in shape whether it comes from Supabase or site.ts. */
export interface SiteContent {
  name: string
  eyebrow: string
  heroName: string[]
  tagline: string
  intro: string
  about: {
    paragraphs: string[]
    focus: string[]
  }
  projects: Project[]
  skills: SkillGroup[]
  contact: {
    heading: string
    message: string
    links: ContactLink[]
  }
}

export type ContentStatus = 'loading' | 'ready'
export type ContentSource = 'supabase' | 'fallback'

export interface ContentState {
  status: ContentStatus
  source: ContentSource
  content: SiteContent
}