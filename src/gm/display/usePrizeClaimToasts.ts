// Someone won at a physical game and scanned the vinstkort, announced on the display iPad. Same
// shape as usePurchaseToasts: a claim is an INSERT, so the diff is over the claim ids, and claims
// that were already there when the iPad loaded are not announced.
import { useEffect, useEffectEvent, useRef } from 'react'
import type { PlayerRow, PrizeClaimRow } from '../../lib/types'
import { ATTRACT } from '../../shared/content/ui'
import { badgedLabel, fmtRm } from '../../shared/game/format'
import { toast } from '../../ui'

const PRIZE_TOAST_MS = 7000
/** More claims than this at once fold into a single line. */
const FOLD_AT = 2

export function usePrizeClaimToasts(
  claims: readonly PrizeClaimRow[] | undefined,
  players: ReadonlyMap<string, PlayerRow>,
) {
  const seen = useRef<ReadonlySet<string> | null>(null)

  const announce = useEffectEvent((fresh: readonly PrizeClaimRow[]) => {
    if (document.hidden) return
    if (fresh.length > FOLD_AT) return void toast({ text: ATTRACT.prizeCardMany(fresh.length), ms: PRIZE_TOAST_MS })
    for (const c of fresh) {
      const player = players.get(c.player_id)
      const label = player ? badgedLabel(player) : ATTRACT.someone
      toast({ text: ATTRACT.prizeCard(label, fmtRm(c.amount), c.label), ms: PRIZE_TOAST_MS, tone: 'win' })
    }
  })

  useEffect(() => {
    if (!claims) return
    const prev = seen.current
    seen.current = new Set(claims.map((c) => c.id))
    if (!prev) return
    const fresh = claims.filter((c) => !prev.has(c.id))
    if (fresh.length) announce(fresh)
  }, [claims])
}
