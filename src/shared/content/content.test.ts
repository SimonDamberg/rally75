import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createRng } from '../game/rng'
import { KUSK_NOTER, STORY_MALLAR } from './stories'
import { COMMENTARY, disqualifiedLine, GAG_LINES, GAG_WIN, inquiryText } from './commentary'
import { LANDING, STODLINJE } from './parody'
import { WELCOME_BONUS } from '../game/economy'
import { fmtRm } from '../game/format'

const EM_DASH = '\u2014'
const SRC = join(import.meta.dirname, '..', '..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

describe('Stödlinje', () => {
  it('has a dialable Swedish number that matches the displayed one', () => {
    expect(STODLINJE.number).toMatch(/^\+46\d{9}$/)
    expect(STODLINJE.display.replace(/\D/g, '')).toBe(STODLINJE.number.replace('+46', '0'))
  })
})

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
      ...[...COMMENTARY.early, ...COMMENTARY.halfway, ...COMMENTARY.stretch].map((l) => l(runner, runner)),
      ...COMMENTARY.favouriteLast.map((l) => l(runner)),
      ...[...Object.values(COMMENTARY.mid), ...Object.values(COMMENTARY.turn)].flat().map((l) => l(runner, runner)),
      COMMENTARY.final(runner, runner, true),
      COMMENTARY.final(runner, runner, false),
      COMMENTARY.skrall(runner, 1),
      ...Object.values(GAG_LINES).flat().map((l) => l(runner)),
      ...Object.values(GAG_WIN).map((l) => l!(runner)),
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

describe('landing page copy', () => {
  const strings = (v: unknown): string[] =>
    typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []

  it('fills every section', () => {
    expect(LANDING.products.map((p) => p.id)).toEqual(['rally', 'plinko', 'butik'])
    expect(LANDING.steps.items.length).toBeGreaterThan(0)
    expect(LANDING.reviews.items.length).toBeGreaterThan(0)
    expect(LANDING.badges.length).toBeGreaterThan(0)
    expect(LANDING.faq.items.length).toBeGreaterThan(0)
  })

  it('talks RallyMynt, never kronor', () => {
    for (const s of strings(LANDING)) expect(s).not.toMatch(/\b(kr|kronor)\b/i)
  })

  it('states the real welcome bonus', () => {
    expect(LANDING.steps.items.map(([t]) => t)).toContain(`Få ${fmtRm(WELCOME_BONUS)}`)
  })
})
