// The black market, from behind the counter. Three things Simon needs mid-party: the shelf (prices
// and stock, editable while the room is watching), what is left in the Mystery Box, and the feed
// of what has just been bought or won, so he knows there is a beer to pour or a prize to hand
// over. There is no delivery status to keep in sync: a purchase is a receipt, and Ångra is there
// for when the tap runs dry.
import { useState } from 'react'
import type { BoxPrizeRow, PlayerRow, PurchaseRow, ShopItemRow } from '../../lib/types'
import { GM_SHOP } from '../../shared/content/gm'
import { RARITY_LABELS } from '../../shared/content/ui'
import { BOX_RARITIES, boxLeft, prizeChance, type BoxRarity } from '../../shared/game/box'
import { badgedLabel, fmtPct, fmtRm } from '../../shared/game/format'
import { Button, cx, Modal, RARITY_COLOR, RarityChip, ShopImage, toast } from '../../ui'
import { useGmAction } from '../gmAuth'
import { parsePrice, parseStock } from '../parse'
import { Field, TextArea, TextInput } from './form'

type Editing = { item: ShopItemRow | null } | null
type EditingPrize = { prize: BoxPrizeRow | null } | null

export function ShopTab({
  items,
  prizes,
  purchases,
  players,
}: {
  items: readonly ShopItemRow[] | undefined
  prizes: readonly BoxPrizeRow[] | undefined
  purchases: readonly PurchaseRow[] | undefined
  players: readonly PlayerRow[] | undefined
}) {
  const [editing, setEditing] = useState<Editing>(null)
  const [editingPrize, setEditingPrize] = useState<EditingPrize>(null)

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
          <ItemRow key={item.id} item={item} prizes={prizes ?? []} onEdit={() => setEditing({ item })} />
        ))}
      </ul>

      <BoxPrizes prizes={prizes} onEdit={(prize) => setEditingPrize({ prize })} />

      <SoldFeed purchases={purchases} players={players} />

      {editing && <EditItem key={editing.item?.id ?? 'new'} item={editing.item} onClose={() => setEditing(null)} />}
      {editingPrize && (
        <EditPrize
          key={editingPrize.prize?.id ?? 'new'}
          prize={editingPrize.prize}
          onClose={() => setEditingPrize(null)}
        />
      )}
    </div>
  )
}

