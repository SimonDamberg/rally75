// Odds drift for the live ticker. Compares displayed (rounded) odds, so float noise never flashes.
import { roundOdds } from '../shared/game/odds'

/** up = odds lengthened (money elsewhere), down = shortened (money on this horse). */
export type Drift = 'up' | 'down' | 'none'

export function oddsDrift(prev: number | null | undefined, next: number): Drift {
  if (prev == null || !Number.isFinite(prev) || !Number.isFinite(next)) return 'none'
  const a = roundOdds(prev)
  const b = roundOdds(next)
  return b > a ? 'up' : b < a ? 'down' : 'none'
}
