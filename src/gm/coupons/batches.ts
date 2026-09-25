// Pure grouping for /gm/kuponger: turns the flat coupons list into the two things Simon looks at,
// what is left of each print run and who has cashed one in.
import type { CouponRow } from '../../lib/types'
import { printedValue } from '../../shared/game/coupon'

export interface BatchSummary {
  batch: string
  tier: number
  /** Paid per ticket. */
  amount: number
  /** Printed on the ticket, so a reprint matches (more than `amount` for the prank run). */
  face: number
  label: string
  /** Newest coupon in the run, which is what the list sorts on. */
  created_at: string
  total: number
  redeemed: number
  /** Unclaimed tickets, i.e. how many are still worth handing out. */
  left: number
}

/**
 * One row per print run, newest first. A run is uniform by construction (gm_create_coupons takes
 * one tier, value and label for the whole batch), so the first coupon speaks for all of them.
 */
export function batchSummaries(coupons: readonly CouponRow[]): BatchSummary[] {
  const byBatch = new Map<string, BatchSummary>()
  for (const c of coupons) {
    const found = byBatch.get(c.batch)
    const row =
      found ??
      ({
        batch: c.batch,
        tier: c.tier,
        amount: c.amount,
        face: printedValue(c),
        label: c.label,
        created_at: c.created_at,
        total: 0,
        redeemed: 0,
        left: 0,
      } satisfies BatchSummary)
    row.total += 1
    if (c.redeemed_at) row.redeemed += 1
    row.left = row.total - row.redeemed
    if (c.created_at > row.created_at) row.created_at = c.created_at
    if (!found) byBatch.set(c.batch, row)
  }
  return [...byBatch.values()].sort(
    (a, b) => b.created_at.localeCompare(a.created_at) || a.batch.localeCompare(b.batch),
  )
}

/** Every cashed-in kupong, newest first. Drives the "Inlösta idag" feed and its Ångra buttons. */
export function claims(coupons: readonly CouponRow[]): CouponRow[] {
  return coupons
    .filter((c) => c.redeemed_at !== null)
    .sort((a, b) => b.redeemed_at!.localeCompare(a.redeemed_at!) || a.id.localeCompare(b.id))
}
