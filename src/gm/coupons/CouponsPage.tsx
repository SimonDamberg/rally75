// /gm/kuponger: the third GM surface, behind the same password as the phone and the iPad.
//
// Opened on a laptop next to a printer, not on a phone, because its job is A4 output: mint a print
// run, print the sheet, and later see which tickets have been cashed in. It is not a tab on the
// control phone on purpose, since five tabs is already tight at 390 px.
import { useState } from 'react'
import { useCoupons, useLeaderboard } from '../../lib/hooks'
import type { CouponRow, PlayerRow } from '../../lib/types'
import { GM_COUPONS } from '../../shared/content/gm'
import { COUPON_TIER_COPY } from '../../shared/content/coupons'
import { COUPON_TIERS } from '../../shared/game/economy'
import { badgedLabel, fmtRm } from '../../shared/game/format'
import { Button, cx, Logo, Modal, toast } from '../../ui'
import { useGmAction } from '../gmAuth'
import { parseCount } from '../parse'
import { Field, TextInput } from '../control/form'
import { batchSummaries, claims, type BatchSummary } from './batches'
import { PrizeCardsSection } from './PrizeCardsSection'
import { TicketSheet, type SheetCoupon } from './TicketSheet'

/** What the sheet overlay needs to render, captured when a run is minted or reprinted. */
interface Sheet {
  coupons: SheetCoupon[]
  tier: number
  amount: number
  label: string
  base: string
}

/** A QR pointing at a dev server is useless on paper, so say so before the ink is spent. */
function looksLocal(base: string): boolean {
  return /localhost|127\.0\.0\.1|^http:/i.test(base)
}

