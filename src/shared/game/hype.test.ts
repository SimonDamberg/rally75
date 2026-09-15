import { describe, expect, it } from 'vitest'
import {
  initialViewers,
  NIGHT_PAID_BASE,
  NIGHT_PAID_PER_SECOND,
  nightPaidDisplay,
  secondsSinceNoon,
  stepViewers,
  VIEWERS_MAX,
  VIEWERS_MIN,
} from './hype'
import { createRng } from './rng'

describe('secondsSinceNoon', () => {
  it('counts from today at noon in the afternoon', () => {
    expect(secondsSinceNoon(new Date(2026, 8, 15, 13, 0, 5).getTime())).toBe(3605)
  })

  it('counts from yesterday at noon before noon', () => {
    expect(secondsSinceNoon(new Date(2026, 8, 16, 1, 0, 0).getTime())).toBe(13 * 3600)
    expect(secondsSinceNoon(new Date(2026, 8, 16, 11, 59, 59).getTime())).toBe(24 * 3600 - 1)
  })

  it('is 0 at noon', () => {
    expect(secondsSinceNoon(new Date(2026, 8, 15, 12, 0, 0).getTime())).toBe(0)
  })
})

describe('nightPaidDisplay', () => {
  const t = new Date(2026, 8, 15, 22, 0, 0).getTime()

  it('adds the real payouts to the clock-grown base', () => {
    expect(nightPaidDisplay(t, 0)).toBe(NIGHT_PAID_BASE + 10 * 3600 * NIGHT_PAID_PER_SECOND)
    expect(nightPaidDisplay(t, 1234) - nightPaidDisplay(t, 0)).toBe(1234)
  })

  it('never shrinks while the night goes on', () => {
    let prev = 0
    for (let s = 0; s < 3600 * 6; s += 37) {
      const v = nightPaidDisplay(t + s * 1000, 500)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})

describe('viewer count', () => {
  it('stays inside its bounds over a long walk', () => {
    const rng = createRng(3)
    let v = initialViewers(rng)
    for (let i = 0; i < 20_000; i++) {
      v = stepViewers(v, rng)
      expect(v).toBeGreaterThanOrEqual(VIEWERS_MIN)
      expect(v).toBeLessThanOrEqual(VIEWERS_MAX)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('bounces back from the edges', () => {
    const rng = createRng(9)
    expect(stepViewers(VIEWERS_MIN - 500, rng)).toBeGreaterThanOrEqual(VIEWERS_MIN)
    expect(stepViewers(VIEWERS_MAX + 500, rng)).toBeLessThanOrEqual(VIEWERS_MAX)
  })
})
