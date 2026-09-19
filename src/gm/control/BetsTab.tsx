// Live bets on the control phone: money per horse, current odds, what the house pays if each horse
// wins, and the feed underneath. Stacked in one column, since the iPad no longer runs this panel.
import { useRaceBets } from '../../lib/hooks'
import type { PlayerRow, PlinkoDropRow, RaceRow } from '../../lib/types'
import { GM_BETS } from '../../shared/content/gm'
import { UI_LABELS } from '../../shared/content/ui'
import { fmtOdds, fmtRm, playerLabel } from '../../shared/game/format'
import { cx, OddsValue, SilkBadge, StatusBanner } from '../../ui'
import { summarizeBook } from '../book'
import { PlinkoCard } from './PlinkoCard'

const FEED_MAX = 40

export function BetsTab({
  race,
  players,
  plinko,
}: {
  race: RaceRow | null | undefined
  players: ReadonlyMap<string, PlayerRow>
  plinko: readonly PlinkoDropRow[] | undefined
}) {
  return (
    <>
      {race ? <RaceBets race={race} players={players} /> : <p className="p-6 text-ink-dim">{GM_BETS.noRace}</p>}
      <div className="px-4 pb-4">
        <PlinkoCard drops={plinko} />
      </div>
    </>
  )
}

function RaceBets({ race, players }: { race: RaceRow; players: ReadonlyMap<string, PlayerRow> }) {
  const { data: bets } = useRaceBets(race.id)
  const book = summarizeBook(race.field, bets ?? [])
  const feed = (bets ?? []).slice(-FEED_MAX).reverse()
  const label = (id: string) => {
    const p = players.get(id)
    return p ? playerLabel(p.name, p.tag) : GM_BETS.unknownPlayer
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <StatusBanner status={race.status} raceNo={race.race_no} />

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-xl font-black text-ink uppercase">{GM_BETS.pot}</h2>
        <span className="font-display text-4xl font-black text-plate tabular-nums">{fmtRm(book.totalStake)}</span>
        <span className="text-sm text-ink-dim">{GM_BETS.count(book.count)}</span>
      </div>

      <ul className="flex flex-col gap-2">
        {race.field.map((h, i) => {
          const hb = book.horses[i]
          return (
            <li
              key={h.n}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl border-l-6 bg-tote/60 px-3 py-2 ring-1 ring-white/10 ring-inset"
              style={{ borderLeftColor: h.silk.edge }}
            >
              <SilkBadge n={h.n} silk={h.silk} size="sm" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate leading-tight font-extrabold [font-stretch:82%]">{h.name}</span>
                <span className="flex flex-wrap gap-x-3 text-xs text-ink-dim">
                  <span>
                    {UI_LABELS.pool} <b className="text-ink tabular-nums">{fmtRm(hb.pool)}</b>
                  </span>
                  <span>{GM_BETS.count(hb.count)}</span>
                  <span>
                    {GM_BETS.ifWins}{' '}
                    <b className={cx('tabular-nums', hb.houseIfWins >= 0 ? 'text-cash' : 'text-drift')}>
                      {hb.houseIfWins > 0 ? '+' : ''}
                      {fmtRm(hb.houseIfWins)}
                    </b>
                  </span>
                </span>
              </div>
              <OddsValue value={hb.odds} size="sm" />
            </li>
          )
        })}
      </ul>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold tracking-[0.14em] text-ink-dim uppercase">{GM_BETS.feed}</h2>
        {bets && feed.length === 0 && <p className="text-sm text-ink-dim">{GM_BETS.empty}</p>}
        <ul className="flex flex-col gap-1.5">
          {feed.map((b) => {
            const h = race.field.find((x) => x.n === b.horse_n)
            return (
              <li key={b.id} className="flex animate-pop-in items-center gap-3 rounded-lg bg-tote/50 px-3 py-1.5">
                {h && <SilkBadge n={h.n} silk={h.silk} size="sm" />}
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{label(b.player_id)}</span>
                <span className="flex flex-col items-end leading-tight">
                  <b className="text-sm tabular-nums">{fmtRm(b.stake)}</b>
                  <span className="text-xs text-ink-dim tabular-nums">
                    {UI_LABELS.odds} {fmtOdds(b.odds)}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
