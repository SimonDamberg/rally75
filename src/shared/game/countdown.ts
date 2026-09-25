// The fake "offer expires" countdown: it never reaches zero, it restarts with a new length. Used by
// the guest's offer pop-ups, the landing page and the GM's offer preview. Pure, seeded.
import { createRng } from './rng'

/** Each countdown cycle lasts this many seconds (inclusive). */
export const COUNTDOWN_S = [30, 90] as const
/** How long "Förlängt!" shows after a restart. */
export const EXTENDED_MS = 2500

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
