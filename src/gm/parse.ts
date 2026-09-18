// Pure input parsing for the GM forms.
import { COUPON_MAX_BATCH } from '../shared/game/economy'

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

/** "500" to 500 for a shop price; null when it is not a whole, non-negative number. */
export function parsePrice(text: string): number | null {
  const t = text.replace(/[\s\u00a0]/g, '')
  return /^\d{1,7}$/.test(t) ? Number(t) : null
}

/**
 * Shop stock. An empty field means obegränsat, which is a real value, so the three cases are kept
 * apart: undefined for "leave the shelf uncounted", a number, or null for "that is not a number".
 */
export function parseStock(text: string): number | null | undefined {
  const t = text.replace(/[\s\u00a0]/g, '')
  if (t === '') return undefined
  return /^\d{1,7}$/.test(t) ? Number(t) : null
}

/** How many kuponger to mint in one print run; null outside 1..COUPON_MAX_BATCH. */
export function parseCount(text: string): number | null {
  const t = text.replace(/[\s\u00a0]/g, '')
  if (!/^\d{1,4}$/.test(t)) return null
  const n = Number(t)
  return n >= 1 && n <= COUPON_MAX_BATCH ? n : null
}
