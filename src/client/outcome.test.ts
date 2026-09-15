import { describe, expect, it } from 'vitest'
import type { BetRow, RaceRow } from '../lib/types'
import { betOutcome, groupByRace, rankOf, revealFor, shouldReveal, totals } from './outcome'

const race = (over: Partial<RaceRow> = {}): RaceRow => ({
  id: 'r1',
  race_no: 1,
  status: 'finished',
  dist: '',
  cond: '',
  field: [],
  result: { order: [3, 1, 2, 4], original_order: [3, 1, 2, 4], ruling: 'none', inquiry_text: null },
  created_at: '2026-09-20T18:00:00Z',
  betting_at: null,
  closed_at: null,
  started_at: null,
  finished_at: '2026-09-20T18:10:00Z',
  ...over,
})

let seq = 0
const bet = (over: Partial<BetRow> = {}): BetRow => ({
  id: `b${seq++}`,
  player_id: 'p1',
  race_id: 'r1',
  horse_n: 3,
  stake: 100,
  odds: 2.5,
  payout: null,
  status: 'open',
  created_at: `2026-09-20T18:0${seq % 10}:00Z`,
  ...over,
})

describe('betOutcome', () => {
  it('maps every status, telling refunds from kept stakes', () => {
    expect(betOutcome(bet())).toEqual({ kind: 'open' })
    expect(betOutcome(bet({ status: 'won', payout: 250 }))).toEqual({ kind: 'won', payout: 250 })
    expect(betOutcome(bet({ status: 'lost', payout: 0 }))).toEqual({ kind: 'lost' })
    expect(betOutcome(bet({ status: 'void', payout: 100 }))).toEqual({ kind: 'refunded' })
    expect(betOutcome(bet({ status: 'void', payout: 0 }))).toEqual({ kind: 'kept' })
  })
})

describe('totals', () => {
  it('counts open stakes as money out', () => {
    expect(totals([bet({ status: 'won', payout: 250 }), bet({ stake: 50 })])).toEqual({ staked: 150, paid: 250, net: 100 })
  })
})

describe('revealFor', () => {
  it('waits for the race and for every bet to settle', () => {
    expect(revealFor(race({ status: 'running', result: null }), [])).toBeNull()
    expect(revealFor(race(), [bet()])).toBeNull()
  })

  it('reports a win with the payout and the official winner', () => {
    const r = revealFor(race(), [bet({ status: 'won', payout: 250 }), bet({ horse_n: 1, status: 'lost', payout: 0 })])
    expect(r).toMatchObject({ kind: 'win', staked: 200, paid: 250, net: 50, winner: 3 })
  })

  it('reports a loss', () => {
    expect(revealFor(race(), [bet({ horse_n: 1, status: 'lost', payout: 0 })])?.kind).toBe('loss')
  })

  it('tells a GM cancel (refund) from an inquiry void (house keeps)', () => {
    const cancelled = race({ status: 'void', result: null })
    expect(revealFor(cancelled, [bet({ status: 'void', payout: 100 })])).toMatchObject({ kind: 'refund', winner: null })
    const ruled = race({ status: 'void', result: { order: [3, 1, 2, 4], original_order: [3, 1, 2, 4], ruling: 'void', inquiry_text: 'x' } })
    expect(revealFor(ruled, [bet({ status: 'void', payout: 0 })])?.kind).toBe('kept')
  })

  it('ignores bets on other races and handles spectators', () => {
    expect(revealFor(race(), [bet({ race_id: 'r0', status: 'won', payout: 10 })])?.kind).toBe('watch')
    expect(revealFor(race({ status: 'void', result: null }), [])?.kind).toBe('void')
  })
})

describe('shouldReveal', () => {
  const early = { created_at: '2026-09-20T17:00:00Z' }
  const late = { created_at: '2026-09-20T18:30:00Z' }

  it('shows once per race', () => {
    const r = race()
    const rev = revealFor(r, [bet({ status: 'lost', payout: 0 })])
    expect(shouldReveal(r, rev, early, null)).toBe(true)
    expect(shouldReveal(r, rev, early, 'r1')).toBe(false)
    expect(shouldReveal(r, null, early, null)).toBe(false)
  })

  it('skips cancelled races without bets and results from before sign-up', () => {
    const cancelled = race({ status: 'void', result: null })
    expect(shouldReveal(cancelled, revealFor(cancelled, []), early, null)).toBe(false)
    expect(shouldReveal(race(), revealFor(race(), []), late, null)).toBe(false)
    expect(shouldReveal(race(), revealFor(race(), []), early, null)).toBe(true)
  })
})

describe('groupByRace', () => {
  it('puts the race with the newest bet first and attaches the race row', () => {
    const r1 = race()
    const r2 = race({ id: 'r2', race_no: 2 })
    const bets = [
      bet({ race_id: 'r2', created_at: '2026-09-20T19:00:00Z' }),
      bet({ race_id: 'r1', created_at: '2026-09-20T18:05:00Z' }),
      bet({ race_id: 'r1', created_at: '2026-09-20T18:01:00Z' }),
      bet({ race_id: 'gone', created_at: '2026-09-20T17:00:00Z' }),
    ]
    const groups = groupByRace(bets, [r1, r2])
    expect(groups.map((g) => g.raceId)).toEqual(['r2', 'r1', 'gone'])
    expect(groups[1].bets).toHaveLength(2)
    expect(groups[1].race?.race_no).toBe(1)
    expect(groups[2].race).toBeUndefined()
  })
})

describe('rankOf', () => {
  it('is 1-based', () => {
    expect(rankOf([{ id: 'a' }, { id: 'b' }], 'b')).toBe(2)
    expect(rankOf([], 'b')).toBeNull()
  })
})
