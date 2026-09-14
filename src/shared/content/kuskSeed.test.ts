import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NAMED_KUSKAR } from './kuskar'

const MIGRATIONS = join(import.meta.dirname, '..', '..', '..', 'supabase', 'migrations')
const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`

describe('kusk seed migration', () => {
  it('contains every NAMED_KUSKAR name, title and note', () => {
    const file = readdirSync(MIGRATIONS).find((f) => f.endsWith('_kusk_seed.sql'))
    expect(file).toBeDefined()
    const sql = readFileSync(join(MIGRATIONS, file!), 'utf8')
    for (const k of NAMED_KUSKAR) {
      expect(sql).toContain(`(${sqlString(k.name)}, ${sqlString(k.title)}, array[`)
      for (const note of k.notes) expect(sql).toContain(sqlString(note))
    }
    expect(sql.match(/^ {2}\(/gm)).toHaveLength(NAMED_KUSKAR.length)
  })
})
