// Pure repayment maths for the Bank tab: chips, "Allt", and what the two numbers become after.
// Mirrors slip.ts. These chips are UI only, so they stay here and not in economy.ts, which is
// mirrored in SQL.
import { MIN_STAKE } from '../shared/game/economy'

export const REPAY_CHIPS = [100, 500, 1000] as const

/** The most that can go to the debt right now: you cannot pay more than you owe or than you hold. */
export function maxRepay(balance: number, debt: number): number {
  return Math.max(0, Math.min(Math.floor(balance), Math.floor(debt)))
}

export function clampRepay(amount: number, balance: number, debt: number): number {
  return Math.max(0, Math.min(Math.floor(amount), maxRepay(balance, debt)))
}

/** Chips stack, the same as the bet slip, and stop at what is owed. */
export function addRepayChip(amount: number, chip: number, balance: number, debt: number): number {
  return clampRepay(amount + chip, balance, debt)
}

export type RepayCheck = 'ok' | 'no_debt' | 'no_money' | 'nothing_picked'

export function checkRepay(amount: number, balance: number, debt: number): RepayCheck {
  if (debt <= 0) return 'no_debt'
  // Below the minimum stake there is nothing left to bet with anyway; keep the last RM.
  if (balance < MIN_STAKE) return 'no_money'
  if (amount < 1) return 'nothing_picked'
  return 'ok'
}

/** The "kvar efter" line: what saldo and skuld become if this payment goes through. */
export function afterRepay(
  player: { balance: number; debt: number },
  amount: number,
): { balance: number; debt: number } {
  const paid = clampRepay(amount, player.balance, player.debt)
  return { balance: player.balance - paid, debt: player.debt - paid }
}
