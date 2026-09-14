import { useState } from 'react'
import { fmtOdds } from '../shared/game/format'
import { UI_LABELS } from '../shared/content/ui'
import { cx } from './cx'
import { oddsDrift, type Drift } from './drift'

export type OddsSize = 'sm' | 'md' | 'lg' | 'tv'

const SIZE: Record<OddsSize, string> = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl',
  tv: 'text-tv-lg',
}

const LABEL: Record<OddsSize, string> = {
  sm: 'text-[0.65rem]',
  md: 'text-[0.7rem]',
  lg: 'text-sm',
  tv: 'text-lg',
}

const COLOR: Record<Drift, string> = {
  none: 'text-plate',
  up: 'text-drift',
  down: 'text-cash',
}

export interface OddsValueProps {
  value: number
  size?: OddsSize
  /** Small "Odds" caption under the number. */
  label?: boolean
  className?: string
}

/**
 * Live odds. When the value changes it flashes and keeps its drift colour until the next change:
 * red with ▲ when the odds lengthen, green with ▼ when they shorten.
 */
export function OddsValue({ value, size = 'md', label, className }: OddsValueProps) {
  const [track, setTrack] = useState({ value, drift: 'none' as Drift, flash: 0 })
  const drift = oddsDrift(track.value, value)
  if (drift !== 'none') {
    // Adjust state while rendering when the prop changes (no effect, no extra paint).
    setTrack({ value, drift, flash: track.flash + 1 })
  }
  const shown = drift !== 'none' ? drift : track.drift

  return (
    <span className={cx('inline-flex flex-col items-end leading-none', className)}>
      <span
        key={track.flash}
        className={cx(
          'inline-flex origin-right items-baseline gap-[0.12em] font-display font-black tabular-nums',
          SIZE[size],
          COLOR[shown],
          track.flash > 0 && 'animate-odds-flash',
        )}
      >
        <span aria-hidden className={cx('text-[0.42em]', shown === 'none' && 'invisible')}>
          {shown === 'down' ? '▼' : '▲'}
        </span>
        {fmtOdds(value)}
      </span>
      {label && (
        <span className={cx('mt-1 font-bold tracking-[0.16em] text-ink-dim uppercase', LABEL[size])}>{UI_LABELS.odds}</span>
      )}
    </span>
  )
}
