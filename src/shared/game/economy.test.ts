import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  COUPON_CODE_LENGTH,
  COUPON_MAX_AMOUNT,
  COUPON_MAX_BATCH,
  COUPON_TIERS,
  LOAN_AMOUNT,
  LOAN_DEBT,
  LOAN_THRESHOLD,
  MAX_NAME_LENGTH,
  MIN_STAKE,
  netWorth,
  nightNet,
  PRIZE_CARD_COOLDOWN_S,
  PRIZE_CARD_TIERS,
  WELCOME_BONUS,
} from './economy'

const MIGRATIONS = join(import.meta.dirname, '..', '..', '..', 'supabase', 'migrations')

/** The newest migration that (re)defines a function: that one is live. */
function latestDefining(fn: string): string {
  const file = readdirSync(MIGRATIONS)
    .sort()
    .filter((f) => readFileSync(join(MIGRATIONS, f), 'utf8').includes(`function public.${fn}(`))
    .at(-1)!
  return readFileSync(join(MIGRATIONS, file), 'utf8')
}

describe('economy constants', () => {
  it('match the SQL mirror header', () => {
    const file = readdirSync(MIGRATIONS).find((f) => f.endsWith('_rpc_client.sql'))!
    const sql = readFileSync(join(MIGRATIONS, file), 'utf8')
    // create_player and take_loan have been replaced since (Simon's party numbers).
    const bonusSql = latestDefining('create_player')
    expect(bonusSql).toContain(
      `WELCOME_BONUS ${WELCOME_BONUS}, MIN_STAKE ${MIN_STAKE}, LOAN_AMOUNT ${LOAN_AMOUNT}, LOAN_DEBT ${LOAN_DEBT}, MAX_NAME_LENGTH ${MAX_NAME_LENGTH}.`,
    )
    expect(bonusSql).toContain(`values (v_name, v_tag, ${WELCOME_BONUS})`)
    expect(sql).toContain(`p_stake < ${MIN_STAKE}`)
    expect(sql).toContain(`char_length(v) > ${MAX_NAME_LENGTH}`)
  })

  it('match the SQL mirror for the Snabblån', () => {
    const sql = latestDefining('take_loan')
    expect(sql).toContain(`LOAN_THRESHOLD ${LOAN_THRESHOLD}.`)
    expect(sql).toContain(`balance >= ${LOAN_THRESHOLD} then`)
    expect(sql).toContain(`balance = balance + ${LOAN_AMOUNT}, debt = debt + ${LOAN_DEBT}`)
    expect(LOAN_THRESHOLD).toBeGreaterThanOrEqual(MIN_STAKE)
  })

  /**
   * The coupon caps live in their own migration, so this targets the newest file ending _coupons.sql
   * the way kuskSeed.test.ts targets the newest seed (the mirror header above is in an applied file
   * and migrations are append-only).
   */
  it('match the SQL mirror for the kupong caps', () => {
    const file = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith('_coupons.sql'))
      .sort()
      .at(-1)!
    const sql = readFileSync(join(MIGRATIONS, file), 'utf8')
    expect(sql).toContain(`COUPON_MAX_AMOUNT ${COUPON_MAX_AMOUNT}, COUPON_MAX_BATCH ${COUPON_MAX_BATCH}.`)
    // The table constraint and the RPC guard, which are what actually stop a typo minting a fortune.
    expect(sql).toContain(`amount > 0 and amount <= ${COUPON_MAX_AMOUNT}`)
    expect(sql).toContain(`p_amount < 1 or p_amount > ${COUPON_MAX_AMOUNT}`)
    expect(sql).toContain(`p_count < 1 or p_count > ${COUPON_MAX_BATCH}`)
    // One byte per character, so the alphabet and the code length have to agree with the loop.
    expect(sql).toContain(`extensions.gen_random_bytes(${COUPON_CODE_LENGTH})`)
    expect(sql).toContain(`for b in 0..${COUPON_CODE_LENGTH - 1} loop`)
  })
})

describe('vinstkort', () => {
  const sql = () => {
    const file = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith('_prize_cards.sql'))
      .sort()
      .at(-1)!
    return readFileSync(join(MIGRATIONS, file), 'utf8')
  }

  it('match the SQL mirror for the tiers and the cooldown', () => {
    const text = sql()
    const pairs = PRIZE_CARD_TIERS.map((t) => `(${t.tier}, ${t.amount})`).join(', ')
    expect(text).toContain(`check ((tier, amount) in (${pairs}))`)
    const cases = PRIZE_CARD_TIERS.map((t) => `when ${t.tier} then ${t.amount}`).join(' ')
    expect(text).toContain(`case p_tier ${cases} end`)
    expect(text).toContain(`PRIZE_CARD_COOLDOWN_S ${PRIZE_CARD_COOLDOWN_S}.`)
    expect(text).toContain(`now() - interval '${PRIZE_CARD_COOLDOWN_S} seconds'`)
    expect(text).toContain(`extensions.gen_random_bytes(${COUPON_CODE_LENGTH})`)
    expect(text).toContain(`for b in 0..${COUPON_CODE_LENGTH - 1} loop`)
  })

  it('never grants or publishes the secrets table', () => {
    const statements = sql()
      .replace(/--.*$/gm, '')
      .split(';')
      .map((st) => st.trim().toLowerCase())
    const touching = statements.filter((st) => st.includes('prize_card_secrets'))
    expect(touching.some((st) => st.startsWith('grant'))).toBe(false)
    expect(touching.some((st) => st.includes('publication'))).toBe(false)
    expect(touching.some((st) => st.startsWith('create policy'))).toBe(false)
  })

  it('has one tier per valör, in rising order', () => {
    expect(PRIZE_CARD_TIERS.map((t) => t.tier)).toEqual([1, 2, 3])
    const amounts = PRIZE_CARD_TIERS.map((t) => t.amount)
    expect(amounts).toEqual([...amounts].sort((a, b) => a - b))
  })
})

describe('coupon tiers', () => {
  it('stay inside what the server will mint', () => {
    for (const { tier, amount } of COUPON_TIERS) {
      expect(tier).toBeGreaterThanOrEqual(1)
      expect(tier).toBeLessThanOrEqual(3)
      expect(amount).toBeGreaterThan(0)
      expect(amount).toBeLessThanOrEqual(COUPON_MAX_AMOUNT)
    }
  })

  it('has one tier per valör, in rising order', () => {
    expect(COUPON_TIERS.map((t) => t.tier)).toEqual([1, 2, 3])
    const amounts = COUPON_TIERS.map((t) => t.amount)
    expect(amounts).toEqual([...amounts].sort((a, b) => a - b))
  })

  /**
   * The one place RM is created outside the welcome bonus and the Snabblån, and deliberately the
   * only one that moves you up a leaderboard. Butik spending and repayments are both neutral.
   */
  it('lifts netWorth, unlike a purchase or a repayment', () => {
    const before = { balance: WELCOME_BONUS, debt: 0, spent: 0 }
    const after = { ...before, balance: before.balance + COUPON_TIERS[2].amount }
    expect(netWorth(after)).toBe(netWorth(before) + COUPON_TIERS[2].amount)
    expect(nightNet(after)).toBe(COUPON_TIERS[2].amount)
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
