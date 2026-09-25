// "Butik": the black market. Three things on sale: the Mystery Box on top, then Öl and Cider from
// the bar. Simon hands every one of them over in the kitchen. Buying moves RM from balance to
// spent, and netWorth adds spent back, so nothing bought here can cost you a place on the
// Topplista (see buy.test.ts). The small print says so out loud.
//
// The box is opened, not bought: open_box draws the prize on the server, and CaseOpening spins a
// reel onto it. Until the reel lands the receipt stays off "Mina köp", or the list would spoil it.
import { useEffect, useState } from 'react'
import { usePlayerPurchases } from '../lib/hooks'
import type { BoxPrizeRow, PurchaseRow, ShopItemRow } from '../lib/types'
import { BUTIK } from '../shared/content/client'
import { UI_LABELS } from '../shared/content/ui'
import { BOX_RARITIES, boxLeft, buildReel, prizeChance, type Reel } from '../shared/game/box'
import { fmtPct, fmtRm } from '../shared/game/format'
import { createRng, randomSeed } from '../shared/game/rng'
import { Button, cx, Modal, RARITY_COLOR, RarityChip, ShopImage, SmallPrint, toast } from '../ui'
import { afterBuy, checkBuy, purchaseTotal, shelves, stockLeft, visiblePurchases, type BuyCheck } from './buy'
import { CaseOpening } from './CaseOpening'
import { useGuest, useGuestAction } from './guest'

interface Opening {
  purchase: PurchaseRow
  winner: BoxPrizeRow
  reel: Reel<BoxPrizeRow>
}

export function Butik({ onConfirmChange }: { onConfirmChange: (open: boolean) => void }) {
  const { identity, player, shopItems, boxPrizes } = useGuest()
  const { data: purchases } = usePlayerPurchases(identity.playerId)
  const { run, busy } = useGuestAction()
  const [picked, setPicked] = useState<ShopItemRow | null>(null)
  const [receipt, setReceipt] = useState<{ purchase: PurchaseRow; item: ShopItemRow } | null>(null)
  const [opening, setOpening] = useState<Opening | null>(null)
  const [landed, setLanded] = useState(false)

  // Offers and the Snabblån stay away while a confirm or a reel is on screen.
  useEffect(() => {
    onConfirmChange(!!picked || !!opening)
    return () => onConfirmChange(false)
  }, [picked, opening, onConfirmChange])

  if (!player) return <p className="p-6 text-center text-ink-dim">{UI_LABELS.loading}</p>

  const prizes = boxPrizes ?? []
  const { box, items } = shelves(shopItems ?? [])

  const buy = async () => {
    if (!picked) return
    if (picked.kind === 'box') return void openBox(picked)
    const purchase = await run((api, id) => api.buyItem(id, picked.id))
    if (!purchase) return
    setPicked(null)
    setReceipt({ purchase, item: picked })
    toast({ text: BUTIK.boughtToast(picked.name), tone: 'win' })
  }

  const openBox = async (item: ShopItemRow) => {
    const purchase = await run((api, id) => api.openBox(id, item.id))
    if (!purchase) return
    // The prize row may already have left the list (its last one, deleted by the GM): the receipt's
    // snapshot is enough to draw it.
    const winner = prizes.find((p) => p.id === purchase.prize_id) ?? snapshotPrize(purchase)
    const pool = prizes.some((p) => p.id === winner.id) ? prizes : [...prizes, winner]
    setPicked(null)
    setLanded(false)
    setOpening({ purchase, winner, reel: buildReel(pool, winner, createRng(randomSeed())) })
  }

  const landedOn = () => {
    setLanded(true)
    if (opening) toast({ text: BUTIK.boxToast(opening.winner.name), tone: 'win' })
  }

  const againCheck = box ? checkBuy(player, box, prizes) : 'inactive'
  const spinning = opening && !landed ? opening.purchase.id : null

  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      <header className="flex flex-col gap-1 px-1">
        <h1 className="font-display text-4xl leading-none font-black text-plate uppercase">{BUTIK.title}</h1>
        <p className="text-sm text-ink-dim">{BUTIK.subtitle}</p>
        <p className="font-display text-xl font-black text-cash tabular-nums">{BUTIK.spendable(fmtRm(player.balance))}</p>
      </header>

      {shopItems && !box && items.length === 0 && <p className="p-6 text-center text-ink-dim">{BUTIK.empty}</p>}
      {!shopItems && <p className="p-6 text-center text-ink-dim">{UI_LABELS.loading}</p>}

      {box && <BoxCard box={box} prizes={prizes} check={checkBuy(player, box, prizes)} onOpen={() => setPicked(box)} />}
      <Bar items={items} balance={player.balance} onBuy={setPicked} />

      <Mine purchases={purchases && visiblePurchases(purchases, spinning)} />

      <p className="px-1 text-xs text-ink-dim">{BUTIK.smallPrint}</p>
      <SmallPrint className="mt-auto" />

      <Modal
        open={!!picked}
        onClose={() => setPicked(null)}
        dismissible={!busy}
        tone="sleaze"
        title={picked ? (picked.kind === 'box' ? BUTIK.boxConfirmTitle : BUTIK.confirmTitle(picked.name)) : ''}
        actions={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setPicked(null)}>
              {BUTIK.cancel}
            </Button>
            <Button variant="sleaze" loading={busy} onClick={() => void buy()}>
              {picked ? (picked.kind === 'box' ? BUTIK.boxConfirmOk : BUTIK.confirmBuy)(fmtRm(picked.price)) : ''}
            </Button>
          </>
        }
      >
        {picked && (
          <div className="flex flex-col gap-2">
            {picked.blurb && <p className="text-lg">{picked.blurb}</p>}
            <p className="text-ink-dim">
              {(picked.kind === 'box' ? BUTIK.boxConfirmText : BUTIK.confirmText)(fmtRm(picked.price))}
            </p>
            <p className="font-display text-xl font-black tabular-nums">
              {BUTIK.confirmAfter(fmtRm(afterBuy(player, picked.price).balance))}
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title={BUTIK.boughtTitle}
        actions={<Button onClick={() => setReceipt(null)}>{BUTIK.close}</Button>}
      >
        {receipt && (
          <div className="flex flex-col gap-3">
            <p className="font-display text-4xl leading-none font-black text-plate uppercase">{receipt.item.name}</p>
            <p className="font-display text-2xl font-black text-cash tabular-nums">{fmtRm(receipt.purchase.price)}</p>
            <p className="text-lg text-ink-dim">
              {receipt.item.kind === 'digital' ? BUTIK.boughtDigital : BUTIK.boughtPhysical}
            </p>
            {receipt.item.effect !== 'none' && (
              <p className="text-lg text-plate">{BUTIK.boughtEffect(receipt.item.effect_value)}</p>
            )}
          </div>
        )}
      </Modal>

      {opening && (
        <CaseOpening
          key={opening.purchase.id}
          reel={opening.reel}
          winner={opening.winner}
          landed={landed}
          onLanded={landedOn}
          onClose={() => setOpening(null)}
          again={
            box && againCheck === 'ok'
              ? { label: BUTIK.boxAgain(fmtRm(box.price)), busy, onClick: () => void openBox(box) }
              : undefined
          }
        />
      )}
    </div>
  )
}

