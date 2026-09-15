// Pure bet book maths for the GM live bets panel and the result summary.
import { computeOdds, payoutFor, poolsFromBets, roundOdds } from '../shared/game/odds'
import type { BetStatus, HorsePublic } from '../shared/game/types'

interface BookBet {
  horse_n: number
  stake: number
  /** Captured at placement. */
  odds: number
  payout: number | null
  status: BetStatus
}

export interface HorseBook {
  n: number
  /** RM staked on this horse. */
  pool: number
  count: number
  /** Current odds as a new bet would capture them. */
  odds: number
  /** RM paid out (stakes included) if this horse wins. */
  liability: number
  /** House result if this horse wins: all stakes minus the liability. Negative = house loses. */
  houseIfWins: number
}

export interface Book {
  horses: HorseBook[]
  totalStake: number
  count: number
}

/** Counts every bet that was not voided; pools match the server while the race is live. */
export function summarizeBook(horses: readonly Pick<HorsePublic, 'n' | 'baseOdds'>[], bets: readonly BookBet[]): Book {
  const live = bets.filter((b) => b.status !== 'void')
  const pools = poolsFromBets(horses, live)
  const odds = computeOdds(horses, pools).map(roundOdds)
  const totalStake = live.reduce((s, b) => s + b.stake, 0)
  return {
    totalStake,
    count: live.length,
    horses: horses.map((h, i) => {
      const mine = live.filter((b) => b.horse_n === h.n)
      const liability = mine.reduce((s, b) => s + payoutFor(b.stake, b.odds), 0)
      return { n: h.n, pool: pools[i], count: mine.length, odds: odds[i], liability, houseIfWins: totalStake - liability }
    }),
  }
}

export interface Settlement {
  staked: number
  paidOut: number
  /** Stakes kept minus payouts (refunds included). */
  houseNet: number
}

/** Settled money for a finished or voided race. */
export function settle(bets: readonly BookBet[]): Settlement {
  const staked = bets.reduce((s, b) => s + b.stake, 0)
  const paidOut = bets.reduce((s, b) => s + (b.payout ?? 0), 0)
  return { staked, paidOut, houseNet: staked - paidOut }
}
