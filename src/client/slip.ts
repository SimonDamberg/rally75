// Pure bet slip maths for the guest app: chips, ALL IN, stake checks and the live market.
import { MIN_STAKE } from '../shared/game/economy'
import { computeOdds, poolsFromBets, roundOdds } from '../shared/game/odds'
import type { BetStatus, HorsePublic } from '../shared/game/types'

export const CHIPS = [10, 25, 50, 100, 250] as const

/** Chips stack; the stake never goes above what the player can afford. */
export function addChip(stake: number, chip: number, balance: number): number {
  return clampStake(stake + chip, balance)
}

export function allIn(balance: number): number {
  return Math.max(0, Math.floor(balance))
}

export function clampStake(stake: number, balance: number): number {
  return Math.max(0, Math.min(Math.floor(stake), allIn(balance)))
}

export type StakeCheck = 'ok' | 'too_low' | 'too_poor'

export function checkStake(stake: number, balance: number): StakeCheck {
  if (stake > balance) return 'too_poor'
  if (stake < MIN_STAKE) return balance < MIN_STAKE ? 'too_poor' : 'too_low'
  return 'ok'
}

/**
 * Odds a new bet would capture right now, aligned with `horses`. Pools are the open bets, the same
 * as place_bet on the server.
 */
export function marketOdds(
  horses: readonly Pick<HorsePublic, 'n' | 'baseOdds'>[],
  bets: readonly { horse_n: number; stake: number; status: BetStatus }[],
): { odds: number[]; pools: number[] } {
  const pools = poolsFromBets(
    horses,
    bets.filter((b) => b.status === 'open'),
  )
  return { odds: computeOdds(horses, pools).map(roundOdds), pools }
}
