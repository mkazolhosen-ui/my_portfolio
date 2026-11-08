export type Completion =
  | { kind: 'none' }
  | { kind: 'single'; name: string }
  | { kind: 'many'; common: string; matches: string[] }

/** What Tab should do for a half-typed command name. Case-insensitive; a leading "/" is ignored. */
export function completeCommand(typed: string, names: readonly string[]): Completion {
  const prefix = typed.replace(/^\/+/, '').toLowerCase()
  if (!prefix) return { kind: 'none' }

  const matches = names.filter((name) => name.startsWith(prefix))
  if (matches.length === 0) return { kind: 'none' }
  if (matches.length === 1) return { kind: 'single', name: matches[0] }

  // The longest start that all matches share, e.g. "co" for "contact" and "complete".
  let common = matches[0]
  for (const match of matches) {
    while (!match.startsWith(common)) common = common.slice(0, -1)
  }
  return { kind: 'many', common, matches }
}