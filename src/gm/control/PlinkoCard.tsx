// Plånko totals for the night on the control phone: balls dropped, RM in, RM out, and what the house
// kept. Read-only; the game needs no controls (the multiplier table is fixed and mirrored in SQL).
import type { PlinkoDropRow } from '../../lib/types'
import { GM_PLINKO } from '../../shared/content/gm'
import { fmtInt, fmtRm } from '../../shared/game/format'
import { dropTotals, fmtMult } from '../../shared/game/plinko'
import { cx } from '../../ui'

export function PlinkoCard({ drops }: { drops: readonly PlinkoDropRow[] | undefined }) {
  const t = dropTotals(drops ?? [])
  const house = -t.net
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-tote/60 p-3 ring-1 ring-white/10 ring-inset">
      <h2 className="font-display text-xl font-black text-ink uppercase">{GM_PLINKO.title}</h2>
      {t.count === 0 ? (
        <p className="text-sm text-ink-dim">{GM_PLINKO.empty}</p>
      ) : (
        <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
          <Stat label={GM_PLINKO.drops} value={fmtInt(t.count)} />
          <Stat label={GM_PLINKO.staked} value={fmtRm(t.staked)} />
          <Stat label={GM_PLINKO.paid} value={fmtRm(t.paid)} />
          <Stat
            label={GM_PLINKO.house}
            value={`${house > 0 ? '+' : ''}${fmtRm(house)}`}
            className={house >= 0 ? 'text-cash' : 'text-drift'}
          />
          <Stat label={GM_PLINKO.best} value={fmtMult(t.bestM10)} className="text-plate" />
        </dl>
      )}
    </section>
  )
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[0.65rem] font-bold tracking-[0.14em] text-ink-dim uppercase">{label}</dt>
      <dd className={cx('font-display text-xl leading-tight font-black tabular-nums', className)}>{value}</dd>
    </div>
  )
}
