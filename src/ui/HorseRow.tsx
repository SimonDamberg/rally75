import type { ReactNode } from 'react'
import type { HorsePublic } from '../shared/game/types'
import { fmtRm } from '../shared/game/format'
import { UI_LABELS } from '../shared/content/ui'
import { cx } from './cx'
import { OddsValue } from './OddsValue'
import { SilkBadge } from './SilkBadge'

export interface HorseRowProps {
  horse: HorsePublic
  odds: number
  /** RM staked on this horse. Hidden when undefined. */
  pool?: number
  /** card: full race card entry (paddock). pick: one compact line (betting list). */
  variant?: 'card' | 'pick'
  /** tv: GM iPad, readable at 2 m. */
  size?: 'md' | 'tv'
  selected?: boolean
  /** Makes the row a toggle button. */
  onSelect?: (n: number) => void
  /** Extra content under the card body (e.g. "Du har 50 RM här"). */
  children?: ReactNode
  className?: string
}

export function HorseRow({
  horse,
  odds,
  pool,
  variant = 'card',
  size = 'md',
  selected,
  onSelect,
  children,
  className,
}: HorseRowProps) {
  const tv = size === 'tv'
  const pick = variant === 'pick'
  const classes = cx(
    'w-full rounded-xl border-l-[6px] text-left ring-inset transition-colors',
    pick
      ? cx('flex items-center gap-3 px-3 py-2', tv && 'gap-5 border-l-[10px] px-5 py-3')
      : cx('grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 p-3', tv && 'gap-x-5 border-l-[10px] p-5'),
    selected ? 'bg-tote ring-3 ring-plate' : 'bg-tote/60 ring-1 ring-white/10',
    onSelect && !selected && 'active:bg-tote',
    className,
  )

  const text = tv ? 'text-xl' : 'text-sm leading-snug'
  const body = (
    <>
      <SilkBadge n={horse.n} silk={horse.silk} size={tv ? (pick ? 'lg' : 'tv') : pick ? 'sm' : 'md'} />
      <span className={cx('flex min-w-0 flex-col', pick && 'flex-1')}>
        <span
          className={cx(
            'leading-tight font-extrabold [font-stretch:82%]',
            pick ? 'truncate' : 'text-balance',
            tv ? (pick ? 'text-tv-sm' : 'text-tv-md') : pick ? 'text-lg' : 'text-xl',
          )}
        >
          {horse.name}
        </span>
        <span className={cx('text-plate', pick && 'truncate', tv ? 'text-2xl' : 'text-sm')}>
          {UI_LABELS.kusk}: {horse.jockey}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <OddsValue value={odds} size={tv ? (pick ? 'lg' : 'tv') : pick ? 'sm' : 'md'} label={!pick} />
        {pool !== undefined && (
          <span className={cx('whitespace-nowrap text-ink-dim tabular-nums', tv ? 'text-lg' : 'text-xs')}>
            {UI_LABELS.pool} {fmtRm(pool)}
          </span>
        )}
      </span>
      {!pick && (
        // Details span the whole card so the story is not squeezed beside the odds on a phone.
        <span className={cx('col-span-full flex flex-col', tv ? 'mt-3' : 'mt-2')}>
          <span className={cx('text-ink-dim', text)}>{horse.story}</span>
          <span className={cx('mt-1 text-ink-dim/80 italic', text)}>{horse.jnote}</span>
          <span className={cx('mt-2 flex flex-wrap items-center gap-x-3 gap-y-1', tv ? 'text-xl' : 'text-xs')}>
            <span className="text-ink-dim">
              {UI_LABELS.form} <b className="font-bold tracking-[0.14em] text-ink">{horse.form}</b>
            </span>
            <span className="text-ink-dim">{horse.note}</span>
            <span className="rounded-full bg-sleaze/15 px-2 py-0.5 font-semibold text-sleaze">{horse.tip}</span>
          </span>
          {children}
        </span>
      )}
    </>
  )

  const style = { borderLeftColor: horse.silk.edge }
  if (!onSelect) {
    return (
      <div className={classes} style={style}>
        {body}
      </div>
    )
  }
  return (
    <button type="button" aria-pressed={!!selected} onClick={() => onSelect(horse.n)} className={classes} style={style}>
      {body}
    </button>
  )
}
