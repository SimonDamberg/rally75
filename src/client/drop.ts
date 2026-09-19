// Plånko on the phone: board geometry for the ball animation, and what the header shows while balls
// are still falling. Pure, so both are tested (drop.test.ts). Named for the action, like slip.ts and
// repay.ts: plinko.ts would collide with Plinko.tsx on a case-insensitive filesystem.
import { pathSteps, PLINKO_ROWS } from '../shared/game/plinko'

/** Board units (SVG user units): horizontal peg spacing and row height. */
export const PEG_DX = 24
export const PEG_DY = 22
/** Where the ball appears, above the first row. */
export const DROP_Y = -18
/** y of the slot plates' centre. */
export const SLOT_Y = PLINKO_ROWS * PEG_DY + 10

/** Pegs of row r, centred on x = 0. Row 0 has three pegs and every row adds one. */
export function pegsInRow(r: number): { x: number; y: number }[] {
  const n = r + 3
  return Array.from({ length: n }, (_, j) => ({ x: (j - (n - 1) / 2) * PEG_DX, y: r * PEG_DY }))
}

/** Centre x of slot k (0 to PLINKO_ROWS). */
export function slotX(k: number): number {
  return (k - PLINKO_ROWS / 2) * PEG_DX
}

/**
 * The ball's points: the drop point, the top of the peg it hits in each row, and its slot. Each
 * bounce moves half a peg spacing, so after the last row it sits exactly over slotX(rights).
 */
export function ballPoints(path: number): { x: number; y: number }[] {
  const points = [{ x: 0, y: DROP_Y }]
  let x = 0
  pathSteps(path).forEach((right, r) => {
    points.push({ x, y: r * PEG_DY - 7 })
    x += right ? PEG_DX / 2 : -PEG_DX / 2
  })
  points.push({ x, y: SLOT_Y })
  return points
}

/**
 * The balance the header shows while balls are in the air: the balance after the newest drop
 * minus the payouts still falling. The server has already paid them, but the guest should see the
 * money land with the ball. undefined when nothing is falling (the header shows the live balance).
 */
export function heldBalance(
  latest: { balance_after: number } | undefined,
  falling: readonly { payout: number }[],
): number | undefined {
  if (!latest || falling.length === 0) return undefined
  return latest.balance_after - falling.reduce((sum, d) => sum + d.payout, 0)
}
