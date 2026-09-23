import { describe, expect, it } from 'vitest'
import { CARD_PREFIX, cardPayload, parseScan } from './scan'

describe('parseScan', () => {
  it('reads back what a vinstkort prints', () => {
    expect(parseScan(cardPayload('ABCD1234'))).toEqual({ kind: 'card', code: 'ABCD1234' })
  })

  it('forgives case, whitespace and the Crockford lookalikes on a card', () => {
    expect(parseScan(`  ${CARD_PREFIX.toLowerCase()}abcd-i2lo \n`)).toEqual({ kind: 'card', code: 'ABCD1210' })
  })

  it('reads a kupong URL from any host', () => {
    expect(parseScan('https://rally75.vercel.app/k/ABCD1234')).toEqual({ kind: 'coupon', code: 'ABCD1234' })
    expect(parseScan('http://192.168.1.4:5173/k/abcd1234/?utm=x')).toEqual({ kind: 'coupon', code: 'ABCD1234' })
  })

  it('refuses everything else', () => {
    expect(parseScan('')).toBeNull()
    expect(parseScan('ABCD1234')).toBeNull()
    expect(parseScan(`${CARD_PREFIX}ABC`)).toBeNull()
    expect(parseScan('https://example.com/')).toBeNull()
    expect(parseScan('https://example.com/k/short')).toBeNull()
    expect(parseScan('WIFI:S:Hemma;T:WPA;P:hunter2;;')).toBeNull()
  })

  it('never turns a card into a URL', () => {
    expect(cardPayload('ABCD1234')).not.toMatch(/^https?:/i)
  })
})
