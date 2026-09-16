// The settled race, full screen on the iPad. Same panel the control phone shows, at TV size and
// without the actions: the display never advances the night, it only reports it.
import type { BetRow, PlayerRow, RaceRow } from '../../lib/types'
import { ResultPanel } from '../ResultPanel'

export function ResultDisplay({
  race,
  bets,
  players,
}: {
  race: RaceRow
  bets: readonly BetRow[] | undefined
  players: ReadonlyMap<string, PlayerRow>
}) {
  return (
    <div className="flex h-dvh animate-pop-in flex-col justify-center overflow-y-auto bg-night-deep px-10 py-8">
      <ResultPanel race={race} bets={bets} players={players} size="tv" />
    </div>
  )
}
