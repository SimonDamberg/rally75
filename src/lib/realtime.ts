// Pure helpers for applying Realtime postgres_changes payloads to local row lists.
import { netWorth, nightNet } from '../shared/game/economy'
import type { BetRow, PlayerRow } from './types'

/** The subset of a supabase-js postgres_changes payload we use. */
export interface RowChange {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

/**
 * Upserts (INSERT/UPDATE) or removes (DELETE) a row by id. Returns the same array when nothing
 * changed. `accept` filters inserted/updated rows (e.g. bets of one race); DELETE payloads only
 * carry the primary key, so deletes always apply by id.
 */
export function applyChange<T extends { id: string }>(
  rows: readonly T[],
  change: RowChange,
  toRow: (raw: Record<string, unknown>) => T,
  accept: (row: T) => boolean = () => true,
): T[] {
  if (change.eventType === 'DELETE') {
    const id = change.old.id
    const next = rows.filter((r) => r.id !== id)
    return next.length === rows.length ? (rows as T[]) : next
  }
  const row = toRow(change.new)
  const i = rows.findIndex((r) => r.id === row.id)
  if (!accept(row)) return i === -1 ? (rows as T[]) : rows.filter((_, j) => j !== i)
  if (i === -1) return [...rows, row]
  const next = rows.slice()
  next[i] = row
  return next
}

/** Richest first, counting the debt against you (see netWorth); ties by name. */
export function byNetWorth(players: readonly PlayerRow[]): PlayerRow[] {
  return players.slice().sort((a, b) => netWorth(b) - netWorth(a) || a.name.localeCompare(b.name, 'sv'))
}

/** "Dagens största förlorare": furthest behind for the night first (see nightNet). */
export function byLosses(players: readonly PlayerRow[]): PlayerRow[] {
  return players.slice().sort((a, b) => nightNet(a) - nightNet(b) || b.loans_taken - a.loans_taken)
}

/** "Dagens största slösare": most RM left in the Butik first; ties by name. */
export function bySpending(players: readonly PlayerRow[]): PlayerRow[] {
  return players
    .filter((p) => p.spent > 0)
    .sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name, 'sv'))
}

export interface FreshBets {
  seen: ReadonlySet<string>
  fresh: BetRow[]
}

/**
 * Bets not seen before, optionally minus one player's own. With no previous `seen` set (first load)
 * nothing is fresh: bets that were already there are not announced. Shared by the guest social
 * proof and the GM display bet toasts; pass an empty `playerId` to keep every bet.
 */
export function freshBets(seen: ReadonlySet<string> | null, bets: readonly BetRow[], playerId: string): FreshBets {
  if (!seen) return { seen: new Set(bets.map((b) => b.id)), fresh: [] }
  const added = bets.filter((b) => !seen.has(b.id))
  if (added.length === 0) return { seen, fresh: [] }
  return {
    seen: new Set([...seen, ...added.map((b) => b.id)]),
    fresh: added.filter((b) => b.player_id !== playerId),
  }
}
