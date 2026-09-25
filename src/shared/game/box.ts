// The Mystery Box: rarity tiers, the odds the guest is shown, and the reel the phone spins.
//
// The draw itself happens in open_box (supabase/migrations/*_mystery_box.sql), which picks a tier
// by BOX_TIER_WEIGHTS over the tiers that still have stock, then a prize inside the tier weighted
// by how many are left. box.test.ts checks that the SQL carries the same table. Everything here is
// display: the phone already knows the prize before the reel starts.
import type { Rng } from './rng'

export const BOX_RARITIES = ['bla', 'lila', 'rosa', 'rod', 'guld'] as const
export type BoxRarity = (typeof BOX_RARITIES)[number]

/**
 * Tuned for a party with a couple of dozen prizes, not for CS (where gold is 0.26 %): with the
 * real table nobody in the room would ever see the gold.
 */
export const BOX_TIER_WEIGHTS: Readonly<Record<BoxRarity, number>> = { bla: 60, lila: 25, rosa: 10, rod: 4, guld: 1 }

export interface BoxPrizeLike {
  rarity: BoxRarity
  stock: number
  active: boolean
}

const live = <T extends BoxPrizeLike>(prizes: readonly T[]) => prizes.filter((p) => p.active && p.stock > 0)

/** How many openings are left in the box. 0 means sold out. */
export function boxLeft(prizes: readonly BoxPrizeLike[]): number {
  return live(prizes).reduce((sum, p) => sum + p.stock, 0)
}

/** The chance of each tier right now: the weights renormalised over the tiers with stock. */
export function tierChances(prizes: readonly BoxPrizeLike[]): Record<BoxRarity, number> {
  const stocked = new Set(live(prizes).map((p) => p.rarity))
  const total = BOX_RARITIES.reduce((sum, r) => sum + (stocked.has(r) ? BOX_TIER_WEIGHTS[r] : 0), 0)
  const out = {} as Record<BoxRarity, number>
  for (const r of BOX_RARITIES) out[r] = total && stocked.has(r) ? BOX_TIER_WEIGHTS[r] / total : 0
  return out
}

/** The chance that the next opening lands on this prize. */
export function prizeChance(prize: BoxPrizeLike, prizes: readonly BoxPrizeLike[]): number {
  if (!prize.active || prize.stock < 1) return 0
  const inTier = live(prizes)
    .filter((p) => p.rarity === prize.rarity)
    .reduce((sum, p) => sum + p.stock, 0)
  return tierChances(prizes)[prize.rarity] * (prize.stock / inTier)
}

/**
 * How long the reel spins on the phone. The display iPad holds its toast back this long (plus a
 * beat), so the room never hears the prize before its winner sees it.
 */
export const BOX_SPIN_MS = 6500

/** Cards on the reel, and where the winner sits. Enough cards that the strip never runs out. */
export const REEL_LENGTH = 60
export const REEL_STOP = 50

export interface Reel<T> {
  cards: T[]
  /** Index of the winner in cards. */
  stop: number
  /** Where inside the winning card the marker lands, as a fraction of the card width. */
  offset: number
}

/**
 * The strip the phone spins. Filler is drawn from every active prize (sold out too, as CS shows
 * the whole case) by the same tier weights, so the reel looks like the odds. The card just past
 * the winner is often the rarest thing in the box: the near miss is the whole genre.
 */
export function buildReel<T extends BoxPrizeLike>(prizes: readonly T[], winner: T, rng: Rng): Reel<T> {
  const pool = prizes.filter((p) => p.active)
  const tiers = BOX_RARITIES.filter((r) => pool.some((p) => p.rarity === r))
  const total = tiers.reduce((sum, r) => sum + BOX_TIER_WEIGHTS[r], 0)

  const draw = (): T => {
    if (!tiers.length) return winner
    let roll = rng.next() * total
    let tier = tiers[tiers.length - 1]
    for (const r of tiers) {
      if (roll < BOX_TIER_WEIGHTS[r]) {
        tier = r
        break
      }
      roll -= BOX_TIER_WEIGHTS[r]
    }
    return rng.pick(pool.filter((p) => p.rarity === tier))
  }

  const cards = Array.from({ length: REEL_LENGTH }, draw)
  cards[REEL_STOP] = winner

  const rarest = tiers[tiers.length - 1]
  if (rarest && rarest !== winner.rarity && rng.next() < 0.5) {
    cards[REEL_STOP + 1] = rng.pick(pool.filter((p) => p.rarity === rarest))
  }

  return { cards, stop: REEL_STOP, offset: rng.float(0.12, 0.88) }
}
