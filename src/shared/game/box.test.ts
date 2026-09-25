import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BOX_RARITIES,
  BOX_TIER_WEIGHTS,
  boxLeft,
  buildReel,
  prizeChance,
  REEL_LENGTH,
  REEL_STOP,
  tierChances,
  type BoxPrizeLike,
  type BoxRarity,
} from './box'
import { createRng } from './rng'

const MIGRATIONS = join(import.meta.dirname, '..', '..', '..', 'supabase', 'migrations')

interface Prize extends BoxPrizeLike {
  id: string
}

const prize = (id: string, rarity: BoxRarity, stock: number, active = true): Prize => ({ id, rarity, stock, active })

const BOX: Prize[] = [
  prize('a', 'bla', 10),
  prize('b', 'bla', 6),
  prize('c', 'lila', 4),
  prize('d', 'rosa', 2),
  prize('e', 'rod', 1),
  prize('f', 'guld', 1),
]

describe('the SQL mirror', () => {
  it('open_box carries the same rarities and weights', () => {
    const file = readdirSync(MIGRATIONS).find((f) => f.endsWith('_mystery_box.sql'))
    expect(file).toBeDefined()
    const sql = readFileSync(join(MIGRATIONS, file!), 'utf8')
    const rarities = `array[${BOX_RARITIES.map((r) => `'${r}'`).join(', ')}]`
    const weights = `array[${BOX_RARITIES.map((r) => BOX_TIER_WEIGHTS[r]).join(', ')}]`
    expect(sql).toContain(`v_rarities constant text[] := ${rarities}`)
    expect(sql).toContain(`v_weights constant int[] := ${weights}`)
    expect(sql).toContain(`check (rarity in (${BOX_RARITIES.map((r) => `'${r}'`).join(', ')}))`)
  })
})

describe('odds', () => {
  it('counts what is left, ignoring inactive prizes', () => {
    expect(boxLeft(BOX)).toBe(24)
    expect(boxLeft([...BOX, prize('x', 'guld', 5, false)])).toBe(24)
    expect(boxLeft([prize('a', 'bla', 0)])).toBe(0)
  })

  it('uses the plain weights when every tier has stock', () => {
    const chances = tierChances(BOX)
    expect(chances.bla).toBeCloseTo(0.6)
    expect(chances.guld).toBeCloseTo(0.01)
  })

  it('renormalises over the tiers that are left', () => {
    const chances = tierChances([prize('c', 'lila', 1), prize('f', 'guld', 1), prize('a', 'bla', 0)])
    expect(chances.bla).toBe(0)
    expect(chances.lila).toBeCloseTo(25 / 26)
    expect(chances.guld).toBeCloseTo(1 / 26)
  })

  it('an empty box has no odds at all', () => {
    expect(Object.values(tierChances([]))).toEqual([0, 0, 0, 0, 0])
  })

  it('splits a tier by stock, and the prize chances sum to one', () => {
    expect(prizeChance(BOX[0], BOX)).toBeCloseTo(0.6 * (10 / 16))
    expect(prizeChance(prize('z', 'bla', 0), BOX)).toBe(0)
    expect(BOX.reduce((sum, p) => sum + prizeChance(p, BOX), 0)).toBeCloseTo(1, 12)
  })
})

describe('buildReel', () => {
  it('always puts the winner at the stop, whatever the seed', () => {
    for (let seed = 0; seed < 300; seed++) {
      const winner = BOX[seed % BOX.length]
      const reel = buildReel(BOX, winner, createRng(seed))
      expect(reel.cards).toHaveLength(REEL_LENGTH)
      expect(reel.stop).toBe(REEL_STOP)
      expect(reel.cards[reel.stop]).toBe(winner)
      expect(reel.offset).toBeGreaterThan(0)
      expect(reel.offset).toBeLessThan(1)
    }
  })

  it('is deterministic per seed', () => {
    const a = buildReel(BOX, BOX[2], createRng(42))
    const b = buildReel(BOX, BOX[2], createRng(42))
    expect(a.cards.map((c) => c.id)).toEqual(b.cards.map((c) => c.id))
    expect(a.offset).toBe(b.offset)
  })

  it('fills from active prizes, and looks like the odds', () => {
    const counts: Record<string, number> = {}
    for (let seed = 0; seed < 200; seed++) {
      for (const card of buildReel([...BOX, prize('off', 'guld', 3, false)], BOX[0], createRng(seed)).cards) {
        counts[card.rarity] = (counts[card.rarity] ?? 0) + 1
        expect(card.id).not.toBe('off')
      }
    }
    expect(counts.bla).toBeGreaterThan(counts.lila)
    expect(counts.lila).toBeGreaterThan(counts.rosa)
    expect(counts.rosa).toBeGreaterThan(counts.guld)
  })

  it('copes with a box holding only the winner', () => {
    const only = prize('solo', 'rosa', 1)
    const reel = buildReel([only], only, createRng(1))
    expect(reel.cards.every((c) => c === only)).toBe(true)
  })
})
