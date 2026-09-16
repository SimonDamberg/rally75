// Fake social proof on the guest's phone: invented win toasts on a timer, plus real bets by other
// guests on the active race.
import { useEffect, useEffectEvent, useRef } from 'react'
import { useConnection } from '../lib/hooks'
import { freshBets } from '../lib/realtime'
import type { BetRow, PlayerRow, RaceRow } from '../lib/types'
import { createRng, randomSeed } from '../shared/game/rng'
import { toast } from '../ui'
import { betToastTexts, fakeWinDelay, fakeWinText } from './proof'

const rng = createRng(randomSeed())
const WIN_TOAST_MS = 4000
const BET_TOAST_MS = 3500

export interface SocialProofInput {
  race: RaceRow | null | undefined
  raceBets: readonly BetRow[] | undefined
  playerId: string
  players: ReadonlyMap<string, PlayerRow>
  /** A pop-up needs the guest's attention: keep quiet. */
  paused: boolean
}

export function useSocialProof({ race, raceBets, playerId, players, paused }: SocialProofInput) {
  const online = useConnection() === 'online'
  const quiet = paused || !online

  const fakeWin = useEffectEvent(() => {
    if (!quiet && !document.hidden) toast({ text: fakeWinText(rng), tone: 'win', ms: WIN_TOAST_MS })
  })
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const schedule = () => {
      t = setTimeout(() => {
        fakeWin()
        schedule()
      }, fakeWinDelay(rng))
    }
    schedule()
    return () => clearTimeout(t)
  }, [])

  // Bets already on the race when this device loads (or switches race) are not announced.
  const raceId = race?.id
  const field = race?.field
  const seen = useRef<{ raceId: string; ids: ReadonlySet<string> } | null>(null)
  const announce = useEffectEvent((fresh: BetRow[], horses: NonNullable<typeof field>) => {
    if (quiet || document.hidden) return
    for (const text of betToastTexts(fresh, players, horses)) toast({ text, ms: BET_TOAST_MS })
  })
  useEffect(() => {
    if (!raceId || !raceBets || !field) return
    const prev = seen.current?.raceId === raceId ? seen.current.ids : null
    const next = freshBets(prev, raceBets, playerId)
    seen.current = { raceId, ids: next.seen }
    if (next.fresh.length) announce(next.fresh, field)
  }, [raceId, raceBets, field, playerId])
}