export function CouponsPage() {
  const { data: coupons } = useCoupons()
  const { data: board } = useLeaderboard()
  const { run, busy } = useGmAction()

  const [tier, setTier] = useState<number>(COUPON_TIERS[COUPON_TIERS.length - 1].tier)
  const [count, setCount] = useState('12')
  const [label, setLabel] = useState('')
  const [base, setBase] = useState(() => window.location.origin)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [deleting, setDeleting] = useState<BatchSummary | null>(null)

  const parsedCount = parseCount(count)
  const amount = COUPON_TIERS.find((t) => t.tier === tier)?.amount ?? COUPON_TIERS[0].amount
  const players = new Map((board?.players ?? []).map((p) => [p.id, p]))
  const batches = coupons ? batchSummaries(coupons) : []
  const feed = coupons ? claims(coupons) : []

  const create = async () => {
    if (parsedCount === null) return
    const made = await run((gm, pw) => gm.createCoupons(pw, tier, amount, label.trim(), parsedCount))
    if (!made) return
    toast({ text: GM_COUPONS.created(made.coupons.length) })
    setSheet({ coupons: made.coupons, tier, amount, label: label.trim(), base: base.trim() })
  }

  const reprint = async (b: BatchSummary) => {
    const got = await run((gm, pw) => gm.batchCodes(pw, b.batch))
    if (!got) return
    setSheet({ coupons: got.coupons, tier: b.tier, amount: b.amount, label: b.label, base: base.trim() })
  }

  const remove = async () => {
    if (!deleting) return
    const n = await run((gm, pw) => gm.deleteCouponBatch(pw, deleting.batch))
    if (n === undefined) return
    toast({ text: GM_COUPONS.deleted(n) })
    setDeleting(null)
  }

  const undo = async (c: CouponRow) => {
    if (!(await run((gm, pw) => gm.voidClaim(pw, c.id)))) return
    toast({ text: GM_COUPONS.undone(fmtRm(c.amount)) })
  }

  return (
    <>
      <div className="mx-auto flex max-w-5xl flex-col gap-5 p-5 print:hidden">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Logo size="sm" />
          <h1 className="font-display text-3xl font-black text-plate uppercase">{GM_COUPONS.title}</h1>
          <p className="min-w-0 flex-1 text-sm text-ink-dim">{GM_COUPONS.subtitle}</p>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl bg-tote/40 p-4 ring-1 ring-white/10 ring-inset">
          <h2 className="font-display text-2xl font-black uppercase">{GM_COUPONS.createTitle}</h2>

          <Field label={GM_COUPONS.tierLabel}>
            <div className="flex gap-2">
              {COUPON_TIERS.map((t) => (
                <button
                  key={t.tier}
                  type="button"
                  aria-pressed={tier === t.tier}
                  onClick={() => setTier(t.tier)}
                  className={cx(
                    'flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl font-display font-extrabold uppercase',
                    tier === t.tier
                      ? 'bg-plate text-night'
                      : 'bg-tote/60 text-ink-dim ring-2 ring-tote-hi/60 ring-inset',
                  )}
                >
                  <span className="text-xl leading-none">{COUPON_TIER_COPY[t.tier].short}</span>
                  <span className="text-sm leading-none tabular-nums">{fmtRm(t.amount)}</span>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={GM_COUPONS.countLabel} hint={parsedCount === null ? GM_COUPONS.countError : GM_COUPONS.countHint}>
              <TextInput
                inputMode="numeric"
                aria-invalid={parsedCount === null || undefined}
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </Field>
            <Field label={GM_COUPONS.labelLabel} hint={GM_COUPONS.labelHint}>
              <TextInput value={label} maxLength={24} onChange={(e) => setLabel(e.target.value)} />
            </Field>
          </div>

          <Field
            label={GM_COUPONS.baseLabel}
            hint={
              looksLocal(base) ? (
                <span className="text-drift">{GM_COUPONS.baseWarning}</span>
              ) : (
                GM_COUPONS.baseHint
              )
            }
          >
            <TextInput value={base} onChange={(e) => setBase(e.target.value)} />
          </Field>

          <Button loading={busy} disabled={parsedCount === null} onClick={() => void create()}>
            {GM_COUPONS.create}
          </Button>
        </section>

        <section className="flex flex-col gap-3 border-t border-white/10 pt-4">
          <h2 className="font-display text-2xl font-black uppercase">{GM_COUPONS.batchesTitle}</h2>
          {coupons && batches.length === 0 && <p className="text-ink-dim">{GM_COUPONS.batchesEmpty}</p>}
          <ul className="flex flex-col gap-2">
            {batches.map((b) => (
              <li
                key={b.batch}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-tote/60 px-4 py-3 ring-1 ring-white/10 ring-inset"
              >
                <span className="font-display text-xl font-black text-plate uppercase">
                  {COUPON_TIER_COPY[b.tier as 1 | 2 | 3]?.name}
                </span>
                <span className="font-display text-xl font-black tabular-nums">{fmtRm(b.amount)}</span>
                <span className="rounded-full bg-void px-3 py-0.5 text-sm font-bold uppercase">
                  {b.label || GM_COUPONS.batchNoLabel}
                </span>
                <span className="text-sm text-ink-dim tabular-nums">{GM_COUPONS.batchCount(b.total, b.redeemed)}</span>
                <span className={cx('text-sm font-bold tabular-nums', b.left > 0 ? 'text-cash' : 'text-ink-dim')}>
                  {GM_COUPONS.batchLeft(b.left)}
                </span>
                <span className="flex-1" />
                <Button variant="ghost" disabled={busy} onClick={() => void reprint(b)}>
                  {GM_COUPONS.reprint}
                </Button>
                <Button variant="danger" disabled={busy} onClick={() => setDeleting(b)}>
                  {GM_COUPONS.deleteBatch}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3 border-t border-white/10 pt-4">
          <h2 className="font-display text-2xl font-black uppercase">{GM_COUPONS.claimsTitle}</h2>
          {coupons && feed.length === 0 && <p className="text-ink-dim">{GM_COUPONS.claimsEmpty}</p>}
          <ul className="flex flex-col gap-2">
            {feed.map((c) => (
              <Claim key={c.id} coupon={c} player={c.redeemed_by ? players.get(c.redeemed_by) : undefined} busy={busy} onUndo={() => void undo(c)} />
            ))}
          </ul>
        </section>

        <PrizeCardsSection players={players} />
      </div>

      {sheet && (
        <TicketSheet
          coupons={sheet.coupons}
          tier={sheet.tier}
          amount={sheet.amount}
          label={sheet.label}
          base={sheet.base}
          onClose={() => setSheet(null)}
        />
      )}

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        dismissible={!busy}
        tone="danger"
        title={GM_COUPONS.deleteConfirmTitle}
        actions={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setDeleting(null)}>
              {GM_COUPONS.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void remove()}>
              {GM_COUPONS.deleteConfirmOk}
            </Button>
          </>
        }
      >
        <p>{GM_COUPONS.deleteConfirmText}</p>
      </Modal>
    </>
  )
}

function Claim({
  coupon,
  player,
  busy,
  onUndo,
}: {
  coupon: CouponRow
  player: PlayerRow | undefined
  busy: boolean
  onUndo: () => void
}) {
  const time = coupon.redeemed_at ? new Date(coupon.redeemed_at) : null
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-tote/60 px-4 py-3 ring-1 ring-white/10 ring-inset">
      <span className="font-display text-xl font-black uppercase">
        {player ? badgedLabel(player) : GM_COUPONS.someone}
      </span>
      <span className="text-sm text-ink-dim uppercase">{COUPON_TIER_COPY[coupon.tier as 1 | 2 | 3]?.name}</span>
      <span className="font-display text-xl font-black text-cash tabular-nums">{fmtRm(coupon.amount)}</span>
      {coupon.label && <span className="rounded-full bg-void px-3 py-0.5 text-sm font-bold uppercase">{coupon.label}</span>}
      <span className="text-sm text-ink-dim tabular-nums">
        {time?.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span className="flex-1" />
      <Button variant="ghost" disabled={busy} onClick={onUndo}>
        {GM_COUPONS.undo}
      </Button>
    </li>
  )
}
