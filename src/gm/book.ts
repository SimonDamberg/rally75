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

/** A bet as the bettor list needs it: who placed it, and when. */
interface OwnedBet {
  player_id: string
  horse_n: number
  stake: number
  status: BetStatus
  created_at: string
}

export interface Bettor {
  player_id: string
  /** Everything this player has riding on the horse. */
  stake: number
  /** How many separate bets that is. */
  count: number
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

/**
 * Who is on one horse, biggest first. A player who backed the same horse twice appears once with
 * the stakes summed. Voided bets are dropped, the same as summarizeBook. Ties keep the order the
 * bets arrived in, so the list does not reshuffle itself while the room is reading it.
 */
export function bettorsOn(bets: readonly OwnedBet[], horseN: number): Bettor[] {
  const byPlayer = new Map<string, Bettor>()
  for (const b of bets) {
    if (b.status === 'void' || b.horse_n !== horseN) continue
    const found = byPlayer.get(b.player_id)
    if (found) {
      found.stake += b.stake
      found.count += 1
    } else {
      byPlayer.set(b.player_id, { player_id: b.player_id, stake: b.stake, count: 1 })
    }
  }
  // Map preserves insertion order, so a stable sort leaves equal stakes in first-bet order.
  return [...byPlayer.values()].sort((a, b) => b.stake - a.stake)
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
