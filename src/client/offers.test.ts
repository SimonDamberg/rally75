import { describe, expect, it } from 'vitest'
import { OFFERS } from '../shared/content/parody'
import { createRng } from '../shared/game/rng'
import { nextOfferDelay, OFFER_FIRST_MS, OFFER_GAP_MS, pickOffer } from './offers'

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

  it('draws the Stödlinje interruption far more often than any other offer', () => {
    const rng = createRng(3)
    const counts = new Map<string, number>()
    let last: string | null = null
    for (let i = 0; i < 20_000; i++) {
      const o = pickOffer(rng, OFFERS, last)
      counts.set(o.id, (counts.get(o.id) ?? 0) + 1)
      last = o.id
    }
    const stod = counts.get('stodlinje') ?? 0
    // Weight 4 against six at 1, never twice in a row: roughly every third pop-up.
    expect(stod / 20_000).toBeGreaterThan(0.25)
    for (const [id, n] of counts) if (id !== 'stodlinje') expect(stod).toBeGreaterThan(2 * n)
  })

  it('the Stödlinje offer rings the help line and has its photo', () => {
    const o = OFFERS.find((x) => x.id === 'stodlinje')
    expect(o).toMatchObject({ call: true, image: '/offers/stodlinje.jpg' })
    expect(o?.title).toMatch(/^STOP!/)
  })

  it('has unique offer ids', () => {
    expect(new Set(OFFERS.map((o) => o.id)).size).toBe(OFFERS.length)
  })
})
