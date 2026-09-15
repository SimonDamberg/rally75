// Pure helpers that turn settled bets and races into what the guest sees: per-bet outcome, the
// result reveal after a race, totals and the history grouped by race.
import type { BetRow, PlayerRow, RaceRow } from '../lib/types'

export type BetOutcome =
  | { kind: 'open' }
  | { kind: 'won'; payout: number }
  | { kind: 'lost' }
  /** GM cancelled the race: stake back. */
  | { kind: 'refunded' }
  /** Voided by an inquiry ruling: the house kept the stake. */
  | { kind: 'kept' }

export function betOutcome(bet: Pick<BetRow, 'status' | 'payout'>): BetOutcome {
  switch (bet.status) {
    case 'open':
      return { kind: 'open' }
    case 'won':
      return { kind: 'won', payout: bet.payout ?? 0 }
    case 'lost':
      return { kind: 'lost' }
    case 'void':
      return (bet.payout ?? 0) > 0 ? { kind: 'refunded' } : { kind: 'kept' }
  }
}

export interface Totals {
  staked: number
  /** Payouts and refunds. */
  paid: number
  /** paid minus staked; open bets count as money out. */
  net: number
}

export function totals(bets: readonly Pick<BetRow, 'stake' | 'payout'>[]): Totals {
  const staked = bets.reduce((s, b) => s + b.stake, 0)
  const paid = bets.reduce((s, b) => s + (b.payout ?? 0), 0)
  return { staked, paid, net: paid - staked }
}

export type RevealKind = 'win' | 'loss' | 'refund' | 'kept' | 'watch' | 'void'

export interface Reveal extends Totals {
  kind: RevealKind
  /** Official winner; null for a voided race. */
  winner: number | null
}

/**
 * The result reveal for a settled race. null while the race is not settled or any of the player's
 * bets on it are still open (race and bet updates arrive separately).
 */
export function revealFor(race: RaceRow, playerBets: readonly BetRow[]): Reveal | null {
  if (race.status !== 'finished' && race.status !== 'void') return null
  const mine = playerBets.filter((b) => b.race_id === race.id)
  if (mine.some((b) => b.status === 'open')) return null
  const sum = totals(mine)
  const winner = race.status === 'finished' ? (race.result?.order[0] ?? null) : null

  let kind: RevealKind
  if (mine.length === 0) kind = race.status === 'void' ? 'void' : 'watch'
  else if (race.status === 'void') kind = sum.paid > 0 ? 'refund' : 'kept'
  else kind = mine.some((b) => b.status === 'won') ? 'win' : 'loss'
  return { ...sum, kind, winner }
}

/**
 * Whether to pop the reveal: not already seen on this device, not for a cancelled race nobody here
 * bet on, and not for a race that was settled before this player signed up.
 */
export function shouldReveal(
  race: RaceRow,
  reveal: Reveal | null,
  player: Pick<PlayerRow, 'created_at'>,
  seenRaceId: string | null,
): boolean {
  if (!reveal || seenRaceId === race.id || reveal.kind === 'void') return false
  if (reveal.kind === 'watch' && race.finished_at && Date.parse(player.created_at) > Date.parse(race.finished_at)) {
    return false
  }
  return true
}

export interface RaceGroup {
  raceId: string
  race: RaceRow | undefined
  bets: BetRow[]
}

/** Bets grouped per race, the race with the newest bet first; bets keep their input order. */
export function groupByRace(bets: readonly BetRow[], races: readonly RaceRow[]): RaceGroup[] {
  const byId = new Map(races.map((r) => [r.id, r]))
  const groups = new Map<string, RaceGroup>()
  const latest = new Map<string, string>()
  for (const b of bets) {
    let g = groups.get(b.race_id)
    if (!g) {
      g = { raceId: b.race_id, race: byId.get(b.race_id), bets: [] }
      groups.set(b.race_id, g)
    }
    g.bets.push(b)
    if (b.created_at > (latest.get(b.race_id) ?? '')) latest.set(b.race_id, b.created_at)
  }
  return [...groups.values()].sort((a, b) => (latest.get(b.raceId) ?? '').localeCompare(latest.get(a.raceId) ?? ''))
}

/** Position in a sorted list (1-based), or null. */
export function rankOf(players: readonly Pick<PlayerRow, 'id'>[], playerId: string): number | null {
  const i = players.findIndex((p) => p.id === playerId)
  return i === -1 ? null : i + 1
}

export const BIG_WIN_RM = 1000
export const BIG_WIN_MULTIPLE = 5

/** A win worth the big celebration: 1 000 RM or more back, or at least five times the stake. */
export function isBigWin(reveal: Pick<Reveal, 'kind' | 'paid' | 'staked'>): boolean {
  return reveal.kind === 'win' && (reveal.paid >= BIG_WIN_RM || reveal.paid >= reveal.staked * BIG_WIN_MULTIPLE)
}
