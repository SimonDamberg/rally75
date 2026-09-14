// Row types for the Supabase tables and RPC results. Hand-written (not generated) so the jsonb
// columns carry the real shared game types. Keep in sync with supabase/migrations/.
import type { BetStatus, HorsePublic, HorseStats, RaceStatus, Ruling } from '../shared/game/types'

export interface PlayerRow {
  id: string
  name: string
  /** Random 10..99, shown as "Simon #42". */
  tag: number
  balance: number
  debt: number
  loans_taken: number
  created_at: string
}

export interface RaceResult {
  /** Official order after the ruling, winner first. */
  order: number[]
  /** The simulated finish order the GM published. */
  original_order: number[]
  ruling: Ruling
  inquiry_text: string | null
}

export interface RaceRow {
  id: string
  race_no: number
  status: RaceStatus
  dist: string
  cond: string
  field: HorsePublic[]
  result: RaceResult | null
  created_at: string
  betting_at: string | null
  closed_at: string | null
  started_at: string | null
  finished_at: string | null
}

export interface BetRow {
  id: string
  player_id: string
  race_id: string
  horse_n: number
  stake: number
  /** Odds captured at placement. */
  odds: number
  /** null while open; stake for a refunded void, 0 for lost or house-kept void. */
  payout: number | null
  status: BetStatus
  created_at: string
}

export interface KuskRow {
  id: string
  name: string
  title: string
  notes: string[]
  active: boolean
  created_at: string
}

export interface GameStateRow {
  id: boolean
  active_race_id: string | null
}

export interface RaceSecrets {
  stats: HorseStats[]
  seed: number
}

/** Returned once by create_player. Store it; the token is never readable again. */
export interface NewPlayer {
  id: string
  token: string
  tag: number
}

export interface Identity {
  playerId: string
  token: string
}

/** A generated race card as sent to gm_create_race / gm_reroll_race. */
export interface RaceCardInput {
  horses: HorsePublic[]
  stats: HorseStats[]
  seed: number
  dist: string
  cond: string
}

export interface KuskInputRow {
  /** null creates a new kusk. */
  id: string | null
  name: string
  title: string
  notes: string[]
  active: boolean
}

// numeric columns may arrive as strings (Realtime); normalize at the edge.

export function toBet(row: Record<string, unknown>): BetRow {
  return { ...(row as unknown as BetRow), odds: Number(row.odds) }
}

export function toPlayer(row: Record<string, unknown>): PlayerRow {
  return row as unknown as PlayerRow
}

export function toRace(row: Record<string, unknown>): RaceRow {
  return row as unknown as RaceRow
}
