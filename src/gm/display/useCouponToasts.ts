// Someone won at dart and cashed the kupong in, announced on the display iPad. The physical games
// happen away from the screen, so this is the room's only sign that they feed the same economy.
//
// Same shape as usePurchaseToasts with one difference: a redemption arrives as an UPDATE, not an
// INSERT, so the diff is over the ids that carry a redeemed_at rather than over the whole list.
// Kuponger already cashed in when the iPad loads are not announced.
import { useEffect, useEffectEvent, useRef } from 'react'
import type { CouponRow, PlayerRow } from '../../lib/types'
import { ATTRACT } from '../../shared/content/ui'
import { badgedLabel, fmtRm } from '../../shared/game/format'
import { toast } from '../../ui'

const COUPON_TOAST_MS = 7000
/** More redemptions than this at once fold into a single line. */
const FOLD_AT = 1

export function useCouponToasts(
  coupons: readonly CouponRow[] | undefined,
  players: ReadonlyMap<string, PlayerRow>,
) {
  const seen = useRef<ReadonlySet<string> | null>(null)

  const announce = useEffectEvent((fresh: readonly CouponRow[]) => {
    if (document.hidden) return
    if (fresh.length > FOLD_AT) return void toast({ text: ATTRACT.couponMany(fresh.length), ms: COUPON_TOAST_MS })
    for (const c of fresh) {
      const player = c.redeemed_by ? players.get(c.redeemed_by) : undefined
      const label = player ? badgedLabel(player) : ATTRACT.someone
      toast({ text: ATTRACT.coupon(label, fmtRm(c.amount)), ms: COUPON_TOAST_MS, tone: 'win' })
    }
  })

  useEffect(() => {
    if (!coupons) return
    const redeemed = coupons.filter((c) => c.redeemed_at !== null)
    const prev = seen.current
    seen.current = new Set(redeemed.map((c) => c.id))
    if (!prev) return
    // An Ångra from the GM frees a ticket again; it leaves the seen set with it, so a genuine second
    // redemption of the same ticket is announced like any other.
    const fresh = redeemed.filter((c) => !prev.has(c.id))
    if (fresh.length) announce(fresh)
  }, [coupons])
}
