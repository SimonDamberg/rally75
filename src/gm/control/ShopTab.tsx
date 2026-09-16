// The black market, from behind the counter. Two things Simon needs mid-party: the shelf (prices
// and stock, editable while the room is watching) and the feed of what has just been bought, so he
// knows there is a beer to pour. There is no delivery status to keep in sync: a purchase is a
// receipt, and Ångra is there for when the tap runs dry.
import { useState } from 'react'
import type { PlayerRow, PurchaseRow, ShopEffect, ShopItemRow, ShopKind } from '../../lib/types'
import { GM_SHOP } from '../../shared/content/gm'
import { badgedLabel, fmtRm } from '../../shared/game/format'
import { Button, cx, Modal, toast } from '../../ui'
import { useGmAction } from '../gmAuth'
import { parsePrice, parseStock } from '../parse'
import { Field, TextArea, TextInput } from './form'

type Editing = { item: ShopItemRow | null } | null

export function ShopTab({
  items,
  purchases,
  players,
}: {
  items: readonly ShopItemRow[] | undefined
  purchases: readonly PurchaseRow[] | undefined
  players: readonly PlayerRow[] | undefined
}) {
  const [editing, setEditing] = useState<Editing>(null)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-2xl font-black text-plate uppercase">{GM_SHOP.title}</h2>
        <span className="text-sm text-ink-dim">{GM_SHOP.hint}</span>
        <span className="flex-1" />
        <Button onClick={() => setEditing({ item: null })}>{GM_SHOP.new}</Button>
      </div>

      {items && items.length === 0 && <p className="text-ink-dim">{GM_SHOP.empty}</p>}
      <ul className="flex flex-col gap-2">
        {items?.map((item) => (
          <ItemRow key={item.id} item={item} onEdit={() => setEditing({ item })} />
        ))}
      </ul>

      <SoldFeed purchases={purchases} players={players} />

      {editing && <EditItem key={editing.item?.id ?? 'new'} item={editing.item} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ItemRow({ item, onEdit }: { item: ShopItemRow; onEdit: () => void }) {
  const { run, busy } = useGmAction()
  const soldOut = item.stock !== null && item.stock < 1

  // Mid-party shortcuts: one more off the shelf, or "that was the last one".
  const setStock = (stock: number) =>
    void run((gm, pw) => gm.upsertShopItem(pw, { ...item, stock, id: item.id }))

  return (
    // Stacked, not one row: the name plus three buttons does not fit across a 390 px phone.
    <li
      className={cx(
        'flex flex-col gap-2 rounded-xl bg-tote/60 px-4 py-3 ring-1 ring-white/10 ring-inset',
        !item.active && 'opacity-55',
      )}
    >
      <div className="flex min-w-0 items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate font-extrabold">{item.name}</span>
        <span className="shrink-0 font-display text-xl font-black text-plate tabular-nums">{fmtRm(item.price)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg text-ink-dim">
        <span className="rounded-full bg-void px-3 py-0.5 text-base font-bold text-ink uppercase">
          {item.kind === 'physical' ? GM_SHOP.physical : GM_SHOP.digital}
        </span>
        {!item.active && (
          <span className="rounded-full bg-void px-3 py-0.5 text-base font-bold text-ink uppercase">
            {GM_SHOP.inactive}
          </span>
        )}
        <span className={cx('tabular-nums', soldOut && 'text-drift')}>
          {item.stock === null ? GM_SHOP.unlimited : soldOut ? GM_SHOP.soldOut : GM_SHOP.stock(item.stock)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {item.stock !== null && (
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setStock(item.stock! + 1)}>
              {GM_SHOP.addStock}
            </Button>
            <Button variant="ghost" disabled={busy || soldOut} onClick={() => setStock(0)}>
              {GM_SHOP.markSoldOut}
            </Button>
          </>
        )}
        <span className="flex-1" />
        <Button variant="ghost" onClick={onEdit}>
          {GM_SHOP.edit}
        </Button>
      </div>
    </li>
  )
}

function SoldFeed({
  purchases,
  players,
}: {
  purchases: readonly PurchaseRow[] | undefined
  players: readonly PlayerRow[] | undefined
}) {
  const { run, busy } = useGmAction()
  const [undoing, setUndoing] = useState<PurchaseRow | null>(null)
  const total = purchases?.reduce((sum, p) => sum + p.price, 0) ?? 0
  const label = (playerId: string) => {
    const player = players?.find((p) => p.id === playerId)
    return player ? badgedLabel(player) : '?'
  }

  const refund = async () => {
    if (!undoing || !(await run((gm, pw) => gm.refundPurchase(pw, undoing.id)))) return
    toast({ text: GM_SHOP.refunded(undoing.item_name) })
    setUndoing(null)
  }

  return (
    <section className="flex flex-col gap-3 border-t border-white/10 pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-2xl font-black text-plate uppercase">{GM_SHOP.soldTitle}</h2>
        <span className="text-sm text-ink-dim">{GM_SHOP.soldHint}</span>
        <span className="flex-1" />
        {total > 0 && <span className="font-display text-xl font-black text-cash tabular-nums">{GM_SHOP.soldTotal(fmtRm(total))}</span>}
      </div>

      {purchases && purchases.length === 0 && <p className="text-ink-dim">{GM_SHOP.soldEmpty}</p>}
      <ul className="flex flex-col gap-2">
        {purchases?.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-tote/50 px-4 py-3 ring-1 ring-white/10 ring-inset">
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate font-extrabold">{p.item_name}</span>
              <span className="truncate text-xl text-ink-dim">{label(p.player_id)}</span>
            </div>
            <span className="shrink-0 font-display text-xl font-black text-plate tabular-nums">{fmtRm(p.price)}</span>
            <Button variant="ghost" onClick={() => setUndoing(p)}>
              {GM_SHOP.refund}
            </Button>
          </li>
        ))}
      </ul>

      <Modal
        open={!!undoing}
        onClose={() => setUndoing(null)}
        tone="danger"
        title={undoing ? GM_SHOP.refundConfirmTitle(undoing.item_name) : ''}
        actions={
          <>
            <Button variant="ghost" onClick={() => setUndoing(null)}>
              {GM_SHOP.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void refund()}>
              {GM_SHOP.refundConfirmOk}
            </Button>
          </>
        }
      >
        <p className="text-xl">{GM_SHOP.refundConfirmText}</p>
      </Modal>
    </section>
  )
}

const KINDS: readonly { value: ShopKind; label: string }[] = [
  { value: 'physical', label: GM_SHOP.physical },
  { value: 'digital', label: GM_SHOP.digital },
]

const EFFECTS: readonly { value: ShopEffect; label: string }[] = [
  { value: 'none', label: GM_SHOP.effectNone },
  { value: 'title', label: GM_SHOP.effectTitle },
  { value: 'badge', label: GM_SHOP.effectBadge },
]

function EditItem({ item, onClose }: { item: ShopItemRow | null; onClose: () => void }) {
  const { run, busy } = useGmAction()
  const [name, setName] = useState(item?.name ?? '')
  const [blurb, setBlurb] = useState(item?.blurb ?? '')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [stock, setStock] = useState(item?.stock == null ? '' : String(item.stock))
  const [kind, setKind] = useState<ShopKind>(item?.kind ?? 'physical')
  const [effect, setEffect] = useState<ShopEffect>(item?.effect ?? 'none')
  const [effectValue, setEffectValue] = useState(item?.effect_value ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const parsedPrice = parsePrice(price)
  const parsedStock = parseStock(stock)
  const priceError = price !== '' && parsedPrice === null
  const stockError = parsedStock === null

  const save = async () => {
    if (parsedPrice === null || parsedStock === null) return
    const row = await run((gm, pw) =>
      gm.upsertShopItem(pw, {
        id: item?.id ?? null,
        name,
        blurb,
        price: parsedPrice,
        stock: parsedStock ?? null,
        kind,
        effect,
        effect_value: effect === 'none' ? '' : effectValue,
        // New items land at the end of the shelf; existing ones keep their place.
        sort: item?.sort ?? 1000,
        active,
      }),
    )
    if (!row) return
    toast({ text: GM_SHOP.saved(row.name) })
    onClose()
  }

  const remove = async () => {
    if (!item || !(await run(async (gm, pw) => (await gm.deleteShopItem(pw, item.id), true)))) return
    toast({ text: GM_SHOP.deleted(item.name) })
    onClose()
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={item ? item.name : GM_SHOP.new}
        className="w-[min(52rem,calc(100vw-2rem))]"
        actions={
          <>
            {item && (
              <Button variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                {GM_SHOP.delete}
              </Button>
            )}
            <span className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              {GM_SHOP.cancel}
            </Button>
            <Button type="submit" form="shop-form" loading={busy} disabled={priceError || stockError}>
              {GM_SHOP.save}
            </Button>
          </>
        }
      >
        <form
          id="shop-form"
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <Field label={GM_SHOP.nameLabel}>
            <TextInput maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={GM_SHOP.blurbLabel}>
            <TextArea rows={2} maxLength={160} value={blurb} onChange={(e) => setBlurb(e.target.value)} />
          </Field>
          <Field label={GM_SHOP.priceLabel} hint={priceError ? GM_SHOP.priceError : undefined}>
            <TextInput
              inputMode="numeric"
              aria-invalid={priceError || undefined}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label={GM_SHOP.stockLabel} hint={stockError ? GM_SHOP.stockError : GM_SHOP.stockHint}>
            <TextInput
              inputMode="numeric"
              aria-invalid={stockError || undefined}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Field>
          <Field label={GM_SHOP.kindLabel}>
            <Choice options={KINDS} value={kind} onPick={setKind} />
          </Field>
          <Field label={GM_SHOP.effectLabel}>
            <Choice options={EFFECTS} value={effect} onPick={setEffect} />
          </Field>
          {effect !== 'none' && (
            <Field label={GM_SHOP.effectValueLabel} hint={GM_SHOP.effectValueHint}>
              <TextInput maxLength={40} value={effectValue} onChange={(e) => setEffectValue(e.target.value)} />
            </Field>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => setActive(!active)}
            className="flex items-center gap-4 self-start rounded-xl py-2 text-2xl font-bold"
          >
            <span className={cx('relative h-10 w-18 rounded-full transition-colors', active ? 'bg-cash' : 'bg-void')}>
              <span
                className={cx(
                  'absolute top-1 left-1 size-8 rounded-full bg-white transition-transform',
                  active && 'translate-x-8',
                )}
              />
            </span>
            {GM_SHOP.activeLabel}
          </button>
        </form>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        tone="danger"
        title={item ? GM_SHOP.deleteConfirmTitle(item.name) : ''}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {GM_SHOP.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void remove()}>
              {GM_SHOP.deleteConfirmOk}
            </Button>
          </>
        }
      >
        <p className="text-xl">{GM_SHOP.deleteConfirmText}</p>
      </Modal>
    </>
  )
}

function Choice<T extends string>({
  options,
  value,
  onPick,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onPick: (value: T) => void
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onPick(o.value)}
          className={cx(
            'min-h-14 flex-1 rounded-xl font-display text-xl font-extrabold uppercase',
            value === o.value ? 'bg-plate text-night' : 'bg-tote/60 text-ink-dim ring-2 ring-tote-hi/60 ring-inset',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
