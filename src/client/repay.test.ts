import { describe, expect, it } from 'vitest'
import { addRepayChip, afterRepay, checkRepay, clampRepay, maxRepay, REPAY_CHIPS } from './repay'
import { LOAN_AMOUNT, LOAN_DEBT, MIN_STAKE, netWorth, nightNet } from '../shared/game/economy'

describe('maxRepay', () => {
  it('stops at whichever of saldo and skuld runs out first', () => {
    expect(maxRepay(2000, LOAN_DEBT)).toBe(LOAN_DEBT)
    expect(maxRepay(300, LOAN_DEBT)).toBe(300)
    expect(maxRepay(0, LOAN_DEBT)).toBe(0)
    expect(maxRepay(500, 0)).toBe(0)
  })

  it('never goes negative or fractional', () => {
    expect(maxRepay(-50, 100)).toBe(0)
    expect(maxRepay(120.9, 500)).toBe(120)
  })
})

describe('clampRepay and chips', () => {
  it('keeps the amount inside what can be paid', () => {
    expect(clampRepay(9999, 800, LOAN_DEBT)).toBe(800)
    expect(clampRepay(-10, 800, LOAN_DEBT)).toBe(0)
    expect(clampRepay(250, 800, LOAN_DEBT)).toBe(250)
  })

  it('stacks chips', () => {
    let amount = 0
    for (const chip of REPAY_CHIPS) amount = addRepayChip(amount, chip, 5000, 5000)
    expect(amount).toBe(REPAY_CHIPS.reduce((a, b) => a + b, 0))
  })

  it('stops stacking at the ceiling', () => {
    // The chips add up past one Snabblån, so they clamp to what is actually owed.
    let amount = 0
    for (const chip of REPAY_CHIPS) amount = addRepayChip(amount, chip, 5000, LOAN_DEBT)
    expect(amount).toBe(LOAN_DEBT)
    expect(addRepayChip(amount, 1000, 5000, LOAN_DEBT)).toBe(LOAN_DEBT)
  })
})

describe('checkRepay', () => {
  it('names why the button is dead', () => {
    expect(checkRepay(100, 500, LOAN_DEBT)).toBe('ok')
    expect(checkRepay(100, 500, 0)).toBe('no_debt')
    expect(checkRepay(100, MIN_STAKE - 1, LOAN_DEBT)).toBe('no_money')
    expect(checkRepay(0, 500, LOAN_DEBT)).toBe('nothing_picked')
  })
})

describe('afterRepay', () => {
  it('takes the same amount off both numbers', () => {
    expect(afterRepay({ balance: 2000, debt: LOAN_DEBT }, 500)).toEqual({ balance: 1500, debt: LOAN_DEBT - 500 })
  })

  it('clears the debt exactly when paying it all', () => {
    const player = { balance: 2000, debt: LOAN_DEBT }
    expect(afterRepay(player, maxRepay(player.balance, player.debt))).toEqual({ balance: 2000 - LOAN_DEBT, debt: 0 })
  })

  it('cannot overpay past zero', () => {
    expect(afterRepay({ balance: 2000, debt: 300 }, 9999)).toEqual({ balance: 1700, debt: 0 })
  })

  it('leaves both leaderboards where they were', () => {
    // Repaying moves balance and debt by the same amount, so it is not a way up the Topplista.
    const before = { balance: LOAN_AMOUNT + 1000, debt: LOAN_DEBT }
    const after = afterRepay(before, 400)
    expect(netWorth(after)).toBe(netWorth(before))
    expect(nightNet(after)).toBe(nightNet(before))
  })
})
