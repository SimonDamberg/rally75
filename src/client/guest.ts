// Guest context (this device's player, bets and the active race, fetched once in ClientShell) and
// useGuestAction, the wrapper for guest RPCs.
import { createContext, useCallback, useContext, useState } from 'react'
import type { Api } from '../lib/api'
import { toRallyError } from '../lib/errors'
import { getApi } from '../lib/supabase'
import type { BetRow, BoxPrizeRow, Identity, PlayerRow, RaceRow, ShopItemRow } from '../lib/types'
import { GUEST_ERRORS } from '../shared/content/client'
import { toast } from '../ui'

export interface Guest {
  identity: Identity
  /** undefined while loading. */
  player: PlayerRow | undefined
  /** This player's bets, newest first; undefined while loading. */
  bets: BetRow[] | undefined
  race: RaceRow | null | undefined
  /** Every bet on the active race, oldest first; undefined while loading. */
  raceBets: BetRow[] | undefined
  raceError: Error | null
  /** The Butik catalogue, shared so only the shell opens a channel; undefined while loading. */
  shopItems: ShopItemRow[] | undefined
  /** The Mystery Box contents, shared the same way; undefined while loading. */
  boxPrizes: BoxPrizeRow[] | undefined
  forget: () => void
}

export const GuestContext = createContext<Guest | null>(null)

export function useGuest(): Guest {
  const guest = useContext(GuestContext)
  if (!guest) throw new Error('useGuest utanför GuestContext')
  return guest
}

export interface GuestAction {
  /**
   * Runs a guest RPC with this device's identity. Errors become toasts; a deleted account or a
   * stale token signs out. Resolves to undefined on failure.
   */
  run: <T>(call: (api: Api, identity: Identity) => Promise<T>) => Promise<T | undefined>
  busy: boolean
}

/**
 * `self` is for the shell itself: ClientShell renders the provider, so it sits *above* its own
 * context and cannot read it. Every component inside the shell omits it and takes the context.
 */
export function useGuestAction(self?: Pick<Guest, 'identity' | 'forget'>): GuestAction {
  const context = useContext(GuestContext)
  const source = self ?? context
  if (!source) throw new Error('useGuestAction utanför GuestContext')
  const { identity, forget } = source
  const [pending, setPending] = useState(0)

  const run = useCallback(
    async <T>(call: (api: Api, identity: Identity) => Promise<T>): Promise<T | undefined> => {
      setPending((n) => n + 1)
      try {
        return await call(getApi(), identity)
      } catch (err) {
        const error = toRallyError(err)
        if (error.code === 'player_not_found' || error.code === 'invalid_token') {
          toast({ text: GUEST_ERRORS.forgotten, tone: 'error' })
          forget()
        } else {
          toast({ text: error.message, tone: 'error' })
        }
        return undefined
      } finally {
        setPending((n) => n - 1)
      }
    },
    [identity, forget],
  )

  return { run, busy: pending > 0 }
}
