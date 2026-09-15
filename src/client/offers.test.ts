import { describe, expect, it } from 'vitest'
import { OFFERS } from '../shared/content/parody'
import { createRng } from '../shared/game/rng'
import { COUNTDOWN_S, countdown, fmtClock, nextOfferDelay, OFFER_FIRST_MS, OFFER_GAP_MS, pickOffer } from './offers'

describe('nextOfferDelay', () => {
  it('waits the first delay, then a gap inside the range', () => {
    const rng = createRng(1)
    expect(nextOfferDelay(rng, true)).toBe(OFFER_FIRST_MS)
    for (let i = 0; i < 500; i++) {
      const d = nextOfferDelay(rng, false)
      expect(d).toBeGreaterThanOrEqual(OFFER_GAP_MS[0])
      expect(d).toBeLessThanOrEqual(OFFER_GAP_MS[1])
    }
  })
})

describe('pickOffer', () => {
  it('never repeats the last offer', () => {
    const rng = createRng(2)
    let last: string | null = null
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) {
      const o = pickOffer(rng, OFFERS, last)
      expect(o.id).not.toBe(last)
      seen.add(o.id)
      last = o.id
    }
    expect(seen.size).toBe(OFFERS.length)
  })

  it('has unique offer ids', () => {
    expect(new Set(OFFERS.map((o) => o.id)).size).toBe(OFFERS.length)
  })
})

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
