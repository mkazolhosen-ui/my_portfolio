/** A contact link as stored in the database (admin view, drafts included). */
export interface LinkRow {
  id: string
  label: string
  display: string
  href: string
  sort_order: number
  published: boolean
}

export interface LinkFormValues {
  label: string
  display: string
  href: string
  published: boolean
}

export interface LinkValues {
  label: string
  display: string
  href: string
  published: boolean
}