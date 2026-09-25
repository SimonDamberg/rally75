// "Lådan": the Mystery Box, its own tab because it plays like a minigame. The box is opened, not
// bought: open_box draws the prize on the server, and CaseOpening spins a reel onto it. Until the
// reel lands the receipt stays off "Mina vinster" and "Att hämta", or the list would spoil it.
// A won prize is handed over by Simon when the guest presses Hämta there (Pickup.tsx). Still rank
// neutral, like everything in the Butik.
import { useEffect, useState } from 'react'
import { usePlayerPurchases } from '../lib/hooks'
import type { BoxPrizeRow, PurchaseRow, ShopItemRow } from '../lib/types'
import { BOX, BUTIK } from '../shared/content/client'
import { UI_LABELS } from '../shared/content/ui'
import { BOX_RARITIES, boxLeft, buildReel, prizeChance, type Reel } from '../shared/game/box'
import { fmtPct, fmtRm } from '../shared/game/format'
import { createRng, randomSeed } from '../shared/game/rng'
import { Button, cx, Modal, RARITY_COLOR, RarityChip, ShopImage, SmallPrint, toast } from '../ui'
import { afterBuy, checkBuy, shelves, toCollect, visiblePurchases, type BuyCheck } from './buy'
import { CaseOpening } from './CaseOpening'
import { useGuest, useGuestAction } from './guest'
import { Receipts, ToCollect } from './Pickup'
import { useClaim } from './useClaim'

interface Opening {
  purchase: PurchaseRow
  winner: BoxPrizeRow
  reel: Reel<BoxPrizeRow>
}

export function MysteryBox({ onConfirmChange }: { onConfirmChange: (open: boolean) => void }) {
  const { identity, player, shopItems, boxPrizes } = useGuest()
  const { data: purchases, reload: reloadPurchases } = usePlayerPurchases(identity.playerId)
  const { run, busy } = useGuestAction()
  const claim = useClaim(reloadPurchases)
  const [picked, setPicked] = useState<ShopItemRow | null>(null)
  const [opening, setOpening] = useState<Opening | null>(null)
  const [landed, setLanded] = useState(false)

  // Offers and the Snabblån stay away while a confirm, a reel or a claim screen is up.
  const covered = !!picked || !!opening || claim.open
  useEffect(() => {
    onConfirmChange(covered)
    return () => onConfirmChange(false)
  }, [covered, onConfirmChange])

  if (!player) return <p className="p-6 text-center text-ink-dim">{UI_LABELS.loading}</p>

  const prizes = boxPrizes ?? []
  const { box } = shelves(shopItems ?? [])
  const spinning = opening && !landed ? opening.purchase.id : null
  const mine = purchases && visiblePurchases(purchases, spinning).filter((p) => p.kind === 'box')

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
    reloadPurchases()
  }

  const landedOn = () => {
    setLanded(true)
    if (opening) toast({ text: BUTIK.boxToast(opening.winner.name), tone: 'win' })
  }

  const againCheck = box ? checkBuy(player, box, prizes) : 'inactive'

  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      <header className="flex flex-col gap-1 px-1">
        <h1 className="font-display text-4xl leading-none font-black text-plate uppercase">{BOX.title}</h1>
        <p className="text-sm text-ink-dim">{BOX.subtitle}</p>
        <p className="font-display text-xl font-black text-cash tabular-nums">{BUTIK.spendable(fmtRm(player.balance))}</p>
      </header>

      {!shopItems && <p className="p-6 text-center text-ink-dim">{UI_LABELS.loading}</p>}
      {shopItems && !box && <p className="p-6 text-center text-ink-dim">{BUTIK.boxEmpty}</p>}

      <ToCollect
        receipts={toCollect(purchases ?? [], 'box', spinning)}
        kind="box"
        onClaim={(p) => claim.ask({ kind: 'receipt', purchase: p })}
      />

      {box && <BoxCard box={box} prizes={prizes} check={checkBuy(player, box, prizes)} onOpen={() => setPicked(box)} />}

      <Receipts title={BOX.mineTitle} empty={BOX.mineEmpty} totalLabel={BOX.mineTotal} purchases={mine} />

      <p className="px-1 text-xs text-ink-dim">{BUTIK.smallPrint}</p>
      <SmallPrint className="mt-auto" />

      <Modal
        open={!!picked}
        onClose={() => setPicked(null)}
        dismissible={!busy}
        tone="sleaze"
        title={BUTIK.boxConfirmTitle}
        actions={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setPicked(null)}>
              {BUTIK.cancel}
            </Button>
            <Button variant="sleaze" loading={busy} onClick={() => picked && void openBox(picked)}>
              {picked ? BUTIK.boxConfirmOk(fmtRm(picked.price)) : ''}
            </Button>
          </>
        }
      >
        {picked && (
          <div className="flex flex-col gap-2">
            {picked.blurb && <p className="text-lg">{picked.blurb}</p>}
            <p className="text-ink-dim">{BUTIK.boxConfirmText(fmtRm(picked.price))}</p>
            <p className="font-display text-xl font-black tabular-nums">
              {BUTIK.confirmAfter(fmtRm(afterBuy(player, picked.price).balance))}
            </p>
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

      {claim.ui}
    </div>
  )
}

function snapshotPrize(purchase: PurchaseRow): BoxPrizeRow {
  return {
    id: purchase.prize_id ?? purchase.id,
    name: purchase.prize_name ?? purchase.item_name,
    blurb: '',
    image: '',
    video: '',
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
        {/* object-contain: the case art is a cut-out on a transparent background, not a photo to crop. */}
        <ShopImage
          image={box.image}
          name={box.name}
          rarity="guld"
          className="size-28 shrink-0 rounded-xl object-contain! text-5xl drop-shadow-[0_0.6rem_1rem_rgb(0_0_0/0.5)]"
        />
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

