import { describe, expect, it } from 'vitest'
import type { PrizeClaimRow } from '../../lib/types'
import { cardTotals, repeatCounts } from './prizeCards'

const claim = (id: string, player: string, card: string | null, at: string, amount = 100): PrizeClaimRow => ({
  id,
  card_id: card,
  player_id: player,
  tier: 1,
  amount,
  label: 'Dart',
  created_at: `2026-09-26T20:00:${at}Z`,
})

describe('cardTotals', () => {
  it('sums claims per card and skips deleted cards', () => {
    const totals = cardTotals([
      claim('a', 'p1', 'k1', '01'),
      claim('b', 'p2', 'k1', '02', 500),
      claim('c', 'p1', null, '03'),
    ])
    expect(totals.get('k1')).toEqual({ count: 2, rm: 600 })
    expect(totals.size).toBe(1)
  })
})

describe('repeatCounts', () => {
  it('counts per guest and card in time order, newest-first input or not', () => {
    const counts = repeatCounts([
      claim('c', 'p1', 'k1', '30'),
      claim('b', 'p2', 'k1', '20'),
      claim('a', 'p1', 'k1', '10'),
      claim('d', 'p1', 'k2', '40'),
    ])
    expect(counts.get('a')).toBe(1)
    expect(counts.get('b')).toBe(1)
    expect(counts.get('c')).toBe(2)
    expect(counts.get('d')).toBe(1)
  })
})
