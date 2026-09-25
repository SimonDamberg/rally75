import { describe, expect, it } from 'vitest'
import { COUNTDOWN_S, countdown, fmtClock } from './countdown'

describe('countdown', () => {
  it('starts full and ticks down', () => {
    const first = countdown(0, 42)
    expect(first.cycle).toBe(0)
    expect(first.seconds).toBeGreaterThanOrEqual(COUNTDOWN_S[0])
    expect(first.seconds).toBeLessThanOrEqual(COUNTDOWN_S[1])
    expect(countdown(1500, 42).seconds).toBe(first.seconds - 1)
  })

  it('restarts with a new cycle instead of reaching zero', () => {
    const len = countdown(0, 7).seconds * 1000
    expect(countdown(len - 1, 7)).toMatchObject({ seconds: 1, cycle: 0 })
    expect(countdown(len, 7)).toMatchObject({ cycle: 1, msIntoCycle: 0 })
    for (let ms = 0; ms < 600_000; ms += 333) {
      const c = countdown(ms, 7)
      expect(c.seconds).toBeGreaterThan(0)
      expect(c.seconds).toBeLessThanOrEqual(COUNTDOWN_S[1])
    }
  })

  it('is deterministic for a seed', () => {
    expect(countdown(123_456, 99)).toEqual(countdown(123_456, 99))
  })
})

describe('fmtClock', () => {
  it('formats minutes and seconds', () => {
    expect(fmtClock(47)).toBe('0:47')
    expect(fmtClock(90)).toBe('1:30')
    expect(fmtClock(5)).toBe('0:05')
  })
})
