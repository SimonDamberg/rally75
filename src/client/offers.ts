// Pop-up offer engine, the pure part: when the next offer comes, which one, and the countdown that
// restarts every time it runs out.
import type { OfferCopy } from '../shared/content/parody'
import { createRng, type Rng } from '../shared/game/rng'

/** First offer after the shell opens. */
export const OFFER_FIRST_MS = 45_000
/** Gap after an offer closes. */
export const OFFER_GAP_MS = [120_000, 180_000] as const
/** Minimum wait after another pop-up (reveal, confirm, Snabblån) gets out of the way. */
export const OFFER_RESUME_MS = 15_000
/** Each countdown cycle lasts this many seconds (inclusive). */
export const COUNTDOWN_S = [30, 90] as const
/** How long "Förlängt!" shows after a restart. */
export const EXTENDED_MS = 2500

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

function cycleSeconds(seed: number, cycle: number): number {
  const [lo, hi] = COUNTDOWN_S
  return lo + createRng(seed + cycle).int(hi - lo + 1)
}

export interface Countdown {
  /** Whole seconds left in this cycle, never 0 (it restarts instead). */
  seconds: number
  /** 0 for the first run, then 1, 2, ... after each restart. */
  cycle: number
  /** Time spent in the current cycle. */
  msIntoCycle: number
}

/** The countdown after `elapsedMs`; each cycle gets a new length from the seed. */
export function countdown(elapsedMs: number, seed: number): Countdown {
  let rest = Math.max(0, elapsedMs)
  let cycle = 0
  for (;;) {
    const len = cycleSeconds(seed, cycle) * 1000
    if (rest < len) return { seconds: Math.ceil((len - rest) / 1000), cycle, msIntoCycle: rest }
    rest -= len
    cycle++
  }
}

/** 47 -> "0:47" */
export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
