// "Butik": the black market. Marker for the bordsspel on top, then Öl and Cider from the bar. The
// Mystery Box has its own tab (MysteryBox.tsx). Buying moves RM from balance to spent, and netWorth
// adds spent back, so nothing bought here can cost you a place on the Topplista (see buy.test.ts).
// The small print says so out loud.
//
// Nothing is handed over on the strength of a receipt: the guest presses Hämta in front of whoever
// gives it out (Pickup.tsx). Marker go to Mr Green all at once, a beer or a cider one at a time.
import { useEffect, useState } from 'react'
import { usePlayerPurchases } from '../lib/hooks'
import type { PurchaseRow, ShopItemRow } from '../lib/types'
import { BUTIK, MARKER } from '../shared/content/client'
import { UI_LABELS } from '../shared/content/ui'
import { MARKER_MIN_QTY } from '../shared/game/economy'
import { fmtRm } from '../shared/game/format'
import { Button, cx, Modal, ShopImage, SmallPrint, toast } from '../ui'
import { afterBuy, checkBuy, checkMarkers, maxMarkers, shelves, stockLeft, toCollect, unclaimedMarkers, type BuyCheck } from './buy'
import { useGuest, useGuestAction } from './guest'
import { Receipts, ToCollect } from './Pickup'
import { useClaim } from './useClaim'

