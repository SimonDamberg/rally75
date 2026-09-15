// "Topplista": richest guests, and "Kvällens största förlorare" (balance minus debt).
import { useState } from 'react'
import { useLeaderboard } from '../lib/hooks'
import type { PlayerRow } from '../lib/types'
import { BOARD } from '../shared/content/client'
import { UI_LABELS } from '../shared/content/ui'
import { fmtRm, playerLabel } from '../shared/game/format'
import { cx, SmallPrint } from '../ui'
import { useGuest } from './guest'
import { rankOf } from './outcome'

const SHOWN = 20
type View = 'top' | 'losers'

export function Leaderboard() {
  const { identity } = useGuest()
  const { data, error } = useLeaderboard()
  const [view, setView] = useState<View>('top')

  const list = data ? (view === 'top' ? data.top : data.losers) : []
  const rank = rankOf(list, identity.playerId)
  const me = rank === null ? undefined : list[rank - 1]

  return (
    <div className="flex flex-1 flex-col gap-3 p-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-night-deep p-1 ring-1 ring-white/10 ring-inset">
        {(['top', 'losers'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={cx(
              'min-h-11 rounded-lg font-display text-lg font-extrabold uppercase',
              view === v ? (v === 'top' ? 'bg-plate text-night' : 'bg-drift text-white') : 'text-ink-dim',
            )}
          >
            {BOARD[v]}
          </button>
        ))}
      </div>
      {view === 'losers' && (
        <h1 className="px-1 font-display text-3xl leading-none font-black text-drift uppercase">{BOARD.losersTitle}</h1>
      )}

      {!data && <p className={cx('p-6 text-center', error ? 'text-drift' : 'text-ink-dim')}>{error?.message ?? UI_LABELS.loading}</p>}
      {data && list.length === 0 && <p className="p-6 text-center text-ink-dim">{BOARD.empty}</p>}

      <ol className="flex flex-col gap-1.5">
        {list.slice(0, SHOWN).map((p, i) => (
          <Row key={p.id} player={p} rank={i + 1} view={view} mine={p.id === identity.playerId} />
        ))}
      </ol>
      {me && rank !== null && rank > SHOWN && (
        <ol className="flex flex-col gap-1.5 border-t border-dashed border-white/15 pt-3">
          <Row player={me} rank={rank} view={view} mine />
        </ol>
      )}
      <SmallPrint className="mt-auto" />
    </div>
  )
}

function Row({ player, rank, view, mine }: { player: PlayerRow; rank: number; view: View; mine: boolean }) {
  const net = player.balance - player.debt
  return (
    <li
      className={cx(
        'flex items-center gap-3 rounded-lg px-3 py-2 ring-inset',
        mine ? 'bg-tote ring-2 ring-plate' : 'bg-tote/45 ring-1 ring-white/5',
      )}
    >
      <span
        className={cx(
          'w-8 shrink-0 text-center font-display text-2xl leading-none font-black tabular-nums',
          rank <= 3 ? (view === 'top' ? 'text-plate' : 'text-drift') : 'text-ink-dim',
        )}
      >
        {rank}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate font-bold">
          {playerLabel(player.name, player.tag)}
          {mine && <span className="ml-2 rounded bg-plate px-1.5 text-xs font-black text-night uppercase">{BOARD.you}</span>}
        </span>
        {(player.debt > 0 || view === 'losers') && (
          <span className="truncate text-xs text-ink-dim">
            {player.debt > 0 && <span className="text-drift">{BOARD.debt(fmtRm(player.debt))}</span>}
            {player.debt > 0 && player.loans_taken > 0 && ' · '}
            {player.loans_taken > 0 && BOARD.loans(player.loans_taken)}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end leading-none">
        {view === 'losers' && <span className="text-[0.6rem] font-bold tracking-[0.14em] text-ink-dim uppercase">{BOARD.net}</span>}
        <span
          className={cx(
            'font-display text-xl font-black tabular-nums',
            view === 'top' ? 'text-plate' : net < 0 ? 'text-drift' : 'text-ink',
          )}
        >
          {fmtRm(view === 'top' ? player.balance : net)}
        </span>
      </span>
    </li>
  )
}
