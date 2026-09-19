// "Plånko": Mr Green's own Plinko, in its own neon-violet inset panel (theme-plinko) the way the
// race sits in a Rally75-blue one. One tap drops one ball: the server draws the path and pays
// before the ball even appears, so the phone only animates a known result. While balls fall the
// header shows the balance with their payouts held back (heldBalance), so the money lands with the
// ball rather than a second earlier through Realtime.
import { useEffect, useState } from 'react'
import { usePlayerPlinkoDrops } from '../lib/hooks'
import type { PlinkoDropRow } from '../lib/types'
import { PLINKO } from '../shared/content/client'
import { UI_LABELS } from '../shared/content/ui'
import { fmtRm } from '../shared/game/format'
import {
  checkDrop,
  dropTotals,
  fmtMult,
  PLINKO_BIG_M10,
  PLINKO_CHIPS,
  PLINKO_MAX_STAKE,
} from '../shared/game/plinko'
import { Button, cx, SmallPrint, toast } from '../ui'
import { CoinBurst } from './CoinBurst'
import { heldBalance } from './drop'
import { useGuest, useGuestAction } from './guest'
import { PlinkoBoard } from './PlinkoBoard'

/** More balls than this in the air at once and the button waits. */
const MAX_FALLING = 8
const BURST_MS = 4200
/** A 100x hit gets the big rain. */
const HUGE_M10 = 1000

export interface PlinkoProps {
  /** The header balance while balls fall, or undefined to show the live one. */
  onHold: (balance: number | undefined) => void
}

