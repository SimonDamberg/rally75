// Hämta: the guest claims a physical thing on the phone, in front of whoever hands it over (the
// flow is useClaim.tsx). The server stamps claimed_at first; the claim screen that follows is pure
// proof: endless RM rain, colours that never sit still, a throbbing
// headline and a clock ticking in seconds, so a screenshot is easy to tell apart from the real
// thing. No sound; one tap closes it.
import { useEffect, useState } from 'react'
import type { PurchaseRow } from '../lib/types'
import { MARKER, PICKUP } from '../shared/content/client'
import { UI_LABELS } from '../shared/content/ui'
import { fmtRm } from '../shared/game/format'
import { Button, cx, RARITY_COLOR, ShopImage } from '../ui'
import { needsPickup, purchaseTotal, receiptImage, receiptName } from './buy'
import { CoinBurst } from './CoinBurst'
import { useGuest } from './guest'

/** What the claim screen shows once claim_markers or claim_purchase has stamped the receipt. */
export interface Shown {
  kind: keyof typeof PICKUP.at
  headline: string
  unit?: string
  image?: string
  rarity?: PurchaseRow['prize_rarity']
}

export function ClaimScreen({ shown, who, onClose }: { shown: Shown; who: string; onClose: () => void }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 250)
    return () => clearInterval(id)
  }, [])

  const long = shown.headline.length
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={[shown.headline, shown.unit].filter(Boolean).join(' ')}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 overflow-hidden bg-night-deep p-6 text-center"
    >
      <div
        aria-hidden
        className="absolute inset-0 animate-rave bg-[radial-gradient(circle_at_30%_20%,var(--color-sleaze),transparent_55%),radial-gradient(circle_at_70%_80%,var(--color-cash),transparent_55%),radial-gradient(circle_at_50%_50%,var(--color-plate),transparent_70%)] opacity-70"
      />
      <CoinBurst big loop />

      <div className="relative z-20 flex w-full flex-col items-center gap-2">
        <p className="animate-blink rounded-full bg-night/80 px-4 py-1 text-sm font-black tracking-widest text-plate uppercase">
          {PICKUP.kicker}
        </p>
        {shown.image !== undefined && (
          <div
            className="my-5 animate-throb rounded-2xl"
            style={shown.rarity ? { boxShadow: `0 0 0 0.3rem ${RARITY_COLOR[shown.rarity]}, 0 0 3rem ${RARITY_COLOR[shown.rarity]}` } : undefined}
          >
            <ShopImage
              image={shown.image}
              name={shown.headline}
              rarity={shown.rarity ?? undefined}
              className="size-36 rounded-2xl object-contain! text-7xl drop-shadow-[0_0.8rem_1.2rem_rgb(0_0_0/0.6)]"
            />
          </div>
        )}
        <p
          className={cx(
            'font-display leading-none font-black break-words text-plate uppercase tabular-nums [text-shadow:0.3rem_0.3rem_0_var(--color-night)]',
            shown.image === undefined && 'animate-throb',
            long <= 3 ? 'text-[9rem]' : long <= 8 ? 'text-7xl' : 'text-5xl',
          )}
        >
          {shown.headline}
        </p>
        {shown.unit && (
          <p className="animate-shake font-display text-5xl leading-none font-black text-ink uppercase [text-shadow:0.2rem_0.2rem_0_var(--color-night)]">
            {shown.unit}
          </p>
        )}
        <p className="mt-2 rounded-xl bg-night/80 px-4 py-2 text-xl font-bold">{PICKUP.to(who)}</p>
        <p className="font-display text-4xl font-black text-cash tabular-nums [text-shadow:0.15rem_0.15rem_0_var(--color-night)]">
          {now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>

      <p className="relative z-20 max-w-xs rounded-xl bg-night/80 px-4 py-2 text-sm text-ink-dim">
        {PICKUP.hint(PICKUP.by[shown.kind])}
      </p>
      <Button size="lg" onClick={onClose} className="relative z-20">
        {PICKUP.done}
      </Button>
    </div>
  )
}