function snapshotPrize(purchase: PurchaseRow): BoxPrizeRow {
  return {
    id: purchase.prize_id ?? purchase.id,
    name: purchase.prize_name ?? purchase.item_name,
    blurb: '',
    image: '',
    rarity: purchase.prize_rarity ?? 'bla',
    stock: 0,
    sort: 0,
    active: true,
    created_at: purchase.created_at,
  }
}

function BoxCard({
  box,
  prizes,
  check,
  onOpen,
}: {
  box: ShopItemRow
  prizes: readonly BoxPrizeRow[]
  check: BuyCheck
  onOpen: () => void
}) {
  const left = boxLeft(prizes)
  // Rarest first: the case page sells the knife, not the stickers.
  const contents = prizes
    .filter((p) => p.active)
    .sort((a, b) => BOX_RARITIES.indexOf(b.rarity) - BOX_RARITIES.indexOf(a.rarity) || a.sort - b.sort)

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-tote/40 p-4 shadow-[0_0_2rem] shadow-sleaze/25 ring-2 ring-sleaze/70 ring-inset">
      <p className="text-xs font-black tracking-wide text-sleaze uppercase">{BUTIK.boxKicker}</p>
      <div className="flex items-center gap-4">
        <ShopImage image={box.image} name={box.name} rarity="guld" className="size-28 shrink-0 rounded-xl text-5xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-display text-3xl leading-none font-black uppercase">{box.name}</h2>
          {box.blurb && <p className="text-sm text-ink-dim">{box.blurb}</p>}
          <span
            className={cx(
              'mt-0.5 w-fit rounded-full px-2 py-0.5 text-[0.65rem] font-black tracking-wide uppercase',
              left > 0 ? 'bg-cash/20 text-cash' : 'bg-void text-ink-dim',
            )}
          >
            {left > 0 ? BUTIK.boxLeft(left) : BUTIK.boxEmpty}
          </span>
        </div>
      </div>

      <Button variant="sleaze" block disabled={check !== 'ok'} onClick={onOpen}>
        {check === 'sold_out' ? BUTIK.soldOut : check === 'too_poor' ? BUTIK.tooPoor : BUTIK.boxOpen(fmtRm(box.price))}
      </Button>

      {contents.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-baseline justify-between px-1 text-xs font-black tracking-wide text-ink-dim uppercase">
            <span>{BUTIK.boxContents}</span>
            <span>{BUTIK.boxOdds}</span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {contents.map((p) => (
              <li
                key={p.id}
                className={cx(
                  'flex items-center gap-3 rounded-lg bg-tote/50 py-1.5 pr-3 pl-1.5 ring-1 ring-white/5 ring-inset',
                  p.stock < 1 && 'opacity-45',
                )}
                style={{ boxShadow: `inset 3px 0 0 ${RARITY_COLOR[p.rarity]}` }}
              >
                <ShopImage image={p.image} name={p.name} rarity={p.rarity} className="size-11 shrink-0 rounded-md text-xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
                  <span className="truncate text-sm font-bold">{p.name}</span>
                  <span className="flex items-center gap-2">
                    <RarityChip rarity={p.rarity} />
                    <span className="text-[0.7rem] text-ink-dim tabular-nums">
                      {p.stock < 1 ? BUTIK.soldOut : BUTIK.left(p.stock)}
                    </span>
                  </span>
                </div>
                <span className="shrink-0 font-display text-lg font-black text-plate tabular-nums">
                  {fmtPct(prizeChance(p, prizes))}
                </span>
              </li>
            ))}
          </ul>
          <p className="px-1 text-[0.7rem] text-ink-dim">{BUTIK.boxOddsNote}</p>
        </div>
      )}
    </section>
  )
}

