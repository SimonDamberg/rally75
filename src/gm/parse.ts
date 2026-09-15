// Pure input parsing for the GM forms.

/** "100", "+100", "-50" or "\u221250" (iPad minus) to an integer; null otherwise. */
export function parseDelta(text: string): number | null {
  const t = text.replace(/[\s\u00a0]/g, '').replace('\u2212', '-')
  return /^[-+]?\d{1,7}$/.test(t) && Number(t) !== 0 ? Number(t) : null
}

/** Textarea with one kusk comment per line to a clean list. */
export function parseNotes(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}
