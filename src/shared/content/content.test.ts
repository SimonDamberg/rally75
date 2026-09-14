import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createRng } from '../game/rng'
import { KUSK_NOTER, STORY_MALLAR } from './stories'
import { COMMENTARY, disqualifiedLine, inquiryText } from './commentary'

const EM_DASH = '\u2014'
const SRC = join(import.meta.dirname, '..', '..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

describe('no em dash', () => {
  it('appears in any file under src/', () => {
    const offenders = walk(SRC).filter((f) => readFileSync(f, 'utf8').includes(EM_DASH))
    expect(offenders).toEqual([])
  })

  it('appears in rendered templates', () => {
    const r = createRng(11)
    const runner = { name: 'Bålsta Blixten', jockey: 'Kenneth Sjöberg' }
    const lines: string[] = [
      ...STORY_MALLAR.flatMap((t) => Array.from({ length: 20 }, () => t(runner.name, runner.jockey, r))),
      ...KUSK_NOTER.flatMap((t) => Array.from({ length: 20 }, () => t(runner.jockey, r))),
      COMMENTARY.start(1),
      COMMENTARY.galopp(runner),
      ...Object.values(COMMENTARY.milestones).map((m) => m([runner, runner, runner])),
      ...COMMENTARY.leadChange.map((l) => l(runner, runner)),
      COMMENTARY.photo,
      COMMENTARY.win(runner, 1),
      inquiryText(runner, r),
      disqualifiedLine(runner),
    ]
    for (const line of lines) {
      expect(line).not.toContain(EM_DASH)
      expect(line).not.toContain('undefined')
      expect(line).not.toContain('NaN')
    }
  })
})
