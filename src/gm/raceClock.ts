// Pure race clock for the GM race screen. The whole timeline is known up front, so what is on
// screen is a function of the time since the start: a reload or Snabbspola just moves the start.
import type { RaceTimeline } from '../shared/game/types'

/**
 * Hold on the finish before the result goes out: long enough for the display's winner stamp and
 * coin rain, and for a photo finish, the scan line sweeping to the winner's nose.
 */
export const FINISH_PAUSE_MS = 3000
export const PHOTO_PAUSE_MS = 4200

/** running: horses moving. finishing: finish line crossed, pause. done: publish or rule. */
export type RacePhase = 'running' | 'finishing' | 'done'

export interface RaceView {
  tick: number
  phase: RacePhase
}

type Clocked = Pick<RaceTimeline, 'frames' | 'tickMs' | 'photo'>

/** Time from the start until the last frame. */
export function runMs(timeline: Clocked): number {
  return (timeline.frames.length - 1) * timeline.tickMs
}

export function pauseMs(timeline: Clocked): number {
  return timeline.photo ? PHOTO_PAUSE_MS : FINISH_PAUSE_MS
}

export function raceView(elapsedMs: number, timeline: Clocked): RaceView {
  const last = timeline.frames.length - 1
  const tick = Math.min(last, Math.max(0, Math.floor(elapsedMs / timeline.tickMs)))
  const run = runMs(timeline)
  const phase: RacePhase = elapsedMs < run ? 'running' : elapsedMs < run + pauseMs(timeline) ? 'finishing' : 'done'
  return { tick, phase }
}

/** Snabbspola: the start time that puts `now` on the last frame (the finish pause still runs). */
export function skippedStart(now: number, timeline: Clocked): number {
  return now - runMs(timeline)
}
