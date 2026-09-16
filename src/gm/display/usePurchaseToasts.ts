// Someone just spent their winnings at the black market, announced on the display iPad. Half the
// point of the Butik is that the room sees the beer being bought, not just the beer arriving.
//
// Same shape as useBetToasts: purchases already there when the iPad loads are not announced, and a
// rush folds into one line so the corner does not fill with toasts.
import { useEffect, useEffectEvent, useRef } from 'react'
import type { PlayerRow, PurchaseRow } from '../../lib/types'
import { ATTRACT } from '../../shared/content/ui'
import { badgedLabel, fmtRm } from '../../shared/game/format'
import { toast } from '../../ui'

const BUY_TOAST_MS = 7000
/** More purchases than this at once fold into a single line. */
const FOLD_AT = 1

export function usePurchaseToasts(
  purchases: readonly PurchaseRow[] | undefined,
  players: ReadonlyMap<string, PlayerRow>,
) {
  const seen = useRef<ReadonlySet<string> | null>(null)

  const announce = useEffectEvent((fresh: readonly PurchaseRow[]) => {
    if (document.hidden) return
    if (fresh.length > FOLD_AT) return void toast({ text: ATTRACT.boughtMany(fresh.length), ms: BUY_TOAST_MS })
    for (const p of fresh) {
      const player = players.get(p.player_id)
      const label = player ? badgedLabel(player) : ATTRACT.someone
      toast({ text: ATTRACT.bought(label, p.item_name, fmtRm(p.price)), ms: BUY_TOAST_MS })
    }
  })

  useEffect(() => {
    if (!purchases) return
    const prev = seen.current
    seen.current = new Set(purchases.map((p) => p.id))
    if (!prev) return
    const fresh = purchases.filter((p) => !prev.has(p.id))
    if (fresh.length) announce(fresh)
  }, [purchases])
}
