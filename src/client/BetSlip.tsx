// Bet slip pinned to the bottom of the betting view: chips, ALL IN, then a confirm pop-up.
import { useEffect, useRef, useState } from 'react'
import type { RaceRow } from '../lib/types'
import { CONFIRM, SLIP } from '../shared/content/client'
import { UI_LABELS } from '../shared/content/ui'
import { MIN_STAKE } from '../shared/game/economy'
import { fmtOdds, fmtRm } from '../shared/game/format'
import { payoutFor } from '../shared/game/odds'
import type { HorsePublic } from '../shared/game/types'
import { Button, cx, Modal, OddsValue, HorseBadge, toast } from '../ui'
import { useGuestAction } from './guest'
import { addChip, allIn, CHIPS, checkStake, clampStake } from './slip'

export interface BetSlipProps {
  race: RaceRow
  horse: HorsePublic
  /** Current odds for this horse. */
  odds: number
  balance: number
  onClose: () => void
  onConfirmChange: (open: boolean) => void
}

export function BetSlip({ race, horse, odds, balance, onClose, onConfirmChange }: BetSlipProps) {
  const { run, busy } = useGuestAction()
  const [rawStake, setStake] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const stake = clampStake(rawStake, balance)
  const check = checkStake(stake, balance)
  const payout = payoutFor(stake, odds)

  // Tell the shell while the confirm is open (no Snabblån on top of it). The slip unmounts when
  // betting closes; a confirm still open then gets a toast.
  const confirmingRef = useRef(false)
  useEffect(() => {
    confirmingRef.current = confirming
    onConfirmChange(confirming)
  }, [confirming, onConfirmChange])
  useEffect(
    () => () => {
      if (confirmingRef.current) toast({ text: CONFIRM.closedWhileOpen, tone: 'error' })
      onConfirmChange(false)
    },
    [onConfirmChange],
  )

  const place = async () => {
    const bet = await run((api, identity) => api.placeBet(identity, race.id, horse.n, stake))
    // Closing the slip below unmounts it in the same render; this was not a race closing on us.
    confirmingRef.current = false
    setConfirming(false)
    if (!bet) return
    setStake(0)
    onClose()
    toast({ text: CONFIRM.placed(fmtRm(bet.stake), bet.horse_n, fmtOdds(bet.odds)), tone: 'win' })
  }

  const hint = check === 'too_low' ? SLIP.minStake(fmtRm(MIN_STAKE)) : check === 'too_poor' ? SLIP.tooPoor : null

  return (
    <div className="theme-rally75 sticky bottom-0 mt-auto flex flex-col gap-2.5 border-t-2 border-plate bg-night-deep/97 px-3 pt-3 pb-3 shadow-[0_-1rem_2rem_rgb(0_0_0/0.45)]">
      <div className="flex items-center gap-3">
        <HorseBadge horse={horse} size="sm" />
        <span className="min-w-0 flex-1 truncate text-lg font-extrabold [font-stretch:82%]">{horse.name}</span>
        <OddsValue value={odds} size="sm" />
        <button
          type="button"
          onClick={onClose}
          aria-label={SLIP.close}
          className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-xl text-ink-dim active:bg-white/10"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={SLIP.chip(c)}
            disabled={stake >= allIn(balance)}
            onClick={() => setStake(addChip(stake, c, balance))}
            className="min-h-12 rounded-full bg-tote font-display text-xl font-black text-ink tabular-nums ring-2 ring-tote-hi ring-inset active:translate-y-0.5 active:bg-tote-hi disabled:opacity-35"
          >
            {c}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStake(allIn(balance))}
          className="min-h-12 rounded-full bg-sleaze font-display text-sm leading-none font-black text-sleaze-ink uppercase active:translate-y-0.5"
        >
          {SLIP.allIn}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col leading-none">
          <span className="text-[0.65rem] font-bold tracking-[0.16em] text-ink-dim uppercase">{SLIP.stake}</span>
          <span className="mt-1 flex items-baseline gap-2">
            <b className="font-display text-3xl font-black text-plate tabular-nums">{fmtRm(stake)}</b>
            {stake > 0 && (
              <button type="button" onClick={() => setStake(0)} className="text-xs font-bold text-ink-dim underline">
                {SLIP.clear}
              </button>
            )}
          </span>
          <span className={cx('mt-1 truncate text-xs tabular-nums', hint && stake > 0 ? 'text-drift' : 'text-ink-dim')}>
            {hint && stake > 0 ? hint : `${SLIP.potential} ${fmtRm(check === 'ok' ? payout : 0)}`}
          </span>
        </div>
        <Button size="lg" disabled={check !== 'ok'} onClick={() => setConfirming(true)}>
          {SLIP.place}
        </Button>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        dismissible={false}
        title={CONFIRM.title}
        actions={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              {CONFIRM.cancel}
            </Button>
            <Button loading={busy} disabled={check !== 'ok'} onClick={() => void place()}>
              {CONFIRM.ok}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-xl bg-tote/60 p-3">
          <HorseBadge horse={horse} size="md" />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-lg font-extrabold [font-stretch:82%]">{horse.name}</span>
            <span className="truncate text-sm text-plate">
              {UI_LABELS.kusk}: {horse.jockey}
            </span>
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-2">
          <dt className="text-ink-dim">{CONFIRM.stake}</dt>
          <dd className="text-right font-display text-3xl leading-none font-black tabular-nums">{fmtRm(stake)}</dd>
          <dt className="text-ink-dim">{CONFIRM.odds}</dt>
          <dd className="text-right">
            <OddsValue value={odds} size="md" />
          </dd>
          <dt className="text-ink-dim">{CONFIRM.payout}</dt>
          <dd className="text-right font-display text-3xl leading-none font-black text-cash tabular-nums">{fmtRm(payout)}</dd>
        </dl>
        <p className="mt-3 text-xs text-ink-dim">{CONFIRM.lock}</p>
      </Modal>
    </div>
  )
}
