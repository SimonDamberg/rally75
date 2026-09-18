// Owns cashing in a printed kupong, from both entrances: a scanned /k/<code> URL that ClientApp
// parked in localStorage, and a code typed by hand in the Bank tab.
//
// The parked code is cleared on every terminal path, success or failure. A code that survived a
// failure would pop the same doomed modal on every render and every reload.
import { useCallback, useState } from 'react'
import { loadPendingCode, savePendingCode } from '../lib/identity'
import type { CouponRow } from '../lib/types'
import { normalizeCode } from '../shared/game/coupon'
import { useGuestAction, type Guest } from './guest'

export interface CouponState {
  /** A scanned code waiting for a tap, or null. */
  pending: string | null
  /** The redeemed kupong, once the server has stamped it. */
  claimed: CouponRow | null
  /** Cashes in a code (from the pending scan or typed by hand). Resolves to the row, or undefined. */
  redeem: (code: string) => Promise<CouponRow | undefined>
  /** Drops the pending scan without cashing it in, and closes the reveal. */
  close: () => void
  busy: boolean
}

export function useCoupon(self: Pick<Guest, 'identity' | 'forget'>): CouponState {
  // The shell owns this pop-up, and the shell renders GuestContext, so it has to pass its own
  // identity in rather than read the context it is about to provide.
  const { run, busy } = useGuestAction(self)
  // Read once at mount: the scan happened before this component existed. A code that does not
  // normalise is kept as it was parked, so the server can say so out loud instead of it vanishing.
  const [pending, setPending] = useState(() => {
    const parked = loadPendingCode()
    if (!parked) return null
    return normalizeCode(parked) || parked
  })
  const [claimed, setClaimed] = useState<CouponRow | null>(null)

  const redeem = useCallback(
    async (code: string) => {
      // Errors are already Swedish toasts from useGuestAction; the code is spent either way.
      const row = await run((api, identity) => api.redeemCoupon(identity, code))
      savePendingCode(null)
      setPending(null)
      if (row) setClaimed(row)
      return row
    },
    [run],
  )

  const close = useCallback(() => {
    savePendingCode(null)
    setPending(null)
    setClaimed(null)
  }, [])

  return { pending, claimed, redeem, close, busy }
}
