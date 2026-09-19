// One bet: horse, stake, captured odds and how it ended.
import type { BetRow } from '../lib/types'
import { BET_STATUS, MY_BETS } from '../shared/content/client'
import { fmtOdds, fmtRm } from '../shared/game/format'
import type { HorsePublic } from '../shared/game/types'
import { cx, HorseBadge } from '../ui'
import { betOutcome, type BetOutcome } from './outcome'

const CHIP: Record<BetOutcome['kind'], string> = {
  open: 'bg-plate/15 text-plate',
  won: 'bg-cash text-night',
  lost: 'bg-drift/15 text-drift',
  refunded: 'bg-void text-ink',
  kept: 'bg-drift/15 text-drift',
}

function label(o: BetOutcome): string {
  switch (o.kind) {
    case 'open':
      return BET_STATUS.open
    case 'won':
      return BET_STATUS.won(fmtRm(o.payout))
    case 'lost':
      return BET_STATUS.lost
    case 'refunded':
      return BET_STATUS.refunded
    case 'kept':
      return BET_STATUS.kept
  }
}

export function BetLine({ bet, horse }: { bet: BetRow; horse: HorsePublic | undefined }) {
  const outcome = betOutcome(bet)
  return (
    <li
      className={cx(
        'flex items-center gap-3 rounded-lg bg-tote/50 px-3 py-2 ring-1 ring-white/5 ring-inset',
        outcome.kind === 'won' && 'bg-cash/10 ring-cash/40',
      )}
    >
      {horse && <HorseBadge horse={horse} size="sm" />}
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate font-bold [font-stretch:82%]">{horse?.name ?? MY_BETS.horse(bet.horse_n)}</span>
        <span className="text-xs text-ink-dim tabular-nums">
          {fmtRm(bet.stake)} · {MY_BETS.odds(fmtOdds(bet.odds))}
        </span>
      </span>
      <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap', CHIP[outcome.kind])}>
        {label(outcome)}
      </span>
    </li>
  )
}