export function Butik({ onConfirmChange }: { onConfirmChange: (open: boolean) => void }) {
  const { identity, player, shopItems } = useGuest()
  const { data: purchases, reload: reloadPurchases } = usePlayerPurchases(identity.playerId)
  const { run, busy } = useGuestAction()
  const claim = useClaim(reloadPurchases)
  const [picked, setPicked] = useState<ShopItemRow | null>(null)
  const [receipt, setReceipt] = useState<{ purchase: PurchaseRow; item: ShopItemRow } | null>(null)
  const [markerQty, setMarkerQty] = useState(MARKER_MIN_QTY)
  const [buyingMarkers, setBuyingMarkers] = useState(false)

  // Offers and the Snabblån stay away while a confirm or a claim screen is up.
  const covered = !!picked || buyingMarkers || claim.open
  useEffect(() => {
    onConfirmChange(covered)
    return () => onConfirmChange(false)
  }, [covered, onConfirmChange])

  if (!player) return <p className="p-6 text-center text-ink-dim">{UI_LABELS.loading}</p>

  const { marker, items } = shelves(shopItems ?? [])
  const mine = purchases?.filter((p) => p.kind !== 'box')
  const toClaim = unclaimedMarkers(mine ?? [])

  const buy = async () => {
    if (!picked) return
    const purchase = await run((api, id) => api.buyItem(id, picked.id))
    if (!purchase) return
    setPicked(null)
    setReceipt({ purchase, item: picked })
    reloadPurchases()
    toast({ text: BUTIK.boughtToast(picked.name), tone: 'win' })
  }

  const buyMarkers = async () => {
    if (!marker) return
    const qty = markerQty
    const purchase = await run((api, id) => api.buyMarkers(id, marker.id, qty))
    if (!purchase) return
    setBuyingMarkers(false)
    reloadPurchases()
    toast({ text: MARKER.boughtToast(purchase.qty), tone: 'win' })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      <header className="flex flex-col gap-1 px-1">
        <h1 className="font-display text-4xl leading-none font-black text-plate uppercase">{BUTIK.title}</h1>
        <p className="text-sm text-ink-dim">{BUTIK.subtitle}</p>
        <p className="font-display text-xl font-black text-cash tabular-nums">{BUTIK.spendable(fmtRm(player.balance))}</p>
      </header>

      {shopItems && !marker && items.length === 0 && <p className="p-6 text-center text-ink-dim">{BUTIK.empty}</p>}
      {!shopItems && <p className="p-6 text-center text-ink-dim">{UI_LABELS.loading}</p>}

      <ToCollect
        receipts={toCollect(mine ?? [], 'physical')}
        kind="physical"
        onClaim={(p) => claim.ask({ kind: 'receipt', purchase: p })}
        markers={{ count: toClaim, onClaim: () => claim.ask({ kind: 'marker', count: toClaim }) }}
      />

      {marker && (
        <MarkerCard
          marker={marker}
          balance={player.balance}
          qty={markerQty}
          onQty={setMarkerQty}
          onBuy={() => setBuyingMarkers(true)}
        />
      )}
      <Bar items={items} balance={player.balance} onBuy={setPicked} />

      <Receipts title={BUTIK.mineTitle} empty={BUTIK.mineEmpty} totalLabel={BUTIK.mineTotal} purchases={mine} />

      <p className="px-1 text-xs text-ink-dim">{BUTIK.smallPrint}</p>
      <SmallPrint className="mt-auto" />

      <Modal
        open={!!picked}
        onClose={() => setPicked(null)}
        dismissible={!busy}
        tone="sleaze"
        title={picked ? BUTIK.confirmTitle(picked.name) : ''}
        actions={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setPicked(null)}>
              {BUTIK.cancel}
            </Button>
            <Button variant="sleaze" loading={busy} onClick={() => void buy()}>
              {picked ? BUTIK.confirmBuy(fmtRm(picked.price)) : ''}
            </Button>
          </>
        }
      >
        {picked && (
          <div className="flex flex-col gap-2">
            {picked.blurb && <p className="text-lg">{picked.blurb}</p>}
            <p className="text-ink-dim">{BUTIK.confirmText(fmtRm(picked.price))}</p>
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

      <Modal
        open={buyingMarkers && !!marker}
        onClose={() => setBuyingMarkers(false)}
        dismissible={!busy}
        tone="sleaze"
        title={MARKER.confirmTitle(markerQty)}
        actions={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setBuyingMarkers(false)}>
              {BUTIK.cancel}
            </Button>
            <Button variant="sleaze" loading={busy} onClick={() => void buyMarkers()}>
              {MARKER.confirmOk(fmtRm((marker?.price ?? 0) * markerQty))}
            </Button>
          </>
        }
      >
        {marker && (
          <div className="flex flex-col gap-2">
            <p className="text-lg">{MARKER.howTo}</p>
            <p className="text-ink-dim">{MARKER.confirmText(fmtRm(marker.price * markerQty))}</p>
            <p className="font-display text-xl font-black tabular-nums">
              {BUTIK.confirmAfter(fmtRm(afterBuy(player, marker.price * markerQty).balance))}
            </p>
          </div>
        )}
      </Modal>

      {claim.ui}
    </div>
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

function MarkerCard({
  marker,
  balance,
  qty,
  onQty,
  onBuy,
}: {
  marker: ShopItemRow
  balance: number
  qty: number
  onQty: (qty: number) => void
  onBuy: () => void
}) {
  const price = marker.price
  const max = maxMarkers({ balance }, price)
  const check = checkMarkers({ balance }, price, qty)
  const set = (n: number) => onQty(Math.max(MARKER_MIN_QTY, Math.min(Math.max(MARKER_MIN_QTY, max), n)))

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-tote/40 p-4 ring-1 ring-plate/40 ring-inset">
      <div className="flex items-center gap-4">
        {/* object-contain: the chip art is a cut-out on a transparent background, like the box. */}
        <ShopImage
          image={marker.image}
          name={marker.name}
          className="size-20 shrink-0 rounded-xl object-contain! text-4xl drop-shadow-[0_0.4rem_0.8rem_rgb(0_0_0/0.45)]"
        />
        <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
          <p className="text-xs font-black tracking-wide text-plate uppercase">{MARKER.kicker}</p>
          <h2 className="font-display text-3xl leading-none font-black uppercase">{marker.name}</h2>
          <p className="text-sm text-ink-dim">{marker.blurb || MARKER.games}</p>
          <p className="font-display text-lg font-black text-plate tabular-nums">{MARKER.each(fmtRm(price))}</p>
        </div>
      </div>

      <p className="rounded-xl bg-night/60 px-3 py-2 text-sm font-bold">{MARKER.howTo}</p>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black tracking-wide text-ink-dim uppercase">{MARKER.qty}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" aria-label={MARKER.less} disabled={qty <= MARKER_MIN_QTY} onClick={() => set(qty - 1)} className="min-h-11! w-11! px-0! text-2xl!">
              −
            </Button>
            <span className="w-14 text-center font-display text-4xl leading-none font-black tabular-nums">{qty}</span>
            <Button variant="ghost" aria-label={MARKER.more} disabled={qty >= max} onClick={() => set(qty + 1)} className="min-h-11! w-11! px-0! text-2xl!">
              +
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          {MARKER.quick.map((n) => (
            <button
              key={n}
              type="button"
              disabled={n > max}
              onClick={() => set(n)}
              className={cx(
                'flex-1 rounded-full py-1.5 text-sm font-black tabular-nums ring-1 ring-inset disabled:opacity-40',
                qty === n ? 'bg-plate text-night ring-plate' : 'bg-tote/60 ring-white/15',
              )}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled={max < MARKER_MIN_QTY}
            onClick={() => set(max)}
            className={cx(
              'flex-1 rounded-full py-1.5 text-sm font-black uppercase ring-1 ring-inset disabled:opacity-40',
              qty === max && max >= MARKER_MIN_QTY ? 'bg-plate text-night ring-plate' : 'bg-tote/60 ring-white/15',
            )}
          >
            {MARKER.max}
          </button>
        </div>
        <Button variant="sleaze" block disabled={check !== 'ok'} onClick={onBuy}>
          {check === 'too_poor' ? MARKER.tooPoor : MARKER.buy(qty, fmtRm(price * qty))}
        </Button>
      </div>
    </section>
  )
}