function ItemRow({ item, prizes, onEdit }: { item: ShopItemRow; prizes: readonly BoxPrizeRow[]; onEdit: () => void }) {
  const { run, busy } = useGmAction()
  const isBox = item.kind === 'box'
  const left = isBox ? boxLeft(prizes) : item.stock
  const soldOut = left !== null && left < 1

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
      <div className="flex min-w-0 items-center gap-3">
        <ShopImage image={item.image} name={item.name} className="size-12 shrink-0 rounded-lg text-2xl" />
        <span className="min-w-0 flex-1 truncate font-extrabold">{item.name}</span>
        <span className="shrink-0 font-display text-xl font-black text-plate tabular-nums">{fmtRm(item.price)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg text-ink-dim">
        <span className="rounded-full bg-void px-3 py-0.5 text-base font-bold text-ink uppercase">
          {isBox ? GM_SHOP.box : item.kind === 'digital' ? GM_SHOP.digital : GM_SHOP.bar}
        </span>
        {!item.active && (
          <span className="rounded-full bg-void px-3 py-0.5 text-base font-bold text-ink uppercase">
            {GM_SHOP.inactive}
          </span>
        )}
        <span className={cx('tabular-nums', soldOut && 'text-drift')}>
          {left === null
            ? GM_SHOP.unlimited
            : soldOut
              ? GM_SHOP.soldOut
              : isBox
                ? GM_SHOP.boxLeft(left)
                : GM_SHOP.stock(left)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {!isBox && item.stock !== null && (
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
    toast({ text: GM_SHOP.refunded(undoing.prize_name ?? undoing.item_name) })
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
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-extrabold">{p.prize_name ? GM_SHOP.fromBox(p.prize_name) : p.item_name}</span>
                {p.prize_rarity && <RarityChip rarity={p.prize_rarity} className="shrink-0" />}
              </span>
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
        title={undoing ? GM_SHOP.refundConfirmTitle(undoing.prize_name ?? undoing.item_name) : ''}
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

function EditItem({ item, onClose }: { item: ShopItemRow | null; onClose: () => void }) {
  const { run, busy } = useGmAction()
  const [name, setName] = useState(item?.name ?? '')
  const [blurb, setBlurb] = useState(item?.blurb ?? '')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [stock, setStock] = useState(item?.stock == null ? '' : String(item.stock))
  const [image, setImage] = useState(item?.image ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isBox = item?.kind === 'box'
  const parsedPrice = parsePrice(price)
  const parsedStock = parseStock(stock)
  const priceError = price !== '' && parsedPrice === null
  const stockError = !isBox && parsedStock === null

  const save = async () => {
    if (parsedPrice === null || parsedStock === null) return
    const row = await run((gm, pw) =>
      gm.upsertShopItem(pw, {
        id: item?.id ?? null,
        name,
        blurb,
        price: parsedPrice,
        stock: isBox ? null : (parsedStock ?? null),
        // The shop sells bar items and the box now. The kind and any old effect stay as they are;
        // a new item is always something from the bar.
        kind: item?.kind ?? 'physical',
        effect: item?.effect ?? 'none',
        effect_value: item?.effect_value ?? '',
        // New items land at the end of the shelf; existing ones keep their place.
        sort: item?.sort ?? 1000,
        active,
        image,
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
          {!isBox && (
            <Field label={GM_SHOP.stockLabel} hint={stockError ? GM_SHOP.stockError : GM_SHOP.stockHint}>
              <TextInput
                inputMode="numeric"
                aria-invalid={stockError || undefined}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </Field>
          )}
          <Field label={GM_SHOP.imageLabel} hint={GM_SHOP.imageHint}>
            <TextInput maxLength={80} autoCapitalize="off" value={image} onChange={(e) => setImage(e.target.value)} />
          </Field>
          <ActiveSwitch active={active} onToggle={() => setActive(!active)} />
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

function ActiveSwitch({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      className="flex items-center gap-4 self-start rounded-xl py-2 text-2xl font-bold"
    >
      <span className={cx('relative h-10 w-18 rounded-full transition-colors', active ? 'bg-cash' : 'bg-void')}>
        <span
          className={cx('absolute top-1 left-1 size-8 rounded-full bg-white transition-transform', active && 'translate-x-8')}
        />
      </span>
      {GM_SHOP.activeLabel}
    </button>
  )
}

function BoxPrizes({
  prizes,
  onEdit,
}: {
  prizes: readonly BoxPrizeRow[] | undefined
  onEdit: (prize: BoxPrizeRow | null) => void
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-white/10 pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-2xl font-black text-plate uppercase">{GM_SHOP.prizesTitle}</h2>
        <span className="flex-1" />
        <Button onClick={() => onEdit(null)}>{GM_SHOP.newPrize}</Button>
      </div>
      <p className="text-ink-dim">{GM_SHOP.prizesHint}</p>
      {prizes && boxLeft(prizes) === 0 && <p className="text-drift">{GM_SHOP.prizesEmpty}</p>}
      <ul className="flex flex-col gap-2">
        {prizes?.map((prize) => (
          <PrizeRow key={prize.id} prize={prize} prizes={prizes} onEdit={() => onEdit(prize)} />
        ))}
      </ul>
    </section>
  )
}

function PrizeRow({
  prize,
  prizes,
  onEdit,
}: {
  prize: BoxPrizeRow
  prizes: readonly BoxPrizeRow[]
  onEdit: () => void
}) {
  const { run, busy } = useGmAction()
  const gone = prize.stock < 1
  const setStock = (stock: number) => void run((gm, pw) => gm.upsertBoxPrize(pw, { ...prize, stock }))

  return (
    <li
      className={cx(
        'flex flex-col gap-2 rounded-xl bg-tote/60 px-4 py-3 ring-1 ring-white/10 ring-inset',
        !prize.active && 'opacity-55',
      )}
      style={{ boxShadow: `inset 4px 0 0 ${RARITY_COLOR[prize.rarity]}` }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ShopImage image={prize.image} name={prize.name} rarity={prize.rarity} className="size-12 shrink-0 rounded-lg text-2xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-extrabold">{prize.name}</span>
          <RarityChip rarity={prize.rarity} className="text-xs" />
        </div>
        <span className="shrink-0 font-display text-xl font-black text-plate tabular-nums">
          {fmtPct(prizeChance(prize, prizes))}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!prize.active && (
          <span className="rounded-full bg-void px-3 py-0.5 text-base font-bold text-ink uppercase">{GM_SHOP.inactive}</span>
        )}
        <span className={cx('text-lg tabular-nums', gone ? 'text-drift' : 'text-ink-dim')}>
          {gone ? GM_SHOP.soldOut : GM_SHOP.stock(prize.stock)}
        </span>
        <span className="flex-1" />
        <Button variant="ghost" disabled={busy} onClick={() => setStock(prize.stock + 1)}>
          {GM_SHOP.addStock}
        </Button>
        <Button variant="ghost" disabled={busy || gone} onClick={() => setStock(0)}>
          {GM_SHOP.markSoldOut}
        </Button>
        <Button variant="ghost" onClick={onEdit}>
          {GM_SHOP.edit}
        </Button>
      </div>
    </li>
  )
}

function EditPrize({ prize, onClose }: { prize: BoxPrizeRow | null; onClose: () => void }) {
  const { run, busy } = useGmAction()
  const [name, setName] = useState(prize?.name ?? '')
  const [blurb, setBlurb] = useState(prize?.blurb ?? '')
  const [image, setImage] = useState(prize?.image ?? '')
  const [rarity, setRarity] = useState<BoxRarity>(prize?.rarity ?? 'bla')
  const [count, setCount] = useState(prize ? String(prize.stock) : '1')
  const [active, setActive] = useState(prize?.active ?? true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // A count is a whole number, zero or more: the same shape as a price.
  const parsedCount = parsePrice(count)
  const countError = parsedCount === null

  const save = async () => {
    if (parsedCount === null) return
    const row = await run((gm, pw) =>
      gm.upsertBoxPrize(pw, {
        id: prize?.id ?? null,
        name,
        blurb,
        image,
        rarity,
        stock: parsedCount,
        sort: prize?.sort ?? 1000,
        active,
      }),
    )
    if (!row) return
    toast({ text: GM_SHOP.saved(row.name) })
    onClose()
  }

  const remove = async () => {
    if (!prize || !(await run(async (gm, pw) => (await gm.deleteBoxPrize(pw, prize.id), true)))) return
    toast({ text: GM_SHOP.deleted(prize.name) })
    onClose()
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={prize ? prize.name : GM_SHOP.newPrize}
        className="w-[min(52rem,calc(100vw-2rem))]"
        actions={
          <>
            {prize && (
              <Button variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                {GM_SHOP.delete}
              </Button>
            )}
            <span className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              {GM_SHOP.cancel}
            </Button>
            <Button type="submit" form="prize-form" loading={busy} disabled={countError}>
              {GM_SHOP.save}
            </Button>
          </>
        }
      >
        <form
          id="prize-form"
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
          <Field label={GM_SHOP.rarityLabel}>
            <RarityPicker value={rarity} onPick={setRarity} />
          </Field>
          <Field label={GM_SHOP.countLabel} hint={countError ? GM_SHOP.countError : undefined}>
            <TextInput
              inputMode="numeric"
              aria-invalid={countError || undefined}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </Field>
          <Field label={GM_SHOP.imageLabel} hint={GM_SHOP.imageHint}>
            <TextInput maxLength={80} autoCapitalize="off" value={image} onChange={(e) => setImage(e.target.value)} />
          </Field>
          <ActiveSwitch active={active} onToggle={() => setActive(!active)} />
        </form>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        tone="danger"
        title={prize ? GM_SHOP.prizeDeleteConfirmTitle(prize.name) : ''}
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
        <p className="text-xl">{GM_SHOP.prizeDeleteConfirmText}</p>
      </Modal>
    </>
  )
}

function RarityPicker({ value, onPick }: { value: BoxRarity; onPick: (value: BoxRarity) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {BOX_RARITIES.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={value === r}
          onClick={() => onPick(r)}
          className={cx(
            'min-h-12 rounded-xl px-4 font-display text-lg font-extrabold text-white uppercase',
            value === r ? 'ring-4 ring-plate' : 'opacity-60',
          )}
          style={{ backgroundColor: RARITY_COLOR[r] }}
        >
          {RARITY_LABELS[r]}
        </button>
      ))}
    </div>
  )
}
