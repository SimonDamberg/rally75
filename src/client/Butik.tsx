// "Butik": the black market. Two shelves, one real (Simon hands the beer over in the kitchen) and
// one entirely imaginary. Buying moves RM from balance to spent, and netWorth adds spent back, so
// nothing bought here can cost you a place on the Topplista (see buy.test.ts). The small print
// says so out loud.
import { useState } from 'react'
import { usePlayerPurchases } from '../lib/hooks'
import type { PurchaseRow, ShopItemRow } from '../lib/types'
import { BUTIK } from '../shared/content/client'
import { UI_LABELS } from '../shared/content/ui'
import { fmtRm } from '../shared/game/format'
import { Button, cx, Modal, SmallPrint, toast } from '../ui'
import { afterBuy, checkBuy, purchaseTotal, shelves, stockLeft, type BuyCheck } from './buy'
import { useGuest, useGuestAction } from './guest'

export function Butik({ onConfirmChange }: { onConfirmChange: (open: boolean) => void }) {
  const { identity, player, shopItems } = useGuest()
  const { data: purchases } = usePlayerPurchases(identity.playerId)
  const { run, busy } = useGuestAction()
  const [picked, setPicked] = useState<ShopItemRow | null>(null)
  const [receipt, setReceipt] = useState<{ purchase: PurchaseRow; item: ShopItemRow } | null>(null)

  if (!player) return <p className="p-6 text-center text-ink-dim">{UI_LABELS.loading}</p>

  const { physical, digital } = shelves(shopItems ?? [])

  const open = (item: ShopItemRow) => {
    setPicked(item)
    onConfirmChange(true)
  }
  const close = () => {
    setPicked(null)
    onConfirmChange(false)
  }

  const buy = async () => {
    if (!picked) return
    const purchase = await run((api, id) => api.buyItem(id, picked.id))
    if (!purchase) return
    close()
    setReceipt({ purchase, item: picked })
    toast({ text: BUTIK.boughtToast(picked.name), tone: 'win' })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      <header className="flex flex-col gap-1 px-1">
        <h1 className="font-display text-4xl leading-none font-black text-plate uppercase">{BUTIK.title}</h1>
        <p className="text-sm text-ink-dim">{BUTIK.subtitle}</p>
        <p className="font-display text-xl font-black text-cash tabular-nums">{BUTIK.spendable(fmtRm(player.balance))}</p>
      </header>

      {shopItems && physical.length === 0 && digital.length === 0 && (
        <p className="p-6 text-center text-ink-dim">{BUTIK.empty}</p>
      )}
      {!shopItems && <p className="p-6 text-center text-ink-dim">{UI_LABELS.loading}</p>}

      <Shelf title={BUTIK.physical} hint={BUTIK.physicalHint} items={physical} balance={player.balance} onBuy={open} />
      <Shelf title={BUTIK.digital} hint={BUTIK.digitalHint} items={digital} balance={player.balance} onBuy={open} />

      <Mine purchases={purchases} />

      <p className="px-1 text-xs text-ink-dim">{BUTIK.smallPrint}</p>
      <SmallPrint className="mt-auto" />

      <Modal
        open={!!picked}
        onClose={close}
        dismissible={!busy}
        tone="sleaze"
        title={picked ? BUTIK.confirmTitle(picked.name) : ''}
        actions={
          <>
            <Button variant="ghost" disabled={busy} onClick={close}>
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
              {receipt.item.kind === 'physical' ? BUTIK.boughtPhysical : BUTIK.boughtDigital}
            </p>
            {receipt.item.effect !== 'none' && (
              <p className="text-lg text-plate">{BUTIK.boughtEffect(receipt.item.effect_value)}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function Shelf({
  title,
  hint,
  items,
  balance,
  onBuy,
}: {
  title: string
  hint: string
  items: readonly ShopItemRow[]
  balance: number
  onBuy: (item: ShopItemRow) => void
}) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-tote/40 p-4 ring-1 ring-white/10 ring-inset">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-2xl leading-none font-black uppercase">{title}</h2>
        <p className="text-xs text-ink-dim">{hint}</p>
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
        'flex items-center gap-3 rounded-xl bg-tote/60 px-3 py-2.5 ring-1 ring-white/10 ring-inset',
        soldOut && 'opacity-55',
      )}
    >
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
          <li key={p.id} className="flex items-center gap-3 rounded-lg bg-tote/50 px-3 py-2 ring-1 ring-white/5 ring-inset">
            <span className="min-w-0 flex-1 truncate font-bold">{p.item_name}</span>
            <span className="shrink-0 font-display text-lg font-black text-ink-dim tabular-nums">{fmtRm(p.price)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
