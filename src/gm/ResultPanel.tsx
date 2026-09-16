// Settled race summary: podium, ruling, who got paid and what the house made.
import type { ReactNode } from 'react'
import type { BetRow, PlayerRow, RaceRow } from '../lib/types'
import { GM_BETS, GM_RACE } from '../shared/content/gm'
import { UI_LABELS } from '../shared/content/ui'
import { fmtRm, playerLabel } from '../shared/game/format'
import { cx, SilkBadge } from '../ui'
import { settle } from './book'

export interface ResultPanelProps {
  race: RaceRow
  bets: readonly BetRow[] | undefined
  players: ReadonlyMap<string, PlayerRow>
  actions?: ReactNode
  /** tv: the display iPad, read across the room. md: the control phone. */
  size?: 'tv' | 'md'
  className?: string
}

const MAX_WINNERS = 4

export function ResultPanel({ race, bets, players, actions, size = 'tv', className }: ResultPanelProps) {
  const tv = size === 'tv'
  const result = race.result
  const voided = race.status === 'void'
  const podium = !voided && result ? result.order.slice(0, 3) : []
  const horse = (n: number) => race.field.find((h) => h.n === n)
  const winners = (bets ?? []).filter((b) => b.status === 'won').sort((a, b) => (b.payout ?? 0) - (a.payout ?? 0))
  const { houseNet } = settle(bets ?? [])
  const label = (id: string) => {
    const p = players.get(id)
    return p ? playerLabel(p.name, p.tag) : GM_BETS.unknownPlayer
  }

  return (
    <section className={cx('flex flex-col gap-4', className)}>
      <h2 className={cx('font-display font-black uppercase', tv ? 'text-tv-md' : 'text-2xl', voided ? 'text-drift' : 'text-plate')}>
        {voided ? GM_RACE.voidedTitle(race.race_no) : GM_RACE.resultTitle(race.race_no)}
      </h2>

      {podium.length > 0 && (
        <ol className={cx('grid items-end gap-4', tv ? 'grid-cols-3' : 'grid-cols-1')}>
          {podium.map((n, i) => {
            const h = horse(n)
            if (!h) return null
            return (
              <li
                key={n}
                className={cx(
                  'flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-tote/60 px-4 py-3 text-center ring-1 ring-white/10 ring-inset',
                  i === 0 && 'bg-tote pb-5 ring-3 ring-plate',
                )}
              >
                <span className={cx('font-display font-black text-ink-dim', tv ? 'text-2xl' : 'text-base')}>{GM_RACE.place(i + 1)}</span>
                <SilkBadge n={h.n} silk={h.silk} size={tv ? (i === 0 ? 'tv' : 'lg') : 'md'} lead={i === 0} />
                <span
                  className={cx(
                    'w-full leading-tight font-extrabold text-balance [font-stretch:82%]',
                    tv ? (i === 0 ? 'text-tv-sm' : 'text-2xl') : 'text-lg',
                  )}
                >
                  {h.name}
                </span>
                <span className={cx('w-full truncate text-plate', tv ? 'text-xl' : 'text-sm')}>
                  {UI_LABELS.kusk}: {h.jockey}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <div className={tv ? 'text-2xl' : 'text-base'}>
        <p className="font-bold">{result ? GM_RACE.ruling[result.ruling] : GM_RACE.voidedText}</p>
        {result?.inquiry_text && (
          <p className={cx('mt-1 text-ink-dim italic', tv ? 'text-xl' : 'text-sm')}>{result.inquiry_text}</p>
        )}
      </div>

      <div className={cx('grid items-start gap-6', tv ? 'grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-1 gap-4')}>
        {voided ? (
          <span />
        ) : (
          <div className="min-w-0">
            <h3 className={cx('mb-2 font-bold tracking-[0.14em] text-ink-dim uppercase', tv ? 'text-lg' : 'text-xs')}>
              {GM_RACE.winners}
            </h3>
            {bets && winners.length === 0 && (
              <p className={cx('text-ink-dim', tv ? 'text-2xl' : 'text-base')}>{GM_RACE.noWinners}</p>
            )}
            <ul className="flex flex-col gap-1.5">
              {winners.slice(0, MAX_WINNERS).map((b) => (
                <li
                  key={b.id}
                  className={cx('flex items-baseline gap-4 rounded-lg bg-cash/10 px-4 py-2', tv ? 'text-2xl' : 'text-base')}
                >
                  <span className="min-w-0 flex-1 truncate font-bold">{label(b.player_id)}</span>
                  <span className="font-display font-black whitespace-nowrap text-cash tabular-nums">+{fmtRm(b.payout ?? 0)}</span>
                </li>
              ))}
              {winners.length > MAX_WINNERS && (
                <li className={cx('px-4 text-ink-dim', tv ? 'text-xl' : 'text-sm')}>+{winners.length - MAX_WINNERS}</li>
              )}
            </ul>
          </div>
        )}
        {bets && (
          <div className={cx('flex flex-col', tv ? 'items-end' : 'items-start')}>
            <span
              className={cx('font-bold tracking-[0.14em] text-ink-dim uppercase', tv ? 'text-lg' : 'text-xs')}
            >
              {GM_RACE.houseNet}
            </span>
            <span
              className={cx(
                'font-display font-black tabular-nums',
                tv ? 'text-tv-lg' : 'text-4xl',
                houseNet >= 0 ? 'text-cash' : 'text-drift',
              )}
            >
              {houseNet > 0 ? '+' : ''}
              {fmtRm(houseNet)}
            </span>
          </div>
        )}
      </div>

      {actions && <div className="flex flex-wrap justify-end gap-4">{actions}</div>}
    </section>
  )
}