export function Plinko({ onHold }: PlinkoProps) {
  const { identity, player } = useGuest()
  const { data: drops } = usePlayerPlinkoDrops(identity.playerId)
  const { run } = useGuestAction()
  const [stake, setStake] = useState<number>(PLINKO_CHIPS[0])
  const [falling, setFalling] = useState<PlinkoDropRow[]>([])
  const [latest, setLatest] = useState<PlinkoDropRow | undefined>()
  const [flash, setFlash] = useState<{ slot: number; n: number } | null>(null)
  const [last, setLast] = useState<PlinkoDropRow | null>(null)
  const [burst, setBurst] = useState<{ n: number; big: boolean } | null>(null)
  // Between the tap and the reply the drop row is not here yet, but Realtime may already have
  // brought the paid-out balance. Hold the shown balance minus the stake until the row arrives.
  const [preHold, setPreHold] = useState<number | undefined>()
  // Drops this tab may show: everything there when it opened, plus each ball once it lands. The
  // Realtime INSERT can beat the RPC reply, so "not falling" alone would spoil a fresh result.
  const [shownIds, setShownIds] = useState<ReadonlySet<string> | null>(null)
  if (drops && shownIds === null) setShownIds(new Set(drops.map((d) => d.id)))

  const hold = heldBalance(latest, falling) ?? preHold
  useEffect(() => {
    onHold(hold)
  }, [hold, onHold])
  // Leaving the tab cancels the animations, so the header must stop holding too.
  useEffect(() => () => onHold(undefined), [onHold])

  useEffect(() => {
    if (!burst) return
    const t = setTimeout(() => setBurst(null), BURST_MS)
    return () => clearTimeout(t)
  }, [burst])

  if (!player) return <p className="p-6 text-center text-ink-dim">{UI_LABELS.loading}</p>

  const problem = checkDrop(stake, player.balance)
  const full = falling.length >= MAX_FALLING

  const drop = async () => {
    setPreHold((hold ?? player.balance) - stake)
    const row = await run((api, id) => api.plinkoDrop(id, stake))
    setPreHold(undefined)
    if (!row) return
    setLatest((prev) => (!prev || row.created_at >= prev.created_at ? row : prev))
    setFalling((f) => [...f, row])
  }

  const land = (row: PlinkoDropRow) => {
    setFalling((f) => f.filter((d) => d.id !== row.id))
    setShownIds((ids) => new Set(ids).add(row.id))
    setFlash((prev) => ({ slot: row.slot, n: (prev?.n ?? 0) + 1 }))
    setLast(row)
    if (row.m10 >= PLINKO_BIG_M10) {
      setBurst((prev) => ({ n: (prev?.n ?? 0) + 1, big: row.m10 >= HUGE_M10 }))
      toast({ text: PLINKO.bigHit(fmtMult(row.m10), fmtRm(row.payout)), tone: 'win' })
    }
  }

  // History and totals leave out balls still in the air, or the list would spoil the fall.
  const landed = (drops ?? []).filter((d) => shownIds?.has(d.id))
  const totals = dropTotals(landed)

  return (
    <div className="flex flex-1 flex-col">
      <section className="theme-plinko m-3 flex flex-col gap-3 rounded-2xl bg-night p-3 shadow-[0_0.25rem_1.5rem_rgb(0_0_0/0.35)] ring-1 ring-tote-hi/30">
        <div className="flex items-baseline justify-between gap-2 border-b border-white/10 pb-2">
          <h1 className="font-display text-3xl leading-none font-black tracking-wide text-sleaze uppercase italic drop-shadow-[0_0_0.6rem_var(--color-sleaze)]">
            {PLINKO.title}
          </h1>
          <span className="font-display text-[0.6rem] font-bold tracking-[0.2em] text-ink-dim uppercase">
            {PLINKO.partner}
          </span>
        </div>
        <p className="px-1 text-sm text-ink-dim">{PLINKO.tagline}</p>

        <div className="rounded-xl bg-night-deep/70 px-1 pt-2 pb-1 ring-1 ring-white/5">
          <PlinkoBoard falling={falling} onLand={land} flash={flash} />
        </div>

        <div className="flex min-h-7 items-center justify-center text-center font-display text-xl font-black tabular-nums">
          {falling.length > 0 ? (
            <span className="text-ink-dim">{PLINKO.inFlight(falling.length)}</span>
          ) : last ? (
            <span key={last.id} className={cx('animate-pop-in', last.payout >= last.stake ? 'text-cash' : 'text-drift')}>
              {PLINKO.hit(fmtMult(last.m10), fmtRm(last.payout))}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <span className="px-1 text-[0.65rem] font-bold tracking-[0.16em] text-ink-dim uppercase">{PLINKO.stake}</span>
          <div className="grid grid-cols-5 gap-2">
            {PLINKO_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={stake === c}
                onClick={() => setStake(c)}
                className={cx(
                  'min-h-12 rounded-full font-display text-xl font-black tabular-nums ring-2 ring-inset active:translate-y-0.5',
                  stake === c ? 'bg-sleaze text-sleaze-ink ring-sleaze' : 'bg-tote text-ink ring-tote-hi',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          block
          disabled={!!problem || full}
          onClick={() => void drop()}
        >
          {problem === 'insufficient'
            ? PLINKO.tooPoor
            : problem === 'too_high'
              ? PLINKO.tooHigh(fmtRm(PLINKO_MAX_STAKE))
              : PLINKO.drop(fmtRm(stake))}
        </Button>

        <div className="flex flex-col gap-2">
          <span className="px-1 text-[0.65rem] font-bold tracking-[0.16em] text-ink-dim uppercase">{PLINKO.lastDrops}</span>
          {landed.length === 0 ? (
            <p className="px-1 text-sm text-ink-dim">{PLINKO.noDrops}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {landed.slice(0, 16).map((d) => (
                <span
                  key={d.id}
                  className={cx(
                    'rounded-full px-2 py-0.5 font-display text-sm font-black tabular-nums',
                    d.m10 >= PLINKO_BIG_M10
                      ? 'bg-plate text-night'
                      : d.payout >= d.stake
                        ? 'bg-cash/15 text-cash'
                        : 'bg-drift/15 text-drift',
                  )}
                >
                  {fmtMult(d.m10)}
                </span>
              ))}
            </div>
          )}
        </div>

        {totals.count > 0 && (
          <dl className="grid grid-cols-3 gap-2 rounded-xl bg-tote/40 p-2 text-center">
            <Stat label={PLINKO.staked} value={fmtRm(totals.staked)} />
            <Stat label={PLINKO.paid} value={fmtRm(totals.paid)} />
            <Stat
              label={PLINKO.net}
              value={fmtRm(totals.net)}
              className={totals.net >= 0 ? 'text-cash' : 'text-drift'}
            />
          </dl>
        )}
        <p className="px-1 text-xs text-ink-dim">{PLINKO.smallPrint}</p>
      </section>

      <SmallPrint className="mt-auto" />
      {burst && <CoinBurst key={burst.n} big={burst.big} />}
    </div>
  )
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.6rem] font-bold tracking-[0.14em] text-ink-dim uppercase">{label}</dt>
      <dd className={cx('font-display text-lg leading-none font-black tabular-nums', className)}>{value}</dd>
    </div>
  )
}
