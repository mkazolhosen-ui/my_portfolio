/** Trims every entry and drops blank ones. */
export function cleanList(items: string[]): string[] {
  return items.map((s) => s.trim()).filter((s) => s.length > 0)
}

/** Splits on any whitespace and drops empty pieces. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0)
}