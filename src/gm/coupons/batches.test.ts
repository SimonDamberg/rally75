import { describe, expect, it } from 'vitest'
import { batchSummaries, claims } from './batches'
import type { CouponRow } from '../../lib/types'

function coupon(over: Partial<CouponRow> & { id: string; batch: string }): CouponRow {
  return {
    tier: 3,
    amount: 1000,
    label: 'Dart',
    created_at: '2026-09-18T20:00:00Z',
    redeemed_by: null,
    redeemed_at: null,
    ...over,
  }
}

describe('batchSummaries', () => {
  it('counts a run and what is left of it', () => {
    const rows = [
      coupon({ id: 'a', batch: 'b1' }),
      coupon({ id: 'b', batch: 'b1', redeemed_by: 'p1', redeemed_at: '2026-09-18T21:00:00Z' }),
      coupon({ id: 'c', batch: 'b1', redeemed_by: 'p2', redeemed_at: '2026-09-18T21:05:00Z' }),
    ]
    const [only] = batchSummaries(rows)
    expect(only.total).toBe(3)
    expect(only.redeemed).toBe(2)
    expect(only.left).toBe(1)
    expect(only.tier).toBe(3)
    expect(only.amount).toBe(1000)
    expect(only.label).toBe('Dart')
  })

  it('keeps runs apart and puts the newest first', () => {
    const rows = [
      coupon({ id: 'a', batch: 'old', created_at: '2026-09-18T18:00:00Z', tier: 1, amount: 250 }),
      coupon({ id: 'b', batch: 'new', created_at: '2026-09-18T19:00:00Z', tier: 2, amount: 500 }),
    ]
    expect(batchSummaries(rows).map((b) => b.batch)).toEqual(['new', 'old'])
    expect(batchSummaries(rows).map((b) => b.amount)).toEqual([500, 250])
  })

  it('reports nothing redeemed as nothing redeemed', () => {
    const [only] = batchSummaries([coupon({ id: 'a', batch: 'b1' }), coupon({ id: 'b', batch: 'b1' })])
    expect(only.redeemed).toBe(0)
    expect(only.left).toBe(2)
  })

  it('handles an empty list', () => {
    expect(batchSummaries([])).toEqual([])
  })

  it('does not mutate the rows it was given', () => {
    const rows = [coupon({ id: 'a', batch: 'b1' })]
    const snapshot = structuredClone(rows)
    batchSummaries(rows)
    expect(rows).toEqual(snapshot)
  })
})

describe('claims', () => {
  it('keeps only redeemed kuponger, newest first', () => {
    const rows = [
      coupon({ id: 'unclaimed', batch: 'b1' }),
      coupon({ id: 'early', batch: 'b1', redeemed_by: 'p1', redeemed_at: '2026-09-18T21:00:00Z' }),
      coupon({ id: 'late', batch: 'b1', redeemed_by: 'p2', redeemed_at: '2026-09-18T22:00:00Z' }),
    ]
    expect(claims(rows).map((c) => c.id)).toEqual(['late', 'early'])
  })

  it('survives a player the GM has since deleted (redeemed_by goes null, the stamp stays)', () => {
    const rows = [coupon({ id: 'orphan', batch: 'b1', redeemed_by: null, redeemed_at: '2026-09-18T21:00:00Z' })]
    expect(claims(rows)).toHaveLength(1)
  })

  it('handles nothing redeemed', () => {
    expect(claims([coupon({ id: 'a', batch: 'b1' })])).toEqual([])
  })
})
