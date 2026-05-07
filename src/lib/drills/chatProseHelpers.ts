/** Normalize pasted text: strip surrounding whitespace, collapse internal whitespace (tabs+spaces). */
export function normalizeCustomText(raw: string): string {
  return raw.trim().replace(/[\t ]+/g, ' ')
}
