/**
 * Finds items by what the visitor typed: a number (1-based position), an exact title,
 * the start of a title, or any part of a title, in that order of preference.
 */
export function findMatches<T>(
  items: readonly T[],
  query: string,
  title: (item: T) => string,
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  if (/^\d+$/.test(q)) {
    const item = items[Number(q) - 1]
    return item === undefined ? [] : [item]
  }

  const exact = items.filter((item) => title(item).toLowerCase() === q)
  if (exact.length > 0) return exact

  const starts = items.filter((item) => title(item).toLowerCase().startsWith(q))
  if (starts.length > 0) return starts

  return items.filter((item) => title(item).toLowerCase().includes(q))
}