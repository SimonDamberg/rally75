import { describe, expect, it } from 'vitest'
import { FINISH_PAUSE_MS, PHOTO_PAUSE_MS, raceView, runMs, skippedStart } from './raceClock'
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
