// The Vinstkort half of /gm/kuponger: mint a reusable card, reprint it, pause it, give it a new code
// when a photo of it gets around, and the night's payouts with Ångra. Kuponger above it are untouched.
//
// The print sheet is handed up to CouponsPage: this section lives inside the page's print:hidden
// wrapper, so a sheet rendered here would print as a blank page.
import { useState } from 'react'
import { usePrizeCards, usePrizeClaims } from '../../lib/hooks'
import type { PlayerRow, PrizeCardRow, PrizeClaimRow } from '../../lib/types'
import { GM_PRIZE_CARDS } from '../../shared/content/gm'
import { PRIZE_CARD_TIER_COPY } from '../../shared/content/coupons'
import { PRIZE_CARD_TIERS } from '../../shared/game/economy'
import { badgedLabel, fmtRm } from '../../shared/game/format'
import { Button, cx, Modal, toast } from '../../ui'
import { useGmAction } from '../gmAuth'
import { Field, TextInput } from '../control/form'
import type { PrizeSheet } from './PrizeCardSheet'
import { cardTotals, repeatCounts } from './prizeCards'

type Confirm = { kind: 'rotate' | 'delete'; card: PrizeCardRow }

export function PrizeCardsSection({
  players,
  onPrint,
}: {
  players: ReadonlyMap<string, PlayerRow>
  /** Opens the print sheet, which CouponsPage renders outside its print:hidden wrapper. */
  onPrint: (sheet: PrizeSheet) => void
}) {
  const { data: cards } = usePrizeCards()
  const { data: claims } = usePrizeClaims()
  const { run, busy } = useGmAction()

  const [tier, setTier] = useState<number>(PRIZE_CARD_TIERS[PRIZE_CARD_TIERS.length - 1].tier)
  const [label, setLabel] = useState('')
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const totals = claims ? cardTotals(claims) : new Map()
  const repeats = claims ? repeatCounts(claims) : new Map<string, number>()
  const amountOf = (t: number) => PRIZE_CARD_TIERS.find((x) => x.tier === t)?.amount ?? 0

  const create = async () => {
    const made = await run((gm, pw) => gm.createPrizeCard(pw, tier, label.trim()))
    if (!made) return
    toast({ text: GM_PRIZE_CARDS.created })
    onPrint({ code: made.code, tier, amount: amountOf(tier), label: label.trim() })
    setLabel('')
  }

  const reprint = async (card: PrizeCardRow) => {
    const got = await run((gm, pw) => gm.prizeCardCode(pw, card.id))
    if (!got) return
    onPrint({ code: got.code, tier: card.tier, amount: card.amount, label: card.label })
  }

  const toggle = async (card: PrizeCardRow) => {
    const next = await run((gm, pw) => gm.setPrizeCardActive(pw, card.id, !card.active))
    if (!next) return
    toast({ text: next.active ? GM_PRIZE_CARDS.resumedToast : GM_PRIZE_CARDS.pausedToast })
  }

  const confirmed = async () => {
    if (!confirm) return
    const { kind, card } = confirm
    if (kind === 'rotate') {
      const got = await run((gm, pw) => gm.rotatePrizeCard(pw, card.id))
      if (!got) return
      toast({ text: GM_PRIZE_CARDS.rotated })
      onPrint({ code: got.code, tier: card.tier, amount: card.amount, label: card.label })
    } else {
      if (!(await run(async (gm, pw) => (await gm.deletePrizeCard(pw, card.id), true)))) return
      toast({ text: GM_PRIZE_CARDS.deleted })
    }
    setConfirm(null)
  }

  const undo = async (c: PrizeClaimRow) => {
    if (!(await run((gm, pw) => gm.voidPrizeClaim(pw, c.id)))) return
    toast({ text: GM_PRIZE_CARDS.undone(fmtRm(c.amount)) })
  }

  return (
    <>
      <section className="flex flex-col gap-4 border-t-4 border-sleaze/60 pt-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-3xl font-black text-plate uppercase">{GM_PRIZE_CARDS.title}</h2>
          <p className="text-sm text-ink-dim">{GM_PRIZE_CARDS.subtitle}</p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-tote/40 p-4 ring-1 ring-white/10 ring-inset">
          <h3 className="font-display text-2xl font-black uppercase">{GM_PRIZE_CARDS.createTitle}</h3>
          <Field label={GM_PRIZE_CARDS.tierLabel}>
            <div className="flex gap-2">
              {PRIZE_CARD_TIERS.map((t) => (
                <button
                  key={t.tier}
                  type="button"
                  aria-pressed={tier === t.tier}
                  onClick={() => setTier(t.tier)}
                  className={cx(
                    'flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl font-display font-extrabold uppercase',
                    tier === t.tier ? 'bg-plate text-night' : 'bg-tote/60 text-ink-dim ring-2 ring-tote-hi/60 ring-inset',
                  )}
                >
                  <span className="text-xl leading-none">{PRIZE_CARD_TIER_COPY[t.tier].short}</span>
                  <span className="text-sm leading-none tabular-nums">{fmtRm(t.amount)}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label={GM_PRIZE_CARDS.labelLabel} hint={GM_PRIZE_CARDS.labelHint}>
            <TextInput value={label} maxLength={24} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Button loading={busy} onClick={() => void create()}>
            {GM_PRIZE_CARDS.create}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-2xl font-black uppercase">{GM_PRIZE_CARDS.cardsTitle}</h3>
          {cards && cards.length === 0 && <p className="text-ink-dim">{GM_PRIZE_CARDS.cardsEmpty}</p>}
          <ul className="flex flex-col gap-2">
            {(cards ?? []).map((card) => {
              const t = totals.get(card.id)
              return (
                <li
                  key={card.id}
                  className={cx(
                    'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-tote/60 px-4 py-3 ring-1 ring-white/10 ring-inset',
                    !card.active && 'opacity-60',
                  )}
                >
                  <span className="font-display text-xl font-black text-plate uppercase">
                    {PRIZE_CARD_TIER_COPY[card.tier as 1 | 2 | 3]?.name}
                  </span>
                  <span className="font-display text-xl font-black tabular-nums">{fmtRm(card.amount)}</span>
                  <span className="rounded-full bg-void px-3 py-0.5 text-sm font-bold uppercase">
                    {card.label || GM_PRIZE_CARDS.noLabel}
                  </span>
                  <span className="text-sm text-ink-dim tabular-nums">
                    {GM_PRIZE_CARDS.claims(t?.count ?? 0, fmtRm(t?.rm ?? 0))}
                  </span>
                  {!card.active && (
                    <span className="rounded-full bg-drift px-3 py-0.5 text-sm font-bold text-ink uppercase">
                      {GM_PRIZE_CARDS.paused}
                    </span>
                  )}
                  <span className="flex-1" />
                  <Button variant="ghost" disabled={busy} onClick={() => void toggle(card)}>
                    {card.active ? GM_PRIZE_CARDS.pause : GM_PRIZE_CARDS.resume}
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={() => void reprint(card)}>
                    {GM_PRIZE_CARDS.reprint}
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={() => setConfirm({ kind: 'rotate', card })}>
                    {GM_PRIZE_CARDS.rotate}
                  </Button>
                  <Button variant="danger" disabled={busy} onClick={() => setConfirm({ kind: 'delete', card })}>
                    {GM_PRIZE_CARDS.delete}
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-2xl font-black uppercase">{GM_PRIZE_CARDS.feedTitle}</h3>
          {claims && claims.length === 0 && <p className="text-ink-dim">{GM_PRIZE_CARDS.feedEmpty}</p>}
          <ul className="flex flex-col gap-2">
            {(claims ?? []).map((c) => {
              const player = players.get(c.player_id)
              const nth = repeats.get(c.id) ?? 1
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-tote/60 px-4 py-3 ring-1 ring-white/10 ring-inset"
                >
                  <span className="font-display text-xl font-black uppercase">
                    {player ? badgedLabel(player) : GM_PRIZE_CARDS.someone}
                  </span>
                  <span className="font-display text-xl font-black text-cash tabular-nums">{fmtRm(c.amount)}</span>
                  {c.label && <span className="rounded-full bg-void px-3 py-0.5 text-sm font-bold uppercase">{c.label}</span>}
                  {nth > 1 && (
                    <span className="rounded-full bg-sleaze px-3 py-0.5 text-sm font-bold text-sleaze-ink">
                      {GM_PRIZE_CARDS.repeat(nth)}
                    </span>
                  )}
                  <span className="text-sm text-ink-dim tabular-nums">
                    {new Date(c.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flex-1" />
                  <Button variant="ghost" disabled={busy} onClick={() => void undo(c)}>
                    {GM_PRIZE_CARDS.undo}
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        dismissible={!busy}
        tone="danger"
        title={confirm?.kind === 'rotate' ? GM_PRIZE_CARDS.rotateConfirmTitle : GM_PRIZE_CARDS.deleteConfirmTitle}
        actions={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>
              {GM_PRIZE_CARDS.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void confirmed()}>
              {confirm?.kind === 'rotate' ? GM_PRIZE_CARDS.rotateConfirmOk : GM_PRIZE_CARDS.deleteConfirmOk}
            </Button>
          </>
        }
      >
        <p>{confirm?.kind === 'rotate' ? GM_PRIZE_CARDS.rotateConfirmText : GM_PRIZE_CARDS.deleteConfirmText}</p>
      </Modal>
    </>
  )
}
