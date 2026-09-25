// Pure shop maths for the Butik tab: what is on the shelves, what you can afford, and what the
// balance looks like after. Mirrors repay.ts. Named for the action, since buy.ts and Butik.tsx
// have to coexist on a case-insensitive filesystem.
import type { BoxPrizeRow, PurchaseRow, ShopItemRow } from '../lib/types'
import { boxLeft } from '../shared/game/box'
import { BUTIK, MARKER } from '../shared/content/client'
import { MARKER_MAX_QTY } from '../shared/game/economy'

export type BuyCheck = 'ok' | 'inactive' | 'sold_out' | 'too_poor'

/**
 * Why the Köp button is dead, in the order the guest should hear about it. A box counts its
 * stock in the prizes, so pass them for a box.
 */
export function checkBuy(
  player: { balance: number },
  item: ShopItemRow,
  prizes: readonly BoxPrizeRow[] = [],
): BuyCheck {
  if (!item.active) return 'inactive'
  const left = stockLeft(item, prizes)
  if (left !== null && left < 1) return 'sold_out'
  if (player.balance < item.price) return 'too_poor'
  return 'ok'
}

/**
 * null when the shelf is not counted at all; otherwise how many are left. A box is never
 * uncounted: it holds exactly the prizes that are left in it.
 */
export function stockLeft(item: ShopItemRow, prizes: readonly BoxPrizeRow[] = []): number | null {
  if (item.kind === 'box') return boxLeft(prizes)
  return item.stock === null ? null : Math.max(0, item.stock)
}

export interface Shelves {
  /** The Mystery Box, shown on top; null when the GM has none active. */
  box: ShopItemRow | null
  /** The marker for the physical games, sold by the handful; null when the GM has none active. */
  marker: ShopItemRow | null
  items: ShopItemRow[]
}

/**
 * The box on top, everything else below in the order the GM put it in. Sold out sinks to the
 * bottom so the things you can actually have stay at the top; inactive items are dropped entirely
 * (the GM turns an item off to take it out of the shop, not to grey it out for the room).
 */
export function shelves(items: readonly ShopItemRow[]): Shelves {
  const live = items.filter((i) => i.active)
  const ordered = live.slice().sort((a, b) => {
    const soldOut = Number(checkBuy({ balance: Infinity }, a) === 'sold_out') - Number(checkBuy({ balance: Infinity }, b) === 'sold_out')
    return soldOut || a.sort - b.sort || a.price - b.price || a.name.localeCompare(b.name, 'sv')
  })
  return {
    box: ordered.find((i) => i.kind === 'box') ?? null,
    marker: ordered.find((i) => i.kind === 'marker') ?? null,
    items: ordered.filter((i) => i.kind !== 'box' && i.kind !== 'marker'),
  }
}

/**
 * The receipts the guest may see: an opening whose reel is still spinning stays off the list,
 * or "Mina köp" would read the prize out before the reel lands on it.
 */
export function visiblePurchases(purchases: readonly PurchaseRow[], spinning: string | null): PurchaseRow[] {
  return spinning ? purchases.filter((p) => p.id !== spinning) : purchases.slice()
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

/** Total on the receipts, for the "Spenderat idag" line. */
export function purchaseTotal(purchases: readonly PurchaseRow[]): number {
  return purchases.reduce((sum, p) => sum + p.price, 0)
}

export type MarkerCheck = 'ok' | 'bad_qty' | 'too_poor'

/** Whether `qty` marker at `price` each can be bought, mirroring buy_markers. */
export function checkMarkers(player: { balance: number }, price: number, qty: number): MarkerCheck {
  if (!Number.isInteger(qty) || qty < 1 || qty > MARKER_MAX_QTY) return 'bad_qty'
  if (player.balance < price * qty) return 'too_poor'
  return 'ok'
}

/** The most marker the balance covers, capped at MARKER_MAX_QTY (0 when not even one). */
export function maxMarkers(player: { balance: number }, price: number): number {
  if (price <= 0) return MARKER_MAX_QTY
  return Math.max(0, Math.min(MARKER_MAX_QTY, Math.floor(player.balance / price)))
}

/** Marker bought but not yet handed over by Mr Green: what claim_markers would count out. */
export function unclaimedMarkers(purchases: readonly PurchaseRow[]): number {
  return purchases.reduce((sum, p) => (p.kind === 'marker' && p.claimed_at === null ? sum + p.qty : sum), 0)
}

/** Kinds that are claimed with claim_purchase, one receipt at a time. Marker use claim_markers. */
export type Claimable = 'physical' | 'box'

/**
 * Receipts of `kind` still waiting for Hämta, oldest first: the beer bought first is poured first.
 * Pass `spinning` so a box prize stays hidden until its reel has landed.
 */
export function toCollect(purchases: readonly PurchaseRow[], kind: Claimable, spinning: string | null = null): PurchaseRow[] {
  return visiblePurchases(purchases, spinning)
    .filter((p) => p.kind === kind && p.claimed_at === null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/** Whether a receipt has something to hand over at all (digital ones do not). */
export function needsPickup(p: PurchaseRow): boolean {
  return p.kind === 'physical' || p.kind === 'box' || p.kind === 'marker'
}

/** The line a receipt reads as, on the phone and in the GM feed. */
export function receiptName(p: PurchaseRow): string {
  if (p.prize_name) return BUTIK.boxReceipt(p.prize_name)
  if (p.kind === 'marker') return MARKER.receipt(p.qty)
  return p.item_name
}

/** The picture for a receipt: the prize's for a box opening, the item's otherwise ('' for none). */
export function receiptImage(
  p: PurchaseRow,
  items: readonly ShopItemRow[] | undefined,
  prizes: readonly BoxPrizeRow[] | undefined,
): string {
  if (p.prize_id) return prizes?.find((b) => b.id === p.prize_id)?.image ?? ''
  return items?.find((i) => i.id === p.item_id)?.image ?? ''
}
