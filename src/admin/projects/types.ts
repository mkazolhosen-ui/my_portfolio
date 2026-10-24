/** A project as stored in the database (admin view, drafts included). */
export interface ProjectRow {
  id: string
  title: string
  kind: string
  description: string
  tags: string[]
  live_url: string
  repo_url: string
  sort_order: number
  published: boolean
}

/** What the form edits: everything is a string so inputs stay controlled. */
export interface ProjectFormValues {
  title: string
  kind: string
  description: string
  tagsText: string
  liveUrl: string
  repoUrl: string
  published: boolean
}

/** Cleaned, validated values ready to send to the database. */
export interface ProjectValues {
  title: string
  kind: string
  description: string
  tags: string[]
  live_url: string
  repo_url: string
  published: boolean
}