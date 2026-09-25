import { describe, expect, it } from 'vitest'
import { feeLines, formatCode, isShortchanged, normalizeCode, printedValue } from './coupon'
import { COUPON_CODE_LENGTH } from './economy'

describe('normalizeCode', () => {
  it('accepts a clean code', () => {
    expect(normalizeCode('X3D5EQSE')).toBe('X3D5EQSE')
  })

  it('forgives how the code was read off the card', () => {
    // Lowercase, the printed dash, spaces from a keyboard, and a scan that kept the URL's slash.
    expect(normalizeCode('x3d5-eqse')).toBe('X3D5EQSE')
    expect(normalizeCode('  X3D5 EQSE  ')).toBe('X3D5EQSE')
    expect(normalizeCode('/X3D5EQSE')).toBe('X3D5EQSE')
  })

  it('maps the Crockford lookalikes, which is why they are not in the alphabet', () => {
    // I and L read as 1, O as 0: exactly the mistakes a printed card invites.
    expect(normalizeCode('IL0O1234')).toBe('11001234')
    expect(normalizeCode('ilOo1234')).toBe('11001234')
  })

  it('returns empty for anything that is not a whole code', () => {
    for (const raw of ['', '   ', '-', 'X3D5EQS', 'X3D5EQSEX', 'X3D5EQS!', 'åäöåäöåä']) {
      expect(normalizeCode(raw)).toBe('')
    }
  })

  it('is idempotent, so a parked code can be normalised again on the way out of storage', () => {
    const once = normalizeCode('x3d5-eqse')
    expect(normalizeCode(once)).toBe(once)
  })
})

describe('formatCode', () => {
  it('splits a full code in half', () => {
    expect(formatCode('X3D5EQSE')).toBe('X3D5-EQSE')
    expect(formatCode('X3D5EQSE')).toHaveLength(COUPON_CODE_LENGTH + 1)
  })

  it('leaves anything else alone', () => {
    expect(formatCode('')).toBe('')
    expect(formatCode('KORT')).toBe('KORT')
  })
})

describe('printedValue and isShortchanged', () => {
  it('an honest kupong pays what it says', () => {
    const honest = { amount: 500, face: null }
    expect(printedValue(honest)).toBe(500)
    expect(isShortchanged(honest)).toBe(false)
  })

  it('the bonuskupong says 1 000 and pays 100', () => {
    const prank = { amount: 100, face: 1000 }
    expect(printedValue(prank)).toBe(1000)
    expect(isShortchanged(prank)).toBe(true)
  })
})

describe('feeLines', () => {
  it('splits the shortfall so the receipt adds up', () => {
    expect(feeLines({ amount: 100, face: 1000 }, 4)).toEqual([225, 225, 225, 225])
    const odd = feeLines({ amount: 100, face: 1001 }, 4)
    expect(odd.reduce((a, b) => a + b, 0)).toBe(901)
  })

  it('charges nothing on an honest kupong', () => {
    expect(feeLines({ amount: 500, face: null }, 4)).toEqual([])
  })
})
