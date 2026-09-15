// Decides when the result reveal pops: once per settled race per device, after every bet settled.
import { useCallback, useState } from 'react'
import { loadSeenResult, saveSeenResult } from '../lib/identity'
import type { BetRow, PlayerRow, RaceRow } from '../lib/types'
import { revealFor, shouldReveal, type Reveal } from './outcome'

export interface ResultRevealState {
  open: boolean
  data: Reveal | null
  close: () => void
}

export function useResultReveal(
  race: RaceRow | null | undefined,
  bets: readonly BetRow[] | undefined,
  player: PlayerRow | undefined,
): ResultRevealState {
  const [seen, setSeen] = useState(loadSeenResult)
  const data = race && bets ? revealFor(race, bets) : null
  const open = !!race && !!player && shouldReveal(race, data, player, seen)
  const raceId = race?.id
  const close = useCallback(() => {
    if (!raceId) return
    saveSeenResult(raceId)
    setSeen(raceId)
  }, [raceId])
  return { open, data, close }
}
