/** Only web links and email links are ever allowed. Anything else (javascript:, data:, ...) is dropped. */
export function safeHref(value: string): string | null {
  return /^(https?:\/\/|mailto:)\S+$/i.test(value) ? value : null
}