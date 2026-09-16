// Pure shop maths for the Butik tab: what is on the shelves, what you can afford, and what the
// balance looks like after. Mirrors repay.ts. Named for the action, since buy.ts and Butik.tsx
// have to coexist on a case-insensitive filesystem.
import type { PurchaseRow, ShopItemRow } from '../lib/types'

export type BuyCheck = 'ok' | 'inactive' | 'sold_out' | 'too_poor'

/** Why the Köp button is dead, in the order the guest should hear about it. */
export function checkBuy(player: { balance: number }, item: ShopItemRow): BuyCheck {
  if (!item.active) return 'inactive'
  if (item.stock !== null && item.stock < 1) return 'sold_out'
  if (player.balance < item.price) return 'too_poor'
  return 'ok'
}

/** null when the shelf is not counted at all; otherwise how many are left. */
export function stockLeft(item: ShopItemRow): number | null {
  return item.stock === null ? null : Math.max(0, item.stock)
}

export interface Shelves {
  physical: ShopItemRow[]
  digital: ShopItemRow[]
}

/**
 * The catalogue split in two, in the order the GM put it in. Sold out sinks to the bottom of its
 * shelf so the things you can actually have stay at the top; inactive items are dropped entirely
 * (the GM turns an item off to take it out of the shop, not to grey it out for the room).
 */
export function shelves(items: readonly ShopItemRow[]): Shelves {
  const live = items.filter((i) => i.active)
  const ordered = live.slice().sort((a, b) => {
    const soldOut = Number(checkBuy({ balance: Infinity }, a) === 'sold_out') - Number(checkBuy({ balance: Infinity }, b) === 'sold_out')
    return soldOut || a.sort - b.sort || a.price - b.price || a.name.localeCompare(b.name, 'sv')
  })
  return {
    physical: ordered.filter((i) => i.kind === 'physical'),
    digital: ordered.filter((i) => i.kind === 'digital'),
  }
}

/**
 * What the player's three numbers become after a purchase. The price moves from balance to spent,
 * which is exactly why netWorth (which adds spent back) does not move: see the invariant in
 * buy.test.ts.
 */
export function afterBuy(
  player: { balance: number; debt: number; spent: number },
  price: number,
): { balance: number; debt: number; spent: number } {
  return { balance: player.balance - price, debt: player.debt, spent: player.spent + price }
}

/** Total on the receipts, for the "Spenderat i kväll" line. */
export function purchaseTotal(purchases: readonly PurchaseRow[]): number {
  return purchases.reduce((sum, p) => sum + p.price, 0)
}
