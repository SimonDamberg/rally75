import { describe, expect, it } from 'vitest'
import { parseCount, parseDelta, parseNotes, parsePrice, parseStock } from './parse'
import { COUPON_MAX_BATCH } from '../shared/game/economy'

describe('parseDelta', () => {
  it('reads signed integers, including the typographic minus', () => {
    expect(parseDelta('100')).toBe(100)
    expect(parseDelta('+25')).toBe(25)
    expect(parseDelta(' -50 ')).toBe(-50)
    expect(parseDelta('−500')).toBe(-500)
    expect(parseDelta('1 000')).toBe(1000)
  })

  it('rejects zero, decimals and junk', () => {
    for (const t of ['', '0', '-0', '1,5', '12.5', 'abc', '--5', '5-']) expect(parseDelta(t)).toBeNull()
  })
})

describe('parseNotes', () => {
  it('keeps one trimmed comment per non-empty line', () => {
    expect(parseNotes(' Ett \n\n  Två\r\nTre  \n')).toEqual(['Ett', 'Två', 'Tre'])
    expect(parseNotes('')).toEqual([])
  })
})

describe('parsePrice', () => {
  it('reads whole prices, zero included', () => {
    expect(parsePrice('500')).toBe(500)
    expect(parsePrice('0')).toBe(0)
    expect(parsePrice('1 000')).toBe(1000)
  })

  it('rejects negatives, decimals and junk', () => {
    for (const t of ['', '-5', '1,5', '12.5', 'gratis']) expect(parsePrice(t)).toBeNull()
  })
})

describe('parseStock', () => {
  it('reads an empty field as obegränsat, not as an error', () => {
    expect(parseStock('')).toBeUndefined()
    expect(parseStock('   ')).toBeUndefined()
  })

  it('reads a count, zero meaning slutsålt', () => {
    expect(parseStock('24')).toBe(24)
    expect(parseStock('0')).toBe(0)
  })

  it('rejects negatives and junk', () => {
    for (const t of ['-1', '2,5', 'många']) expect(parseStock(t)).toBeNull()
  })
})

describe('parseCount', () => {
  it('reads a print run size', () => {
    expect(parseCount('1')).toBe(1)
    expect(parseCount('12')).toBe(12)
    expect(parseCount(String(COUPON_MAX_BATCH))).toBe(COUPON_MAX_BATCH)
  })

  it('refuses zero, an empty field and more than one print run allows', () => {
    // Zero kuponger is a wasted trip to the printer; the cap is also enforced in SQL (bad_count).
    for (const t of ['', '0', String(COUPON_MAX_BATCH + 1), '9999']) expect(parseCount(t)).toBeNull()
  })

  it('rejects negatives, decimals and junk', () => {
    for (const t of ['-5', '1,5', '12.5', 'tolv']) expect(parseCount(t)).toBeNull()
  })
})