/** The receipts still waiting for Hämta at one counter, each with its own button. */
export function ToCollect({
  receipts,
  kind,
  onClaim,
  markers,
}: {
  receipts: readonly PurchaseRow[]
  kind: 'physical' | 'box'
  onClaim: (p: PurchaseRow) => void
  /** Butik only: every unclaimed marker as one row on top, claimed all at once from Mr Green. */
  markers?: { count: number; onClaim: () => void }
}) {
  const { shopItems, boxPrizes } = useGuest()
  const markerCount = markers?.count ?? 0
  if (receipts.length === 0 && markerCount === 0) return null
  const mixed = markerCount > 0 && receipts.length > 0
  const markerImage = shopItems?.find((i) => i.kind === 'marker')?.image ?? ''
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-plate/15 p-4 ring-2 ring-plate ring-inset">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-3xl leading-none font-black text-plate uppercase">{PICKUP.title}</h2>
        <p className="text-sm">
          {mixed ? PICKUP.warningMixed : PICKUP.warning(PICKUP.at[markerCount > 0 ? 'marker' : kind])}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {markers && markerCount > 0 && (
          <li className="flex items-center gap-3 rounded-xl bg-night/50 p-2 pr-3">
            <ShopImage image={markerImage} name={MARKER.title} className="size-12 shrink-0 rounded-lg object-contain! text-2xl" />
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate font-bold">{PICKUP.markers(markerCount)}</span>
              <span className="text-xs text-ink-dim">{PICKUP.where(PICKUP.at.marker)}</span>
            </div>
            <Button onClick={markers.onClaim} className="min-h-12! px-5! text-xl!">
              {PICKUP.claim}
            </Button>
          </li>
        )}
        {receipts.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-xl bg-night/50 p-2 pr-3"
            style={p.prize_rarity ? { boxShadow: `inset 3px 0 0 ${RARITY_COLOR[p.prize_rarity]}` } : undefined}
          >
            <ShopImage
              image={receiptImage(p, shopItems, boxPrizes)}
              name={p.prize_name ?? p.item_name}
              rarity={p.prize_rarity ?? undefined}
              className="size-12 shrink-0 rounded-lg text-2xl"
            />
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate font-bold">{p.prize_name ?? p.item_name}</span>
              <span className="text-xs text-ink-dim tabular-nums">
                {mixed ? `${PICKUP.where(PICKUP.at[kind])} · ${clock(p.created_at)}` : clock(p.created_at)}
              </span>
            </div>
            <Button onClick={() => onClaim(p)} className="min-h-12! px-5! text-xl!">
              {PICKUP.claim}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** "Mina köp" / "Mina vinster": every receipt with its Hämtad / Ej hämtad tag. */
export function Receipts({
  title,
  empty,
  totalLabel,
  purchases,
}: {
  title: string
  empty: string
  totalLabel: string
  purchases: readonly PurchaseRow[] | undefined
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-tote/40 p-4 ring-1 ring-white/10 ring-inset">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="font-display text-2xl leading-none font-black uppercase">{title}</h2>
        <span className="flex-1" />
        {!!purchases?.length && (
          <span className="font-display text-lg font-black text-plate tabular-nums">
            {totalLabel} {fmtRm(purchaseTotal(purchases))}
          </span>
        )}
      </div>
      {!purchases && <p className="text-sm text-ink-dim">{UI_LABELS.loading}</p>}
      {purchases && purchases.length === 0 && <p className="text-sm text-ink-dim">{empty}</p>}
      <ul className="flex flex-col gap-1.5">
        {purchases?.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-lg bg-tote/50 px-3 py-2 ring-1 ring-white/5 ring-inset"
            style={p.prize_rarity ? { boxShadow: `inset 3px 0 0 ${RARITY_COLOR[p.prize_rarity]}` } : undefined}
          >
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate font-bold">{receiptName(p)}</span>
              <span className="flex items-center gap-2 text-xs text-ink-dim tabular-nums">
                {clock(p.created_at)}
                {needsPickup(p) && (
                  <span
                    className={cx(
                      'rounded-full px-2 py-0.5 text-[0.65rem] font-black tracking-wide uppercase',
                      p.claimed_at ? 'bg-void text-ink-dim' : 'bg-plate text-night',
                    )}
                  >
                    {p.claimed_at ? PICKUP.claimed(clock(p.claimed_at)) : PICKUP.unclaimed}
                  </span>
                )}
              </span>
            </div>
            <span className="shrink-0 font-display text-lg font-black text-ink-dim tabular-nums">{fmtRm(p.price)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}
