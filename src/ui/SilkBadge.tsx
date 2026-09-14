import type { Silk } from '../shared/game/types'
import { UI_LABELS } from '../shared/content/ui'
import { cx } from './cx'

export type BadgeSize = 'sm' | 'md' | 'lg' | 'tv'

const SIZE: Record<BadgeSize, string> = {
  sm: 'h-8 min-w-9 text-xl',
  md: 'h-11 min-w-12 text-3xl',
  lg: 'h-16 min-w-18 text-5xl',
  tv: 'h-24 min-w-26 text-tv-lg',
}

export interface SilkBadgeProps {
  n: number
  silk: Silk
  size?: BadgeSize
  /** Race leader: yellow ring and glow. */
  lead?: boolean
  /** In a galopp: wobbles. */
  broke?: boolean
  className?: string
}

/** Start number on the horse's silk, in the same slanted plate as the logo's 75. */
export function SilkBadge({ n, silk, size = 'md', lead, broke, className }: SilkBadgeProps) {
  return (
    <span
      role="img"
      aria-label={UI_LABELS.startNumber(n)}
      style={{ background: silk.bg }}
      className={cx(
        'plate inline-grid shrink-0 place-items-center rounded-[0.16em] px-[0.15em] font-display leading-none font-black text-night tabular-nums',
        '[text-shadow:0_0_0.2em_rgb(255_255_255/0.7)]',
        lead
          ? 'shadow-[0_0_0_0.1em_var(--color-plate),0_0_0.7em_0.1em_rgb(255_214_10/0.65)]'
          : 'shadow-[0.1em_0.1em_0_rgb(0_0_0/0.45)]',
        broke && 'animate-wobble',
        SIZE[size],
        className,
      )}
    >
      <span className="unplate pt-[0.06em]">{n}</span>
    </span>
  )
}
