// Plånko: Mr Green's Plinko. One ball, PLINKO_ROWS rows of pegs, one bounce left or right per row,
// and the slot it lands in is the number of rights. The server draws the path and pays in the same
// transaction (`plinko_drop` in supabase/migrations/*_plinko.sql); this module only explains the
// result to the phone and the tests. Mirrored in SQL: the table, the row count, the stake cap and
// the payout rounding. Change both sides together (plinko.test.ts checks the SQL by string).

import { MIN_STAKE } from './economy'

/** Rows of pegs. The path is a PLINKO_ROWS-bit mask, bit i set = bounce right at row i. */
export const PLINKO_ROWS = 12

/**
 * Multiplier per slot in tenths of the stake, so the payout is integer maths on both sides.
 * Slot k is reached by C(12, k) of the 4096 paths: the edges are 1 in 4096, the middle 924 in 4096.
 * RTP is 3735.2 / 4096, about 91 %.
 */
export const PLINKO_M10 = [1000, 120, 40, 15, 10, 5, 3, 5, 10, 15, 40, 120, 1000] as const

/** Biggest stake per ball. A 100x edge hit on this is 25 000 RM. */
export const PLINKO_MAX_STAKE = 250

/** Stake chips on the phone. */
export const PLINKO_CHIPS = [10, 25, 50, 100, 250] as const

/** A hit at or above this (tenths) is announced on the iPad and rains coins on the phone. */
export const PLINKO_BIG_M10 = 100

/** Time per peg row of the phone's ball animation; the drop in counts as one more row. */
export const PLINKO_ROW_MS = 165
/**
 * How long a ball takes to land on the phone. The iPad waits this long before announcing a big hit,
 * so the room never hears the result before the guest sees it.
 */
export const PLINKO_FALL_MS = PLINKO_ROW_MS * (PLINKO_ROWS + 1)

const PATHS = 1 << PLINKO_ROWS

/** The slot a path lands in: the number of right bounces. */
export function slotOf(path: number): number {
  let n = 0
  for (let i = 0; i < PLINKO_ROWS; i++) if (path & (1 << i)) n++
  return n
}

/** Per-row bounce, row 0 first: true = right. Drives the ball animation. */
export function pathSteps(path: number): boolean[] {
  return Array.from({ length: PLINKO_ROWS }, (_, i) => (path & (1 << i)) !== 0)
}

/** Payout for a stake landing in a slot, stake included. Round half up, as the SQL does. */
export function plinkoPayout(stake: number, slot: number): number {
  return Math.floor((stake * PLINKO_M10[slot] + 5) / 10)
}

/** "100x", "1,5x", "0,3x". */
export function fmtMult(m10: number): string {
  return m10 % 10 === 0 ? `${m10 / 10}x` : `${(m10 / 10).toFixed(1).replace('.', ',')}x`
}

function choose(n: number, k: number): number {
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return r
}

/** Probability of landing in each slot. */
export function slotOdds(): number[] {
  return PLINKO_M10.map((_, k) => choose(PLINKO_ROWS, k) / PATHS)
}

/** Expected share of the stake coming back. */
export function plinkoRtp(): number {
  return slotOdds().reduce((sum, p, k) => sum + (p * PLINKO_M10[k]) / 10, 0)
}

/** Why a stake cannot be dropped, or null if it can. */
export type DropCheck = 'too_low' | 'too_high' | 'insufficient' | null

export function checkDrop(stake: number, balance: number): DropCheck {
  if (stake < MIN_STAKE) return 'too_low'
  if (stake > PLINKO_MAX_STAKE) return 'too_high'
  if (stake > balance) return 'insufficient'
  return null
}

/** Totals for a set of drops: what went in, what came back, the difference and the best hit. */
export function dropTotals(drops: readonly { stake: number; payout: number; m10: number }[]): {
  count: number
  staked: number
  paid: number
  net: number
  bestM10: number
} {
  let staked = 0
  let paid = 0
  let bestM10 = 0
  for (const d of drops) {
    staked += d.stake
    paid += d.payout
    bestM10 = Math.max(bestM10, d.m10)
  }
  return { count: drops.length, staked, paid, net: paid - staked, bestM10 }
}
