// Owns cashing in a scanned vinstkort. Mirrors useCoupon, minus the parked code: a vinstkort is only
// ever read by the in-app scanner, so there is no URL to survive onboarding.
import { useCallback, useState } from 'react'
import type { PrizeClaimRow } from '../lib/types'
import { useGuestAction, type Guest } from './guest'

export interface PrizeCardState {
  /** The payout, once the server has made it. */
  claimed: PrizeClaimRow | null
  /** Resolves to the claim, or undefined (the error is already a Swedish toast). */
  claim: (code: string) => Promise<PrizeClaimRow | undefined>
  close: () => void
  busy: boolean
}

export function usePrizeCard(self: Pick<Guest, 'identity' | 'forget'>): PrizeCardState {
  // Same reason as useCoupon: the shell provides GuestContext, so it passes its own identity in.
  const { run, busy } = useGuestAction(self)
  const [claimed, setClaimed] = useState<PrizeClaimRow | null>(null)

  const claim = useCallback(
    async (code: string) => {
      const row = await run((api, identity) => api.claimPrizeCard(identity, code))
      if (row) setClaimed(row)
      return row
    },
    [run],
  )

  const close = useCallback(() => setClaimed(null), [])

  return { claimed, claim, close, busy }
}
