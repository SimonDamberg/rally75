import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LOAN_AMOUNT, LOAN_DEBT, MAX_NAME_LENGTH, MIN_STAKE, netWorth, nightNet, WELCOME_BONUS } from './economy'

const MIGRATIONS = join(import.meta.dirname, '..', '..', '..', 'supabase', 'migrations')

describe('economy constants', () => {
  it('match the SQL mirror header', () => {
    const file = readdirSync(MIGRATIONS).find((f) => f.endsWith('_rpc_client.sql'))!
    const sql = readFileSync(join(MIGRATIONS, file), 'utf8')
    expect(sql).toContain(
      `WELCOME_BONUS ${WELCOME_BONUS}, MIN_STAKE ${MIN_STAKE}, LOAN_AMOUNT ${LOAN_AMOUNT}, LOAN_DEBT ${LOAN_DEBT}, MAX_NAME_LENGTH ${MAX_NAME_LENGTH}.`,
    )
    expect(sql).toContain(`values (v_name, v_tag, ${WELCOME_BONUS})`)
    expect(sql).toContain(`p_stake < ${MIN_STAKE}`)
    expect(sql).toContain(`balance >= ${MIN_STAKE}`)
    expect(sql).toContain(`balance = balance + ${LOAN_AMOUNT}, debt = debt + ${LOAN_DEBT}`)
    expect(sql).toContain(`char_length(v) > ${MAX_NAME_LENGTH}`)
  })
})

describe('netWorth', () => {
  it('takes the debt off the balance', () => {
    expect(netWorth({ balance: 2000, debt: 0, spent: 0 })).toBe(2000)
    expect(netWorth({ balance: 2000, debt: LOAN_DEBT, spent: 0 })).toBe(2000 - LOAN_DEBT)
  })

  it('goes negative when the debt is larger than the balance', () => {
    // A Snabblån hands over LOAN_AMOUNT but books LOAN_DEBT, so one loan alone puts you under.
    expect(netWorth({ balance: LOAN_AMOUNT, debt: LOAN_DEBT, spent: 0 })).toBe(LOAN_AMOUNT - LOAN_DEBT)
    expect(netWorth({ balance: LOAN_AMOUNT, debt: LOAN_DEBT, spent: 0 })).toBeLessThan(0)
  })

  it('is nightNet plus the welcome bonus', () => {
    const player = { balance: 1750, debt: LOAN_DEBT, spent: 0 }
    expect(netWorth(player) - WELCOME_BONUS).toBe(nightNet(player))
  })
})

describe('netWorth with Butik spending', () => {
  it('adds spent back, so buying cannot cost you a place', () => {
    const before = { balance: 3000, debt: 0, spent: 0 }
    const after = { balance: 2500, debt: 0, spent: 500 }
    expect(netWorth(after)).toBe(netWorth(before))
  })

  it('still counts the debt against you while spending is neutral', () => {
    expect(netWorth({ balance: 1000, debt: LOAN_DEBT, spent: 2000 })).toBe(3000 - LOAN_DEBT)
  })
})

describe('nightNet', () => {
  it('counts from zero, not from the welcome bonus', () => {
    expect(nightNet({ balance: WELCOME_BONUS, debt: 0, spent: 0 })).toBe(0)
    expect(nightNet({ balance: WELCOME_BONUS + 250, debt: 0, spent: 0 })).toBe(250)
    expect(nightNet({ balance: 0, debt: 0, spent: 0 })).toBe(-WELCOME_BONUS)
  })

  it('counts a Snabblån as a loss of the full debt', () => {
    // Borrowed once and did not bet: up LOAN_AMOUNT in hand, but owing LOAN_DEBT.
    const borrowed = { balance: WELCOME_BONUS + LOAN_AMOUNT, debt: LOAN_DEBT, spent: 0 }
    expect(nightNet(borrowed)).toBe(LOAN_AMOUNT - LOAN_DEBT)
    expect(nightNet(borrowed)).toBeLessThan(0)
  })

  it('ignores Butik spending, the same as netWorth', () => {
    const saved = { balance: WELCOME_BONUS + 900, debt: 0, spent: 0 }
    const spent = { balance: WELCOME_BONUS + 400, debt: 0, spent: 500 }
    expect(nightNet(spent)).toBe(nightNet(saved))
  })

  it('puts a broke borrower below someone merely broke', () => {
    const broke = nightNet({ balance: 0, debt: 0, spent: 0 })
    const brokeAndOwing = nightNet({ balance: 0, debt: LOAN_DEBT, spent: 0 })
    expect(brokeAndOwing).toBeLessThan(broke)
  })
})
