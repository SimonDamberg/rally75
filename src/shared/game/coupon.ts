// Pure kupong code handling: what a scanned URL or a hand-typed code turns into before it goes to
// the server. Shared rather than client-local because the printed ticket on /gm/kuponger has to
// render the code exactly as the guest's phone shows it back.
//
// Codes are Crockford base32, which leaves out I, L, O and U precisely because they are the
// characters people misread off a printed card. The server normalises the same way (private
// .clean_coupon_code); this copy exists so the phone can tell "not a code at all" from "wrong code"
// without a round trip, and so the ticket and the reveal print the code the same way.
import { COUPON_CODE_LENGTH } from './economy'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/**
 * Uppercases, drops separators and maps the lookalikes (I and L to 1, O to 0). Returns '' for
 * anything that does not come out as a full code, so a caller can simply check for truthiness.
 */
export function normalizeCode(raw: string): string {
  const mapped = raw
    .toUpperCase()
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
  let out = ''
  for (const ch of mapped) if (ALPHABET.includes(ch)) out += ch
  return out.length === COUPON_CODE_LENGTH ? out : ''
}

/** Printed and shown in halves, so it can be read out loud across a noisy room: "ABCD-1234". */
export function formatCode(code: string): string {
  const half = Math.ceil(COUPON_CODE_LENGTH / 2)
  return code.length === COUPON_CODE_LENGTH ? `${code.slice(0, half)}-${code.slice(half)}` : code
}
