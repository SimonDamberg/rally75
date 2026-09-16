import { describe, expect, it } from 'vitest'
import { bettorsOn, settle, summarizeBook } from './book'
import { computeOdds, payoutFor, roundOdds } from '../shared/game/odds'

const horses = [
  { n: 1, baseOdds: 2.1 },
  { n: 2, baseOdds: 3.4 },
  { n: 3, baseOdds: 6.5 },
  { n: 4, baseOdds: 12 },
]

const bet = (horse_n: number, stake: number, odds: number, status: 'open' | 'won' | 'lost' | 'void' = 'open', payout: number | null = null) => ({
  horse_n,
  stake,
  odds,
  status,
  payout,
})

describe('summarizeBook', () => {
  it('shows the morning line with no bets', () => {
    const book = summarizeBook(horses, [])
    expect(book.horses.map((h) => h.odds)).toEqual(computeOdds(horses, [0, 0, 0, 0]).map(roundOdds))
    expect(book.totalStake).toBe(0)
    expect(book.horses.every((h) => h.liability === 0 && h.houseIfWins === 0)).toBe(true)
  })

  it('pools, odds and liability follow the bets', () => {
    const bets = [bet(1, 100, 2.05), bet(1, 50, 1.9), bet(3, 25, 7.2), bet(2, 40, 3.3, 'void', 40)]
    const book = summarizeBook(horses, bets)
    expect(book.totalStake).toBe(175)
    expect(book.count).toBe(3)
    expect(book.horses.map((h) => h.pool)).toEqual([150, 0, 25, 0])
    expect(book.horses.map((h) => h.odds)).toEqual(computeOdds(horses, [150, 0, 25, 0]).map(roundOdds))
    expect(book.horses[0].liability).toBe(payoutFor(100, 2.05) + payoutFor(50, 1.9))
    expect(book.horses[0].houseIfWins).toBe(175 - book.horses[0].liability)
    expect(book.horses[1]).toMatchObject({ pool: 0, count: 0, liability: 0, houseIfWins: 175 })
  })

  it('money on a horse raises its liability and shortens it', () => {
    const before = summarizeBook(horses, [bet(2, 50, 3.3)])
    const after = summarizeBook(horses, [bet(2, 50, 3.3), bet(2, 100, 2.9)])
    expect(after.horses[1].liability).toBeGreaterThan(before.horses[1].liability)
    expect(after.horses[1].odds).toBeLessThan(before.horses[1].odds)
  })

  it('keeps settled bets in the book', () => {
    const book = summarizeBook(horses, [bet(1, 100, 2, 'won', 200), bet(2, 30, 3, 'lost', 0)])
    expect(book.totalStake).toBe(130)
    expect(book.horses[0].houseIfWins).toBe(-70)
  })
})

describe('settle', () => {
  it('nets stakes against payouts, refunds included', () => {
    expect(settle([bet(1, 100, 2, 'won', 200), bet(2, 30, 3, 'lost', 0)])).toEqual({ staked: 130, paidOut: 200, houseNet: -70 })
    expect(settle([bet(1, 100, 2, 'void', 100)]).houseNet).toBe(0)
    expect(settle([bet(1, 100, 2, 'void', 0)]).houseNet).toBe(100)
  })
})

describe('bettorsOn', () => {
  let tick = 0
  const own = (player_id: string, horse_n: number, stake: number, status: 'open' | 'void' = 'open') => ({
    player_id,
    horse_n,
    stake,
    status,
    created_at: `2026-09-20T18:00:${String(tick++).padStart(2, '0')}Z`,
  })

  it('lists only the bettors on that horse, biggest first', () => {
    const bets = [own('anna', 1, 50), own('bo', 2, 400), own('cia', 1, 200)]
    expect(bettorsOn(bets, 1)).toEqual([
      { player_id: 'cia', stake: 200, count: 1 },
      { player_id: 'anna', stake: 50, count: 1 },
    ])
    expect(bettorsOn(bets, 4)).toEqual([])
  })

  it('folds repeat bets by the same player into one summed row', () => {
    const bets = [own('anna', 1, 50), own('bo', 1, 120), own('anna', 1, 100)]
    expect(bettorsOn(bets, 1)).toEqual([
      { player_id: 'anna', stake: 150, count: 2 },
      { player_id: 'bo', stake: 120, count: 1 },
    ])
  })

  it('drops voided bets, like summarizeBook', () => {
    const bets = [own('anna', 1, 50, 'void'), own('bo', 1, 30)]
    expect(bettorsOn(bets, 1)).toEqual([{ player_id: 'bo', stake: 30, count: 1 }])
  })

  it('keeps equal stakes in the order they were bet', () => {
    const bets = [own('anna', 1, 100), own('bo', 1, 100), own('cia', 1, 100)]
    expect(bettorsOn(bets, 1).map((b) => b.player_id)).toEqual(['anna', 'bo', 'cia'])
  })

  it('agrees with the horse pool in summarizeBook', () => {
    const bets = [own('anna', 1, 50), own('bo', 1, 120), own('anna', 1, 100), own('cia', 2, 75)]
    const total = bettorsOn(bets, 1).reduce((s, b) => s + b.stake, 0)
    expect(total).toBe(summarizeBook(horses, bets.map((b) => ({ ...b, odds: 2, payout: null }))).horses[0].pool)
  })
})
