// Someone just spent their winnings at the black market, announced on the display iPad. Half the
// point of the Butik is that the room sees the beer being bought, not just the beer arriving.
//
// Same shape as useBetToasts: purchases already there when the iPad loads are not announced, and a
// rush folds into one line so the corner does not fill with toasts.
//
// A Mystery Box opening is held back until the guest's reel has stopped (BOX_SPIN_MS plus a beat)
// and then names the prize: the room must never hear it before the winner sees it.
import { useEffect, useEffectEvent, useRef } from 'react'
import type { PlayerRow, PurchaseRow } from '../../lib/types'
import { ATTRACT, RARITY_LABELS } from '../../shared/content/ui'
import { BOX_SPIN_MS } from '../../shared/game/box'
import { badgedLabel, fmtRm } from '../../shared/game/format'
import { toast } from '../../ui'

const BUY_TOAST_MS = 7000
/** More purchases than this at once fold into a single line. */
const FOLD_AT = 1
const BOX_HOLD_MS = BOX_SPIN_MS + 1500

export function usePurchaseToasts(
  purchases: readonly PurchaseRow[] | undefined,
  players: ReadonlyMap<string, PlayerRow>,
) {
  const seen = useRef<ReadonlySet<string> | null>(null)
  const timers = useRef(new Set<number>())

  const label = (p: PurchaseRow) => {
    const player = players.get(p.player_id)
    return player ? badgedLabel(player) : ATTRACT.someone
  }

  const unbox = useEffectEvent((p: PurchaseRow) => {
    if (document.hidden || !p.prize_name || !p.prize_rarity) return
    toast({ text: ATTRACT.unboxed(label(p), p.prize_name, RARITY_LABELS[p.prize_rarity]), ms: BUY_TOAST_MS })
  })

  const announce = useEffectEvent((all: readonly PurchaseRow[]) => {
    for (const p of all.filter((p) => p.prize_name)) {
      const timer = window.setTimeout(() => {
        timers.current.delete(timer)
        unbox(p)
      }, BOX_HOLD_MS)
      timers.current.add(timer)
    }
    const fresh = all.filter((p) => !p.prize_name)
    if (document.hidden || !fresh.length) return
    if (fresh.length > FOLD_AT) return void toast({ text: ATTRACT.boughtMany(fresh.length), ms: BUY_TOAST_MS })
    for (const p of fresh) toast({ text: ATTRACT.bought(label(p), p.item_name, fmtRm(p.price)), ms: BUY_TOAST_MS })
  })

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!purchases) return
    const prev = seen.current
    seen.current = new Set(purchases.map((p) => p.id))
    if (!prev) return
    const fresh = purchases.filter((p) => !prev.has(p.id))
    if (fresh.length) announce(fresh)
  }, [purchases])
}
