// Pop-up offer engine, the pure part: when the next offer comes and which one. The countdown that
// restarts every time it runs out is in src/shared/game/countdown.ts (the GM preview draws it too).
import type { OfferCopy } from '../shared/content/parody'
import type { Rng } from '../shared/game/rng'

/** First offer after the shell opens. */
export const OFFER_FIRST_MS = 45_000
/** Gap after an offer closes. */
export const OFFER_GAP_MS = [120_000, 180_000] as const
/** Minimum wait after another pop-up (reveal, confirm, Snabblån) gets out of the way. */
export const OFFER_RESUME_MS = 15_000

export function nextOfferDelay(rng: Rng, first: boolean): number {
  if (first) return OFFER_FIRST_MS
  const [lo, hi] = OFFER_GAP_MS
  return lo + rng.int(hi - lo + 1)
}

/** A random offer by `weight` (default 1), never the one shown last. */
export function pickOffer(rng: Rng, offers: readonly OfferCopy[], lastId: string | null): OfferCopy {
  const pool = offers.length > 1 ? offers.filter((o) => o.id !== lastId) : offers
  const total = pool.reduce((sum, o) => sum + (o.weight ?? 1), 0)
  let r = rng.float(0, total)
  for (const o of pool) {
    r -= o.weight ?? 1
    if (r < 0) return o
  }
  return pool[pool.length - 1]
}
