import { describe, expect, it } from 'vitest'
import { distMeters, fmtInt, fmtRm, fmtOdds, playerLabel } from './format'

const NBSP = '\u00a0'

describe('format', () => {
  it('groups thousands with a no-break space', () => {
    expect(fmtInt(0)).toBe('0')
    expect(fmtInt(999)).toBe('999')
    expect(fmtInt(1000)).toBe(`1${NBSP}000`)
    expect(fmtInt(31573.4)).toBe(`31${NBSP}573`)
    expect(fmtInt(-1234567)).toBe(`-1${NBSP}234${NBSP}567`)
  })

  it('formats RallyMynt', () => {
    expect(fmtRm(1000)).toBe(`1${NBSP}000${NBSP}RM`)
  })

  it('formats odds with a decimal comma', () => {
    expect(fmtOdds(2.59)).toBe('2,59')
    expect(fmtOdds(80)).toBe('80,00')
  })

  it('labels players with their tag', () => {
    expect(playerLabel('Simon', 42)).toBe('Simon #42')
  })

  it('parses race distance', () => {
    expect(distMeters('2 140 m voltstart')).toBe(2140)
    expect(distMeters('1 200 m, kortloppet')).toBe(1200)
    expect(distMeters(`1${NBSP}609 m autostart`)).toBe(1609)
    expect(distMeters('okänd distans')).toBe(2140)
  })
})
