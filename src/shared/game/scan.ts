// What the in-app scanner makes of a decoded QR: a vinstkort, a printed kupong, or neither.
//
// A vinstkort holds "MRG1:<code>" rather than a URL on purpose. A phone's own camera app offers to
// open a URL, and a URL can be pasted into a group chat; a bare token means nothing outside the
// Mr Green app. It is still only friction (see *_prize_cards.sql): the real limits are server side.
//
// A kupong holds "<origin>/k/<code>", which the scanner cashes too, so a guest who is already in the
// app does not have to leave it for the camera.
import { normalizeCode } from './coupon'

/** The vinstkort prefix. The version digit leaves room for a new format without guessing. */
export const CARD_PREFIX = 'MRG1:'

export type ScanResult = { kind: 'card'; code: string } | { kind: 'coupon'; code: string }

/** What goes into a vinstkort's QR. */
export function cardPayload(code: string): string {
  return `${CARD_PREFIX}${code}`
}

/** Reads a decoded QR. Returns null for anything that is neither a vinstkort nor a kupong. */
export function parseScan(text: string): ScanResult | null {
  const raw = text.trim()
  if (raw.toUpperCase().startsWith(CARD_PREFIX)) {
    const code = normalizeCode(raw.slice(CARD_PREFIX.length))
    return code ? { kind: 'card', code } : null
  }
  // A kupong URL: any host, since a sheet may have been printed against a preview deploy.
  const m = /^https?:\/\/[^/\s]+\/k\/([^/?#\s]+)\/?(?:[?#].*)?$/i.exec(raw)
  if (m) {
    const code = normalizeCode(decodeURIComponent(m[1]))
    return code ? { kind: 'coupon', code } : null
  }
  return null
}
