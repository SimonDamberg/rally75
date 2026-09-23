// Pure grouping for the Vinstkort section of /gm/kuponger: what each card has paid out tonight, and
// which claims are the same guest cashing the same card again (the sign of a photographed card).
import type { PrizeClaimRow } from '../../lib/types'

export interface CardTotal {
  count: number
  rm: number
}

/** Claims and RM per card id. Claims whose card has been deleted are left out. */
export function cardTotals(claims: readonly PrizeClaimRow[]): Map<string, CardTotal> {
  const out = new Map<string, CardTotal>()
  for (const c of claims) {
    if (!c.card_id) continue
    const t = out.get(c.card_id) ?? { count: 0, rm: 0 }
    t.count += 1
    t.rm += c.amount
    out.set(c.card_id, t)
  }
  return out
}

/**
 * For every claim, how many times that guest had cashed that card by then (1 for the first time),
 * counted in time order whatever order the list arrives in.
 */
export function repeatCounts(claims: readonly PrizeClaimRow[]): Map<string, number> {
  const seen = new Map<string, number>()
  const out = new Map<string, number>()
  const ordered = claims.slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
  for (const c of ordered) {
    const key = `${c.player_id}:${c.card_id ?? c.label}`
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)
    out.set(c.id, n)
  }
  return out
}
