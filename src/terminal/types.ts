import type { SiteContent } from '../content/types'
import type { KnowledgeFact } from '../knowledge/fallbackFacts'
import type { ProfileData } from './profileData'

/** One piece of terminal output. Each one is drawn as plain monospace lines. */
export type OutputBlock =
  | { kind: 'text'; text: string; tone?: 'default' | 'muted' | 'accent'; spaced?: boolean }
  | { kind: 'list'; items: string[] }
  | { kind: 'links'; items: { label: string; href: string; display?: string }[] }
  /** Command names on one line; each is clickable and runs that command. */
  | { kind: 'commands'; lead?: string; names: string[] }
  /** Lines the visitor can click to run a follow-up command, e.g. "projects 2". */
  | {
      kind: 'choices'
      items: { command: string; prefix?: string; label: string; note?: string }[]
    }
  | { kind: 'error'; text: string }

/** One command the visitor ran (input) and what it printed. input is null for system lines. */
export interface Entry {
  id: number
  input: string | null
  blocks: OutputBlock[]
}

/** Everything a command is allowed to read. All of it is public information. */
export interface CommandContext {
  content: SiteContent
  facts: readonly KnowledgeFact[]
  profile: ProfileData
}

export interface CommandResult {
  blocks: OutputBlock[]
  /** When true, the screen is wiped instead of showing the blocks. */
  clear?: boolean
}

export interface Command {
  name: string
  summary: string
  /** Shown by "help <command>". */
  usage: string
  example?: string
  run: (args: string[], context: CommandContext) => CommandResult
}