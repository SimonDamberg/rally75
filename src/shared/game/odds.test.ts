import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { buildField } from './field'
import { NAMED_KUSKAR } from '../content/kuskar'
import {
  computeOdds,
  MAX_ODDS,
  MIN_ODDS,
  oddsDrift,
  payoutFor,
  poolsFromBets,
  roundOdds,
  TAKEOUT,
} from './odds'

const EPS = 1e-9
const STAKES = [10, 25, 50, 100, 250, 1000]

describe('computeOdds', () => {
  it('INVARIANT: money on a horse always shortens it and never shortens the others', () => {
    const r = createRng(2024)
    for (let trial = 0; trial < 2000; trial++) {
      const { horses } = buildField(6, NAMED_KUSKAR, createRng(trial + 1))
      const pools = horses.map(() => (r.next() < 0.4 ? 0 : r.pick(STAKES) * (1 + r.int(4))))
      const before = computeOdds(horses, pools)
      const i = r.int(horses.length)
      const after = computeOdds(horses, pools.map((p, j) => (j === i ? p + r.pick(STAKES) : p)))

      if (before[i] > MIN_ODDS && before[i] < MAX_ODDS) expect(after[i], `trial ${trial}`).toBeLessThan(before[i])
      else expect(after[i]).toBeLessThanOrEqual(before[i] + EPS)
      for (let j = 0; j < horses.length; j++) {
        if (j !== i) expect(after[j], `trial ${trial} horse ${j}`).toBeGreaterThanOrEqual(before[j] - EPS)
      }
    }
  })

  it('prototype regression: 100 kr on a 3.77 horse must not lengthen it', () => {
    const horses = [3.77, 2.1, 5.5, 9.0, 14.0, 22.0].map((baseOdds) => ({ baseOdds }))
    const empty = computeOdds(horses, [0, 0, 0, 0, 0, 0])
    const backed = computeOdds(horses, [100, 0, 0, 0, 0, 0])
    expect(backed[0]).toBeLessThan(empty[0])
    expect(backed[0]).toBeLessThan(3.77)
  })

  it('with no bets, keeps the morning line ordering and a book of 1/TAKEOUT', () => {
    for (let seed = 1; seed < 300; seed++) {
      const { horses } = buildField(6, NAMED_KUSKAR, createRng(seed))
      const odds = computeOdds(horses, horses.map(() => 0))
      for (let a = 0; a < 6; a++) {
        for (let b = 0; b < 6; b++) {
          if (horses[a].baseOdds < horses[b].baseOdds) expect(odds[a]).toBeLessThanOrEqual(odds[b] + EPS)
        }
      }
      if (odds.every((o) => o > MIN_ODDS && o < MAX_ODDS)) {
        const book = odds.reduce((s, o) => s + 1 / o, 0)
        expect(book).toBeCloseTo(1 / TAKEOUT, 9)
      }
    }
  })

  it('clamps to MIN_ODDS and MAX_ODDS', () => {
    const horses = [1.5, 60, 60, 60, 60, 60].map((baseOdds) => ({ baseOdds }))
    const odds = computeOdds(horses, [100000, 0, 0, 0, 0, 0])
    expect(odds[0]).toBe(MIN_ODDS)
    for (const o of odds.slice(1)) expect(o).toBe(MAX_ODDS)
  })

  it('treats missing pool entries as zero', () => {
    const horses = [2, 3, 4].map((baseOdds) => ({ baseOdds }))
    expect(computeOdds(horses, [])).toEqual(computeOdds(horses, [0, 0, 0]))
  })
})

describe('odds helpers', () => {
  it('roundOdds rounds half up to 2 decimals', () => {
    expect(roundOdds(2.594)).toBe(2.59)
    expect(roundOdds(2.595)).toBe(2.6)
    expect(roundOdds(1.005)).toBe(1.01)
    expect(roundOdds(80)).toBe(80)
  })

  it('payoutFor returns whole kronor including stake', () => {
    expect(payoutFor(100, 2.59)).toBe(259)
    expect(payoutFor(25, 3.33)).toBe(83)
    expect(payoutFor(10, 1.15)).toBe(12)
  })

  it('oddsDrift uses a 0.01 threshold', () => {
    expect(oddsDrift(2.5, 2.6)).toBe('up')
    expect(oddsDrift(2.5, 2.4)).toBe('down')
    expect(oddsDrift(2.5, 2.505)).toBe('none')
  })

  it('poolsFromBets sums stakes per horse in field order', () => {
    const horses = [{ n: 1 }, { n: 2 }, { n: 3 }]
    const bets = [
      { horse_n: 2, stake: 50 },
      { horse_n: 2, stake: 25 },
      { horse_n: 3, stake: 10 },
      { horse_n: 9, stake: 999 },
    ]
    expect(poolsFromBets(horses, bets)).toEqual([0, 75, 10])
  })
})