function Bar({
  items,
  balance,
  onBuy,
}: {
  items: readonly ShopItemRow[]
  balance: number
  onBuy: (item: ShopItemRow) => void
}) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-tote/40 p-4 ring-1 ring-white/10 ring-inset">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-2xl leading-none font-black uppercase">{BUTIK.bar}</h2>
        <p className="text-xs text-ink-dim">{BUTIK.barHint}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <Item key={item.id} item={item} check={checkBuy({ balance }, item)} onBuy={onBuy} />
        ))}
      </ul>
    </section>
  )
}

function Item({ item, check, onBuy }: { item: ShopItemRow; check: BuyCheck; onBuy: (item: ShopItemRow) => void }) {
  const left = stockLeft(item)
  const soldOut = check === 'sold_out'
  return (
    <li
      className={cx(
        'flex items-center gap-3 rounded-xl bg-tote/60 p-2 pr-3 ring-1 ring-white/10 ring-inset',
        soldOut && 'opacity-55',
      )}
    >
      <ShopImage image={item.image} name={item.name} className="size-16 shrink-0 rounded-lg text-3xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="truncate font-bold">{item.name}</span>
        {item.blurb && <span className="line-clamp-2 text-xs text-ink-dim">{item.blurb}</span>}
        {left !== null && (
          <span
            className={cx(
              'mt-0.5 w-fit rounded-full px-2 py-0.5 text-[0.65rem] font-black tracking-wide uppercase',
              soldOut ? 'bg-void text-ink-dim' : 'bg-cash/20 text-cash',
            )}
          >
            {soldOut ? BUTIK.soldOut : BUTIK.left(left)}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-display text-xl leading-none font-black text-plate tabular-nums">{fmtRm(item.price)}</span>
        <Button disabled={check !== 'ok'} onClick={() => onBuy(item)} className="min-h-10! px-4! text-base!">
          {check === 'sold_out' ? BUTIK.soldOut : check === 'too_poor' ? BUTIK.tooPoor : BUTIK.buy}
        </Button>
      </div>
    </li>
  )
}

function Mine({ purchases }: { purchases: readonly PurchaseRow[] | undefined }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-tote/40 p-4 ring-1 ring-white/10 ring-inset">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="font-display text-2xl leading-none font-black uppercase">{BUTIK.mineTitle}</h2>
        <span className="flex-1" />
        {!!purchases?.length && (
          <span className="font-display text-lg font-black text-plate tabular-nums">
            {BUTIK.mineTotal} {fmtRm(purchaseTotal(purchases))}
          </span>
        )}
      </div>
      {!purchases && <p className="text-sm text-ink-dim">{UI_LABELS.loading}</p>}
      {purchases && purchases.length === 0 && <p className="text-sm text-ink-dim">{BUTIK.mineEmpty}</p>}
      <ul className="flex flex-col gap-1.5">
        {purchases?.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-lg bg-tote/50 px-3 py-2 ring-1 ring-white/5 ring-inset"
            style={p.prize_rarity ? { boxShadow: `inset 3px 0 0 ${RARITY_COLOR[p.prize_rarity]}` } : undefined}
          >
            <span className="min-w-0 flex-1 truncate font-bold">
              {p.prize_name ? BUTIK.boxReceipt(p.prize_name) : p.item_name}
            </span>
            <span className="shrink-0 font-display text-lg font-black text-ink-dim tabular-nums">{fmtRm(p.price)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
