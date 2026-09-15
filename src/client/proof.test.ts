import { describe, expect, it } from 'vitest'
import type { BetRow } from '../lib/types'
import { createRng } from '../shared/game/rng'
import { betToastTexts, FAKE_WIN_MS, fakeWinDelay, fakeWinText, freshBets } from './proof'

const bet = (id: string, player_id: string, horse_n = 1, stake = 50): BetRow => ({
  id,
  player_id,
  race_id: 'r1',
  horse_n,
  stake,
  odds: 2,
  payout: null,
  status: 'open',
  created_at: '2026-09-20T18:00:00Z',
})

describe('fake wins', () => {
  it('reads like a win toast', () => {
    const rng = createRng(5)
    for (let i = 0; i < 200; i++) {
      const t = fakeWinText(rng)
      expect(t).toMatch(/^\S.* från \S.* vann just [\d\u00a0]+\u00a0RM$/)
      expect(t).not.toContain('undefined')
    }
  })

  it('waits inside the delay range', () => {
    const rng = createRng(6)
    for (let i = 0; i < 200; i++) {
      const d = fakeWinDelay(rng)
      expect(d).toBeGreaterThanOrEqual(FAKE_WIN_MS[0])
      expect(d).toBeLessThanOrEqual(FAKE_WIN_MS[1])
    }
  })
})

describe('freshBets', () => {
  it('announces nothing on first load', () => {
    const r = freshBets(null, [bet('a', 'p2'), bet('b', 'p3')], 'me')
    expect(r.fresh).toEqual([])
    expect([...r.seen]).toEqual(['a', 'b'])
  })

  it('returns new bets by others only, and remembers all', () => {
    const first = freshBets(null, [bet('a', 'p2')], 'me')
    const next = freshBets(first.seen, [bet('a', 'p2'), bet('b', 'me'), bet('c', 'p3')], 'me')
    expect(next.fresh.map((b) => b.id)).toEqual(['c'])
    expect(next.seen.has('b')).toBe(true)
    expect(freshBets(next.seen, [bet('a', 'p2'), bet('b', 'me'), bet('c', 'p3')], 'me').fresh).toEqual([])
  })

  it('keeps the same set when nothing changed', () => {
    const first = freshBets(null, [bet('a', 'p2')], 'me')
    expect(freshBets(first.seen, [bet('a', 'p2')], 'me').seen).toBe(first.seen)
  })
})

describe('betToastTexts', () => {
  const players = new Map([['p2', { name: 'Simon', tag: 42 }]])
  const field = [{ n: 1, name: 'Bålsta Blixten' }]

  it('names the player, stake and horse', () => {
    expect(betToastTexts([bet('a', 'p2', 1, 250)], players, field)).toEqual(['Simon #42 satsade 250\u00a0RM på Bålsta Blixten'])
  })

  it('hides unknown players and skips unknown horses', () => {
    expect(betToastTexts([bet('a', 'p9', 1)], players, field)[0]).toMatch(/^En hemlig VIP satsade/)
    expect(betToastTexts([bet('a', 'p2', 7)], players, field)).toEqual([])
  })

  it('folds a rush into one toast', () => {
    const rush = [bet('a', 'p2'), bet('b', 'p2'), bet('c', 'p2')]
    expect(betToastTexts(rush, players, field)).toEqual(['3 nya spel på loppet. Oddsen rör sig!'])
  })
})
