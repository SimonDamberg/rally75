import { describe, expect, it } from 'vitest'
import { nightNet, WELCOME_BONUS } from '../shared/game/economy'
import { applyChange, byLosses, byNetWorth, freshBets } from './realtime'
import { toBet, type BetRow, type PlayerRow } from './types'

const bet = (id: string, race_id: string, odds: unknown = '2.50') => ({
  id,
  race_id,
  player_id: 'p',
  horse_n: 1,
  stake: 10,
  odds,
  payout: null,
  status: 'open',
  created_at: '',
})

describe('applyChange', () => {
  const inRace = (b: { race_id: string }) => b.race_id === 'r1'

  it('inserts, updates and normalizes numeric strings', () => {
    let rows = applyChange([], { eventType: 'INSERT', new: bet('a', 'r1'), old: {} }, toBet, inRace)
    expect(rows).toHaveLength(1)
    expect(rows[0].odds).toBe(2.5)
    rows = applyChange(rows, { eventType: 'UPDATE', new: { ...bet('a', 'r1'), status: 'won' }, old: { id: 'a' } }, toBet, inRace)
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('won')
  })

  it('ignores rows that are not accepted and drops rows that stop matching', () => {
    const rows = [toBet(bet('a', 'r1'))]
    expect(applyChange(rows, { eventType: 'INSERT', new: bet('b', 'r2'), old: {} }, toBet, inRace)).toBe(rows)
    expect(applyChange(rows, { eventType: 'UPDATE', new: bet('a', 'r2'), old: {} }, toBet, inRace)).toEqual([])
  })

  it('deletes by primary key only', () => {
    const rows = [toBet(bet('a', 'r1')), toBet(bet('b', 'r1'))]
    expect(applyChange(rows, { eventType: 'DELETE', new: {}, old: { id: 'a' } }, toBet).map((r) => r.id)).toEqual(['b'])
    expect(applyChange(rows, { eventType: 'DELETE', new: {}, old: { id: 'zzz' } }, toBet)).toBe(rows)
  })
})

describe('leaderboard sorting', () => {
  const p = (name: string, balance: number, debt = 0, loans_taken = 0): PlayerRow => ({
    id: name,
    name,
    tag: 11,
    balance,
    debt,
    loans_taken,
    created_at: '',
  })

  it('ranks by net worth and by net losses', () => {
    // Cia is holding the most cash after Bo, but the Snabblan debt drops her below everyone.
    const players = [p('Anna', 500), p('Bo', 1500), p('Cia', 900, 1337, 1), p('Dan', 0)]
    expect(byNetWorth(players).map((x) => x.name)).toEqual(['Bo', 'Anna', 'Dan', 'Cia'])
    expect(byLosses(players).map((x) => x.name)).toEqual(['Cia', 'Dan', 'Anna', 'Bo'])
  })

  it('breaks net worth ties by name', () => {
    const players = [p('Bosse', 900), p('Anna', 900), p('Cia', 2237, 1337, 1)]
    expect(byNetWorth(players).map((x) => x.name)).toEqual(['Anna', 'Bosse', 'Cia'])
  })

  it('does not treat the untouched welcome bonus as winnings', () => {
    // Sat on the bonus all night, so break even and behind anyone actually up.
    const players = [p('Vinnare', WELCOME_BONUS + 300), p('Soffliggare', WELCOME_BONUS), p('Förlorare', 400)]
    expect(nightNet(players[1])).toBe(0)
    expect(byLosses(players).map((x) => x.name)).toEqual(['Förlorare', 'Soffliggare', 'Vinnare'])
    expect(byNetWorth(players).map((x) => x.name)).toEqual(['Vinnare', 'Soffliggare', 'Förlorare'])
  })

  it('breaks ties on losses by who borrowed most', () => {
    const a = p('Låntagare', 1337, 1337, 2)
    const b = p('Snål', 1337, 1337, 0)
    expect(byLosses([b, a]).map((x) => x.name)).toEqual(['Låntagare', 'Snål'])
  })
})

describe('freshBets', () => {
  const b = (id: string, player_id: string): BetRow => toBet({ ...bet(id, 'r1'), player_id })

  it('announces nothing on first load', () => {
    const r = freshBets(null, [b('a', 'p2'), b('b', 'p3')], 'me')
    expect(r.fresh).toEqual([])
    expect([...r.seen]).toEqual(['a', 'b'])
  })

  it('returns new bets by others only, and remembers all', () => {
    const first = freshBets(null, [b('a', 'p2')], 'me')
    const next = freshBets(first.seen, [b('a', 'p2'), b('b', 'me'), b('c', 'p3')], 'me')
    expect(next.fresh.map((x) => x.id)).toEqual(['c'])
    expect(next.seen.has('b')).toBe(true)
    expect(freshBets(next.seen, [b('a', 'p2'), b('b', 'me'), b('c', 'p3')], 'me').fresh).toEqual([])
  })

  it('keeps every bet when no player is excluded', () => {
    // The GM display has no player of its own, so it passes an empty id.
    const first = freshBets(null, [b('a', 'p2')], '')
    expect(freshBets(first.seen, [b('a', 'p2'), b('b', 'p3')], '').fresh.map((x) => x.id)).toEqual(['b'])
  })

  it('keeps the same set when nothing changed', () => {
    const first = freshBets(null, [b('a', 'p2')], 'me')
    expect(freshBets(first.seen, [b('a', 'p2')], 'me').seen).toBe(first.seen)
  })
})
