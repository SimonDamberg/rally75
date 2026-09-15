import { describe, expect, it } from 'vitest'
import { buildField, FIELD_SIZE } from '../shared/game/field'
import { computeOdds, roundOdds } from '../shared/game/odds'
import { createRng } from '../shared/game/rng'
import { addChip, allIn, checkStake, clampStake, marketOdds } from './slip'

describe('chips', () => {
  it('stack and cap at the balance', () => {
    expect(addChip(0, 25, 1000)).toBe(25)
    expect(addChip(25, 250, 1000)).toBe(275)
    expect(addChip(25, 25, 30)).toBe(30)
    expect(addChip(0, 10, 0)).toBe(0)
  })

  it('ALL IN takes the whole balance, never negative', () => {
    expect(allIn(1337)).toBe(1337)
    expect(allIn(-5)).toBe(0)
  })

  it('clamps a stake left over after the balance dropped', () => {
    expect(clampStake(500, 120)).toBe(120)
    expect(clampStake(40, 120)).toBe(40)
  })
})

describe('checkStake', () => {
  it('accepts min stake up to the balance', () => {
    expect(checkStake(10, 10)).toBe('ok')
    expect(checkStake(1000, 1000)).toBe('ok')
  })

  it('flags a stake below the minimum', () => {
    expect(checkStake(0, 1000)).toBe('too_low')
    expect(checkStake(9, 1000)).toBe('too_low')
  })

  it('flags a broke player and an unaffordable stake', () => {
    expect(checkStake(0, 5)).toBe('too_poor')
    expect(checkStake(50, 40)).toBe('too_poor')
  })
})

describe('marketOdds', () => {
  const horses = buildField(FIELD_SIZE, [], createRng(5)).horses

  it('equals the morning line market with no bets', () => {
    const { odds, pools } = marketOdds(horses, [])
    expect(pools.every((p) => p === 0)).toBe(true)
    expect(odds).toEqual(computeOdds(horses, pools).map(roundOdds))
  })

  it('only counts open bets, like place_bet', () => {
    const n = horses[0].n
    const open = marketOdds(horses, [{ horse_n: n, stake: 200, status: 'open' }])
    const refunded = marketOdds(horses, [{ horse_n: n, stake: 200, status: 'void' }])
    expect(open.pools[0]).toBe(200)
    expect(open.odds[0]).toBeLessThan(marketOdds(horses, []).odds[0])
    expect(refunded.pools[0]).toBe(0)
  })
})
