import { describe, expect, it } from 'vitest'
import { nightNet, WELCOME_BONUS } from '../shared/game/economy'
import { applyChange, byBalance, byLosses } from './realtime'
import { toBet, type PlayerRow } from './types'

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

  it('ranks by balance and by net losses', () => {
    const players = [p('Anna', 500), p('Bo', 1500), p('Cia', 900, 1337, 1), p('Dan', 0)]
    expect(byBalance(players).map((x) => x.name)).toEqual(['Bo', 'Cia', 'Anna', 'Dan'])
    expect(byLosses(players).map((x) => x.name)).toEqual(['Cia', 'Dan', 'Anna', 'Bo'])
  })

  it('does not treat the untouched welcome bonus as winnings', () => {
    // Sat on the bonus all night, so break even and behind anyone actually up.
    const players = [p('Vinnare', WELCOME_BONUS + 300), p('Soffliggare', WELCOME_BONUS), p('Förlorare', 400)]
    expect(nightNet(players[1])).toBe(0)
    expect(byLosses(players).map((x) => x.name)).toEqual(['Förlorare', 'Soffliggare', 'Vinnare'])
  })

  it('breaks ties on losses by who borrowed most', () => {
    const a = p('Låntagare', 1337, 1337, 2)
    const b = p('Snål', 1337, 1337, 0)
    expect(byLosses([b, a]).map((x) => x.name)).toEqual(['Låntagare', 'Snål'])
  })
})
