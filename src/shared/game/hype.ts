// Fake social-proof numbers: a viewer count that wanders and night totals that only grow. Derived
// from the clock (reset at noon) or an Rng so reloads never reset them mid-party.
import type { Rng } from './rng'

/** Seconds since the most recent local noon. */
export function secondsSinceNoon(ms: number): number {
  const noon = new Date(ms)
  noon.setHours(12, 0, 0, 0)
  if (noon.getTime() > ms) noon.setDate(noon.getDate() - 1)
  return Math.floor((ms - noon.getTime()) / 1000)
}

export const NIGHT_PAID_BASE = 1_250_000
export const NIGHT_PAID_PER_SECOND = 9

/** "Utbetalt i kväll": an inflated base that grows with the clock, plus the real payouts. */
export function nightPaidDisplay(ms: number, realPaid: number): number {
  return NIGHT_PAID_BASE + secondsSinceNoon(ms) * NIGHT_PAID_PER_SECOND + Math.max(0, realPaid)
}

export const VIEWERS_MIN = 2800
export const VIEWERS_MAX = 6500

export function initialViewers(rng: Rng): number {
  return 4000 + rng.int(800)
}

/** One step of the viewer count's random walk, bounced back inside VIEWERS_MIN..VIEWERS_MAX. */
export function stepViewers(viewers: number, rng: Rng): number {
  const next = viewers + Math.round(rng.float(-90, 120))
  if (next < VIEWERS_MIN) return VIEWERS_MIN + rng.int(400)
  if (next > VIEWERS_MAX) return VIEWERS_MAX - rng.int(400)
  return next
}
