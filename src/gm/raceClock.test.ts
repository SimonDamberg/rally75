import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { countdownAt, FINISH_PAUSE_MS, GO_MS, PHOTO_PAUSE_MS, raceView, runMs, skippedStart, START_COUNTDOWN_MS } from './raceClock'
import { TICKS, TICK_MS } from '../shared/game/sim'

const frames = Array.from({ length: TICKS + 1 }, (_, tick) => ({ tick }))
const timeline = (photo = false) => ({ frames, tickMs: TICK_MS, photo }) as never

describe('raceView', () => {
  it('clamps the tick to the timeline', () => {
    expect(raceView(-5000, timeline()).tick).toBe(0)
    expect(raceView(0, timeline()).tick).toBe(0)
    expect(raceView(TICK_MS * 10 + 1, timeline()).tick).toBe(10)
    expect(raceView(10 ** 9, timeline()).tick).toBe(TICKS)
  })

  it('runs, pauses on the finish, then is done', () => {
    const run = runMs(timeline())
    expect(run).toBe(TICKS * TICK_MS)
    expect(raceView(run - 1, timeline()).phase).toBe('running')
    expect(raceView(run, timeline())).toEqual({ tick: TICKS, phase: 'finishing' })
    expect(raceView(run + FINISH_PAUSE_MS - 1, timeline()).phase).toBe('finishing')
    expect(raceView(run + FINISH_PAUSE_MS, timeline()).phase).toBe('done')
  })

  it('holds a photo finish longer', () => {
    const run = runMs(timeline(true))
    expect(raceView(run + FINISH_PAUSE_MS, timeline(true)).phase).toBe('finishing')
    expect(raceView(run + PHOTO_PAUSE_MS, timeline(true)).phase).toBe('done')
  })

  it('Snabbspola lands on the finish and still pauses', () => {
    const now = 1_000_000
    const start = skippedStart(now, timeline())
    expect(raceView(now - start, timeline())).toEqual({ tick: TICKS, phase: 'finishing' })
    expect(raceView(now + FINISH_PAUSE_MS - start, timeline()).phase).toBe('done')
  })
})

describe('countdownAt', () => {
  it('counts 3, 2, 1 down to the start', () => {
    expect(countdownAt(-START_COUNTDOWN_MS)).toBe(3)
    expect(countdownAt(-2001)).toBe(3)
    expect(countdownAt(-2000)).toBe(2)
    expect(countdownAt(-1000)).toBe(1)
    expect(countdownAt(-1)).toBe(1)
  })

  it('never counts past the hold, however far off the clock is', () => {
    expect(countdownAt(-60_000)).toBe(3)
  })

  it('flashes KÖR over the first strides, then gets out of the way', () => {
    expect(countdownAt(0)).toBe('go')
    expect(countdownAt(GO_MS - 1)).toBe('go')
    expect(countdownAt(GO_MS)).toBe(null)
    expect(countdownAt(30_000)).toBe(null)
  })
})

describe('SQL mirror', () => {
  it('holds the start for as long as gm_set_status does', () => {
    const dir = join(import.meta.dirname, '..', '..', 'supabase', 'migrations')
    const file = readdirSync(dir)
      .filter((f) => f.endsWith('_start_countdown.sql'))
      .sort()
      .at(-1)!
    const sql = readFileSync(join(dir, file), 'utf8')
    expect(sql).toContain(`now() + interval '${START_COUNTDOWN_MS / 1000} seconds'`)
  })
})
