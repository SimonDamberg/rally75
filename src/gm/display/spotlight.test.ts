import { describe, expect, it } from 'vitest'
import { SPOTLIGHT_MS, spotlightIndex, spotlightRemaining } from './spotlight'

describe('spotlightIndex', () => {
  it('holds each horse for one period, then moves on', () => {
    expect(spotlightIndex(0, 4, 1000)).toBe(0)
    expect(spotlightIndex(999, 4, 1000)).toBe(0)
    expect(spotlightIndex(1000, 4, 1000)).toBe(1)
    expect(spotlightIndex(2500, 4, 1000)).toBe(2)
    expect(spotlightIndex(3999, 4, 1000)).toBe(3)
  })

  it('wraps back to the first horse', () => {
    expect(spotlightIndex(4000, 4, 1000)).toBe(0)
    expect(spotlightIndex(4001, 4, 1000)).toBe(0)
    expect(spotlightIndex(9000, 4, 1000)).toBe(1)
  })

  it('is a pure function of time, so a reload resumes on the same horse', () => {
    const at = 7 * SPOTLIGHT_MS + 1234
    expect(spotlightIndex(at, 4)).toBe(spotlightIndex(at, 4))
    expect(spotlightIndex(at, 4)).toBe(3)
  })

  it('survives a field of one and an empty field', () => {
    expect(spotlightIndex(50_000, 1, 1000)).toBe(0)
    expect(spotlightIndex(50_000, 0, 1000)).toBe(0)
  })

  it('clamps nonsense input to the first horse', () => {
    expect(spotlightIndex(-5000, 4, 1000)).toBe(0)
    expect(spotlightIndex(Number.NaN, 4, 1000)).toBe(0)
    expect(spotlightIndex(1000, 4, 0)).toBe(0)
  })
})

describe('spotlightRemaining', () => {
  it('counts down within the period', () => {
    expect(spotlightRemaining(0, 1000)).toBe(1000)
    expect(spotlightRemaining(250, 1000)).toBe(750)
    expect(spotlightRemaining(999, 1000)).toBe(1)
  })

  it('resets at every handover', () => {
    expect(spotlightRemaining(1000, 1000)).toBe(1000)
    expect(spotlightRemaining(4200, 1000)).toBe(800)
  })
})
