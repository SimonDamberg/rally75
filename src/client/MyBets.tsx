// "Mina spel": totals for the night and every bet, grouped per race.
import { useRaces } from '../lib/hooks'
import { MY_BETS } from '../shared/content/client'
import { EMPTY_BETS } from '../shared/content/parody'
import { STATUS_LABELS, UI_LABELS } from '../shared/content/ui'
import { fmtRm } from '../shared/game/format'
import { cx, SmallPrint } from '../ui'
import { BetLine } from './BetLine'
import { useGuest } from './guest'
import { groupByRace, totals } from './outcome'

export function MyBets() {
  const { bets } = useGuest()
  const { data: races } = useRaces()

  if (!bets) return <p className="p-6 text-center text-ink-dim">{UI_LABELS.loading}</p>

  const sum = totals(bets)
  const groups = groupByRace(bets, races ?? [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      <h1 className="px-1 font-display text-4xl leading-none font-black text-plate uppercase">{MY_BETS.title}</h1>

      <dl className="grid grid-cols-3 gap-2">
        {[
          [MY_BETS.staked, fmtRm(sum.staked), 'text-ink'],
          [MY_BETS.paid, fmtRm(sum.paid), 'text-ink'],
          [MY_BETS.net, `${sum.net > 0 ? '+' : ''}${fmtRm(sum.net)}`, sum.net >= 0 ? 'text-cash' : 'text-drift'],
        ].map(([k, v, tone]) => (
          <div key={k} className="flex min-w-0 flex-col gap-1 rounded-xl bg-tote/50 px-3 py-2.5 ring-1 ring-white/10 ring-inset">
            <dt className="text-[0.65rem] font-bold tracking-[0.14em] text-ink-dim uppercase">{k}</dt>
            <dd className={cx('truncate font-display text-xl leading-none font-black tabular-nums', tone)}>{v}</dd>
          </div>
        ))}
      </dl>

      {groups.length === 0 && <p className="px-1 py-6 text-center text-ink-dim">{EMPTY_BETS}</p>}

      {groups.map((g) => {
        const race = g.race
        const t = totals(g.bets)
        return (
          <section key={g.raceId} className="theme-rally75 flex flex-col gap-1.5 rounded-2xl bg-night p-2.5 ring-1 ring-tote-hi/25">
            <h2 className="flex items-baseline gap-2 px-1">
              <span className="font-display text-2xl leading-none font-black uppercase">
                {race ? MY_BETS.race(race.race_no) : MY_BETS.unknownRace}
              </span>
              {race && <span className="text-xs font-bold tracking-[0.1em] text-ink-dim uppercase">{STATUS_LABELS[race.status].title}</span>}
              <span className="flex-1" />
              <span className={cx('text-sm font-bold tabular-nums', t.net >= 0 ? 'text-cash' : 'text-ink-dim')}>
                {t.net > 0 ? '+' : ''}
                {fmtRm(t.net)}
              </span>
            </h2>
            <ul className="flex flex-col gap-1.5">
              {g.bets.map((b) => (
                <BetLine key={b.id} bet={b} horse={race?.field.find((h) => h.n === b.horse_n)} />
              ))}
            </ul>
          </section>
        )
      })}
      <SmallPrint className="mt-auto" />
    </div>
  )
}
