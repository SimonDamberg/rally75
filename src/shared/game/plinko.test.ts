import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MIN_STAKE } from './economy'
import {
  checkDrop,
  dropTotals,
  fmtMult,
  pathSteps,
  PLINKO_CHIPS,
  PLINKO_M10,
  PLINKO_MAX_STAKE,
  PLINKO_ROWS,
  plinkoPayout,
  plinkoRtp,
  slotOdds,
  slotOf,
} from './plinko'

const MIGRATIONS = join(import.meta.dirname, '..', '..', '..', 'supabase', 'migrations')

describe('plinko table', () => {
  it('has one slot per possible count of rights, and is symmetric', () => {
    expect(PLINKO_M10).toHaveLength(PLINKO_ROWS + 1)
    expect([...PLINKO_M10].reverse()).toEqual([...PLINKO_M10])
  })

  it('gives back about 90 % and keeps a house edge', () => {
    const rtp = plinkoRtp()
    expect(rtp).toBeGreaterThan(0.89)
    expect(rtp).toBeLessThan(0.93)
  })

  it('tops out at 100x on the edges', () => {
    expect(Math.max(...PLINKO_M10)).toBe(1000)
    expect(PLINKO_M10[0]).toBe(1000)
  })

  it('slot odds sum to one', () => {
    expect(slotOdds().reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
  })

  it('chips are inside the stake limits', () => {
    for (const c of PLINKO_CHIPS) {
      expect(c).toBeGreaterThanOrEqual(MIN_STAKE)
      expect(c).toBeLessThanOrEqual(PLINKO_MAX_STAKE)
    }
  })
})

describe('paths', () => {
  it('slot is the number of rights over every path', () => {
    for (let path = 0; path < 1 << PLINKO_ROWS; path++) {
      const steps = pathSteps(path)
      expect(steps).toHaveLength(PLINKO_ROWS)
      expect(slotOf(path)).toBe(steps.filter(Boolean).length)
    }
  })

  it('counts paths per slot binomially', () => {
    const counts = new Array(PLINKO_ROWS + 1).fill(0)
    for (let path = 0; path < 1 << PLINKO_ROWS; path++) counts[slotOf(path)]++
    expect(counts).toEqual(slotOdds().map((p) => Math.round(p * (1 << PLINKO_ROWS))))
    expect(counts[0]).toBe(1)
    expect(counts[6]).toBe(924)
  })
})

describe('payout', () => {
  it('matches the SQL formula (round half up on tenths) for every stake and slot', () => {
    for (let stake = MIN_STAKE; stake <= PLINKO_MAX_STAKE; stake++) {
      for (let slot = 0; slot <= PLINKO_ROWS; slot++) {
        const p = plinkoPayout(stake, slot)
        expect(Number.isInteger(p)).toBe(true)
        // 2 * payout is within one of 2 * exact, rounding the half up.
        const twice = (stake * PLINKO_M10[slot]) / 5
        expect(2 * p - twice).toBeGreaterThan(-1)
        expect(2 * p - twice).toBeLessThanOrEqual(1)
      }
    }
  })

  it('pays the examples', () => {
    expect(plinkoPayout(250, 0)).toBe(25000)
    expect(plinkoPayout(10, 6)).toBe(3)
    expect(plinkoPayout(25, 6)).toBe(8) // 7.5 rounds up
    expect(plinkoPayout(25, 3)).toBe(38) // 37.5 rounds up
  })
})

describe('checkDrop', () => {
  it('names the first problem', () => {
    expect(checkDrop(5, 1000)).toBe('too_low')
    expect(checkDrop(300, 1000)).toBe('too_high')
    expect(checkDrop(100, 50)).toBe('insufficient')
    expect(checkDrop(50, 50)).toBeNull()
  })
})

describe('format and totals', () => {
  it('formats multipliers with a decimal comma', () => {
    expect(fmtMult(1000)).toBe('100x')
    expect(fmtMult(15)).toBe('1,5x')
    expect(fmtMult(3)).toBe('0,3x')
    expect(fmtMult(10)).toBe('1x')
  })

  it('sums drops', () => {
    expect(dropTotals([])).toEqual({ count: 0, staked: 0, paid: 0, net: 0, bestM10: 0 })
    expect(
      dropTotals([
        { stake: 100, payout: 30, m10: 3 },
        { stake: 50, payout: 200, m10: 40 },
      ]),
    ).toEqual({ count: 2, staked: 150, paid: 230, net: 80, bestM10: 40 })
  })
})

describe('SQL mirror', () => {
  const file = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('_plinko.sql'))
    .sort()
    .at(-1)!
  const sql = readFileSync(join(MIGRATIONS, file), 'utf8')

  it('declares the same constants', () => {
    expect(sql).toContain(`PLINKO_ROWS ${PLINKO_ROWS}, PLINKO_MAX_STAKE ${PLINKO_MAX_STAKE}.`)
    expect(sql).toContain(`array[${PLINKO_M10.join(', ')}]`)
  })

  it('enforces them', () => {
    expect(sql).toContain(`p_stake < ${MIN_STAKE}`)
    expect(sql).toContain(`p_stake > ${PLINKO_MAX_STAKE}`)
    expect(sql).toContain(`& ${(1 << PLINKO_ROWS) - 1}`)
    expect(sql).toContain('(p_stake * v_m10 + 5) / 10')
  })
})
