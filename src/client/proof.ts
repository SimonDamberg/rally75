// Fake social proof, the pure part: invented win toasts and real bets from other guests.
import type { BetRow, PlayerRow } from '../lib/types'
import { ORTER } from '../shared/content/names'
import { fakeWinToast, PROOF, TOAST_NAMN } from '../shared/content/parody'
import { fmtRm, playerLabel } from '../shared/game/format'
import type { Rng } from '../shared/game/rng'
import type { HorsePublic } from '../shared/game/types'

/** Delay between fake win toasts. */
export const FAKE_WIN_MS = [18_000, 35_000] as const
export const FAKE_WIN_AMOUNT = [400, 48_000] as const
/** More fresh bets than this fold into one toast. */
export const BET_FOLD_AT = 2

export function fakeWinDelay(rng: Rng): number {
  const [lo, hi] = FAKE_WIN_MS
  return lo + rng.int(hi - lo + 1)
}

/** "Kerstin från Tierp vann just 31 573 RM" */
export function fakeWinText(rng: Rng): string {
  const [lo, hi] = FAKE_WIN_AMOUNT
  return fakeWinToast(rng.pick(TOAST_NAMN), rng.pick(ORTER), fmtRm(lo + rng.int(hi - lo + 1)))
}

export interface FreshBets {
  seen: ReadonlySet<string>
  fresh: BetRow[]
}

/**
 * Bets not seen before, placed by someone else. With no previous `seen` set (first load) nothing
 * is fresh: bets already there are not announced.
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

/** Toast texts for fresh bets; a rush folds into one. */
export function betToastTexts(
  fresh: readonly BetRow[],
  players: ReadonlyMap<string, Pick<PlayerRow, 'name' | 'tag'>>,
  field: readonly Pick<HorsePublic, 'n' | 'name'>[],
): string[] {
  if (fresh.length > BET_FOLD_AT) return [PROOF.betsFolded(fresh.length)]
  return fresh.flatMap((b) => {
    const horse = field.find((h) => h.n === b.horse_n)
    if (!horse) return []
    const p = players.get(b.player_id)
    return [PROOF.bet(p ? playerLabel(p.name, p.tag) : PROOF.someone, fmtRm(b.stake), horse.name)]
  })
}
