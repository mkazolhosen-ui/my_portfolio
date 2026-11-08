/** Longest input the terminal will look at. Anything beyond this is cut off. */
export const MAX_INPUT_LENGTH = 200

export interface ParsedInput {
  name: string
  args: string[]
}

/**
 * Turns what the visitor typed into a command name and arguments.
 * Case-insensitive, and a leading "/" is allowed (so "/help" works too).
 * Returns null for empty input.
 */
export function parseInput(raw: string): ParsedInput | null {
  const trimmed = raw.trim().slice(0, MAX_INPUT_LENGTH)
  const parts = trimmed.replace(/^\/+/, '').split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null

  const [name, ...args] = parts
  return { name: name.toLowerCase(), args }
}

/** Number of single-character edits needed to turn a into b (used for "did you mean"). */
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
    }
    previous = current
  }

  return previous[b.length]
}