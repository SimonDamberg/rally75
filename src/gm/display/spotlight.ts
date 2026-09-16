// Which horse the display iPad is presenting while betting is open.
//
// Pure function of elapsed time, like raceClock: a reload lands on the horse the room was already
// looking at instead of restarting the rotation.

/** How long each horse holds the screen. */
export const SPOTLIGHT_MS = 9000

export function spotlightIndex(elapsedMs: number, count: number, periodMs: number = SPOTLIGHT_MS): number {
  if (count <= 0) return 0
  if (!Number.isFinite(elapsedMs) || periodMs <= 0) return 0
  // Floor towards the first horse for negative elapsed (a clock that measured slightly ahead).
  const steps = Math.floor(Math.max(0, elapsedMs) / periodMs)
  return steps % count
}

/** Milliseconds until the spotlight moves on, for the progress bar under the card. */
export function spotlightRemaining(elapsedMs: number, periodMs: number = SPOTLIGHT_MS): number {
  if (!Number.isFinite(elapsedMs) || periodMs <= 0) return periodMs
  return periodMs - (Math.max(0, elapsedMs) % periodMs)
}
