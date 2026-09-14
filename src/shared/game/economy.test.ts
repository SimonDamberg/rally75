import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LOAN_AMOUNT, LOAN_DEBT, MAX_NAME_LENGTH, MIN_STAKE, WELCOME_BONUS } from './economy'

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
