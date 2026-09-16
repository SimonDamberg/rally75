import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ALL_KUSKAR } from './kuskar'

const MIGRATIONS = join(import.meta.dirname, '..', '..', '..', 'supabase', 'migrations')
const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`

describe('kusk seed migration', () => {
  // Migrations are append-only, so the roster lives in the newest seed file; earlier ones are
  // history. Filenames are date-prefixed, so sorting puts the current one last.
  it('contains every kusk name, title and note', () => {
    const file = readdirSync(MIGRATIONS)
      .filter((f) => f.includes('_kusk_seed'))
      .sort()
      .pop()
    expect(file).toBeDefined()
    const sql = readFileSync(join(MIGRATIONS, file!), 'utf8')
    for (const k of ALL_KUSKAR) {
      expect(sql, k.name).toContain(`(${sqlString(k.name)}, ${sqlString(k.title)}, array[`)
      for (const note of k.notes) expect(sql, note).toContain(sqlString(note))
    }
    expect(sql.match(/^ {2}\(/gm)).toHaveLength(ALL_KUSKAR.length)
  })

  it('seeds each kusk with its kind', () => {
    const file = readdirSync(MIGRATIONS)
      .filter((f) => f.includes('_kusk_seed'))
      .sort()
      .pop()
    const sql = readFileSync(join(MIGRATIONS, file!), 'utf8')
    for (const k of ALL_KUSKAR) {
      const row = sql.slice(sql.indexOf(`(${sqlString(k.name)}, `))
      expect(row.slice(0, row.indexOf('),')), k.name).toContain(`], ${sqlString(k.kind ?? 'friend')}`)
    }
  })
})
