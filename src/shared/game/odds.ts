// Parimutuel totalisator with virtual seed money, ported from the prototype.
// Invariant (tested): money on a horse always shortens that horse.
// Mirrored in SQL (private.compute_odds, place_bet, gm_publish_result); keep them in sync.

/** RM the house has notionally staked along the morning line. Raise to damp movement. */
export const VIRTUAL_POOL = 700
/** House margin. */
export const TAKEOUT = 0.87
export const MIN_ODDS = 1.15
export const MAX_ODDS = 20
/** How sharply strength turns into win chance. Shared by the morning line and the race sim. */
export const STRENGTH_POWER = 3.2

/**
 * True win chance per horse, aligned with `stats`. The morning line is built from these (with a
 * margin and noise), and simulateRace draws the finish order from them, so the odds tell the truth
 * on average and the house keeps its edge.
 */
export function winWeights(stats: readonly { strength: number }[]): number[] {
  const w = stats.map((h) => h.strength ** STRENGTH_POWER)
  const tot = w.reduce((a, b) => a + b, 0)
  return w.map((x) => x / tot)
}

/**
 * Current (unrounded) odds per horse. `pools[i]` is the real money on `horses[i]`.
 *   p_i    = (1/baseOdds_i) / Σ(1/baseOdds)
 *   eff_i  = VIRTUAL_POOL * p_i + pool_i
 *   odds_i = clamp(TAKEOUT / (eff_i / Σeff), MIN_ODDS, MAX_ODDS)
 */
export function computeOdds(horses: readonly { baseOdds: number }[], pools: readonly number[]): number[] {
  const impl = horses.map((h) => 1 / h.baseOdds)
  const implSum = impl.reduce((a, b) => a + b, 0)
  const eff = horses.map((_, i) => VIRTUAL_POOL * (impl[i] / implSum) + (pools[i] ?? 0))
  const total = eff.reduce((a, b) => a + b, 0)
  return eff.map((e) => Math.min(MAX_ODDS, Math.max(MIN_ODDS, TAKEOUT / (e / total))))
}

/** Odds as shown and as captured on a bet: 2 decimals, half away from zero. */
export function roundOdds(odds: number): number {
  return Math.round((odds + Number.EPSILON) * 100) / 100
}

/**
 * Whole RallyMynt (RM) paid on a winning bet (stake included), rounded half up. Integer math on
 * odds in hundredths so it matches SQL `round(stake * odds::numeric)` exactly; a float
 * `Math.round(stake * odds)` gives 61 instead of 62 for 15 RM at 4.10.
 */
export function payoutFor(stake: number, odds: number): number {
  return Math.floor((stake * Math.round(odds * 100) + 50) / 100)
}

export type OddsDrift = 'up' | 'down' | 'none'

/** up = odds lengthened (worse for the backer), down = shortened. */
export function oddsDrift(prev: number, next: number): OddsDrift {
  if (next > prev + 0.01) return 'up'
  if (next < prev - 0.01) return 'down'
  return 'none'
}

/** Sums stakes per horse into an array aligned with `horses`. */
export function poolsFromBets(
  horses: readonly { n: number }[],
  bets: readonly { horse_n: number; stake: number }[],
): number[] {
  const idx = new Map(horses.map((h, i) => [h.n, i]))
  const pools = horses.map(() => 0)
  for (const b of bets) {
    const i = idx.get(b.horse_n)
    if (i !== undefined) pools[i] += b.stake
  }
  return pools
}
