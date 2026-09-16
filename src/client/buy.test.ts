import { describe, expect, it } from 'vitest'
import type { PurchaseRow, ShopItemRow } from '../lib/types'
import { netWorth, nightNet } from '../shared/game/economy'
import { afterBuy, checkBuy, purchaseTotal, shelves, stockLeft } from './buy'

function item(over: Partial<ShopItemRow> = {}): ShopItemRow {
  return {
    id: over.name ?? 'i1',
    name: 'En kall öl',
    blurb: '',
    price: 500,
    stock: null,
    kind: 'physical',
    effect: 'none',
    effect_value: '',
    sort: 10,
    active: true,
    created_at: '2026-09-16T18:00:00Z',
    ...over,
  }
}

const rich = { balance: 5000 }

describe('checkBuy', () => {
  it('passes when the shelf and the wallet both allow it', () => {
    expect(checkBuy(rich, item())).toBe('ok')
    expect(checkBuy({ balance: 500 }, item({ price: 500 }))).toBe('ok')
  })

  it('reports the reason in priority order', () => {
    expect(checkBuy({ balance: 0 }, item({ active: false, stock: 0 }))).toBe('inactive')
    expect(checkBuy({ balance: 0 }, item({ stock: 0 }))).toBe('sold_out')
    expect(checkBuy({ balance: 499 }, item({ price: 500 }))).toBe('too_poor')
  })

  it('never runs out when the stock is not counted', () => {
    expect(checkBuy(rich, item({ stock: null }))).toBe('ok')
    expect(checkBuy(rich, item({ stock: 1 }))).toBe('ok')
  })

  it('lets a free item through on an empty balance', () => {
    expect(checkBuy({ balance: 0 }, item({ price: 0 }))).toBe('ok')
  })
})

describe('stockLeft', () => {
  it('is null for an unlimited item and never negative', () => {
    expect(stockLeft(item({ stock: null }))).toBe(null)
    expect(stockLeft(item({ stock: 3 }))).toBe(3)
    expect(stockLeft(item({ stock: 0 }))).toBe(0)
  })
})

describe('shelves', () => {
  it('splits on kind and drops inactive items', () => {
    const { physical, digital } = shelves([
      item({ id: 'a', name: 'Öl', kind: 'physical' }),
      item({ id: 'b', name: 'NFT', kind: 'digital' }),
      item({ id: 'c', name: 'Gömd', kind: 'physical', active: false }),
    ])
    expect(physical.map((i) => i.name)).toEqual(['Öl'])
    expect(digital.map((i) => i.name)).toEqual(['NFT'])
  })

  it('keeps the GM order and sinks sold out to the bottom', () => {
    const { physical } = shelves([
      item({ id: 'a', name: 'Först', sort: 10, stock: 0 }),
      item({ id: 'b', name: 'Sedan', sort: 20 }),
      item({ id: 'c', name: 'Sist', sort: 30 }),
    ])
    expect(physical.map((i) => i.name)).toEqual(['Sedan', 'Sist', 'Först'])
  })

  it('breaks ties by price and then by name', () => {
    const { digital } = shelves([
      item({ id: 'a', name: 'Beta', kind: 'digital', sort: 0, price: 100 }),
      item({ id: 'b', name: 'Alfa', kind: 'digital', sort: 0, price: 100 }),
      item({ id: 'c', name: 'Billig', kind: 'digital', sort: 0, price: 50 }),
    ])
    expect(digital.map((i) => i.name)).toEqual(['Billig', 'Alfa', 'Beta'])
  })
})

describe('afterBuy', () => {
  it('moves the price from the balance to spent', () => {
    expect(afterBuy({ balance: 2000, debt: 0, spent: 0 }, 500)).toEqual({ balance: 1500, debt: 0, spent: 500 })
  })

  it('leaves the debt alone', () => {
    expect(afterBuy({ balance: 2000, debt: 1337, spent: 0 }, 500).debt).toBe(1337)
  })

  // The whole point of the Butik: winners can flex or drink, and drinking is free of charge on
  // both existing leaderboards. Only the slösare list notices.
  it('leaves Toppen and förlorarlistan exactly where they were', () => {
    const before = { balance: 4200, debt: 1337, spent: 0 }
    const after = afterBuy(before, 2500)
    expect(netWorth(after)).toBe(netWorth(before))
    expect(nightNet(after)).toBe(nightNet(before))
  })

  it('stays rank neutral over a whole night of buying', () => {
    const start = { balance: 9000, debt: 0, spent: 0 }
    let player = start
    for (const price of [500, 500, 750, 2000, 100]) player = afterBuy(player, price)
    expect(player.balance).toBe(9000 - 3850)
    expect(player.spent).toBe(3850)
    expect(netWorth(player)).toBe(netWorth(start))
  })
})

describe('purchaseTotal', () => {
  const receipt = (price: number, id: string): PurchaseRow => ({
    id,
    player_id: 'p1',
    item_id: 'i1',
    item_name: 'En kall öl',
    kind: 'physical',
    price,
    created_at: '2026-09-16T18:00:00Z',
  })

  it('sums the receipts', () => {
    expect(purchaseTotal([])).toBe(0)
    expect(purchaseTotal([receipt(500, 'a'), receipt(750, 'b')])).toBe(1250)
  })
})
