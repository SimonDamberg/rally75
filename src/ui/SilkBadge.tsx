import type { HorsePublic, Silk } from '../shared/game/types'
import { kuskPhoto } from '../shared/content/kuskar'
import { UI_LABELS } from '../shared/content/ui'
import { cx } from './cx'

export type BadgeSize = 'sm' | 'md' | 'lg' | 'tv'

const SIZE: Record<BadgeSize, string> = {
  sm: 'h-8 min-w-9 text-xl',
  md: 'h-11 min-w-12 text-3xl',
  lg: 'h-16 min-w-18 text-5xl',
  tv: 'h-24 min-w-26 text-tv-lg',
}

/** Face badge diameter. Everything inside is in em, so it scales from this font size. */
const FACE: Record<BadgeSize, string> = {
  sm: 'text-[2.5rem]',
  md: 'text-[3.25rem]',
  lg: 'text-[4.5rem]',
  tv: 'text-[6.5rem]',
}

export interface SilkBadgeProps {
  n: number
  silk: Silk
  size?: BadgeSize
  /** Race leader: yellow ring and glow. */
  lead?: boolean
  /** In a galopp: wobbles. */
  broke?: boolean
  /** The kusk's face. Without it the badge is the plain number plate. */
  photo?: string
  /** Kusk name, for the accessible label of the face badge. */
  kusk?: string
  className?: string
}

/**
 * The horse's badge. With a photo: the kusk's face in a ring of the horse's silk, with the start
 * number on a small slanted plate. Without one: the start number on the silk, in the same slanted
 * plate as the logo's 75.
 */
export function SilkBadge({ n, silk, size = 'md', lead, broke, photo, kusk, className }: SilkBadgeProps) {
  if (photo) {
    return (
      <span
        role="img"
        aria-label={kusk ? UI_LABELS.kuskBadge(n, kusk) : UI_LABELS.startNumber(n)}
        className={cx('relative inline-block size-[1em] shrink-0 leading-none', broke && 'animate-rock', FACE[size], className)}
      >
        <span
          style={{ background: silk.bg }}
          className={cx(
            'block size-full rounded-full p-[0.075em]',
            lead
              ? 'shadow-[0_0_0_0.05em_var(--color-plate),0_0_0.35em_0.05em_rgb(255_214_10/0.65)]'
              : 'shadow-[0.05em_0.05em_0_rgb(0_0_0/0.45)]',
          )}
        >
          <img src={photo} alt="" draggable={false} className="block size-full rounded-full bg-night-deep object-cover" />
        </span>
        <span
          className={cx(
            'plate absolute -right-[0.08em] -bottom-[0.04em] inline-grid min-w-[1.25em] place-items-center rounded-[0.14em] bg-plate px-[0.12em] font-display text-[0.38em] font-black text-night tabular-nums',
            'shadow-[0.08em_0.08em_0_rgb(0_0_0/0.5)]',
          )}
        >
          <span className="unplate pt-[0.06em]">{n}</span>
        </span>
      </span>
    )
  }
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

export interface HorseBadgeProps extends Omit<SilkBadgeProps, 'n' | 'silk' | 'photo' | 'kusk'> {
  horse: Pick<HorsePublic, 'n' | 'silk' | 'jockey'>
}

/** SilkBadge for a horse: shows its kusk's face when there is a photo for them. */
export function HorseBadge({ horse, ...rest }: HorseBadgeProps) {
  return <SilkBadge n={horse.n} silk={horse.silk} photo={kuskPhoto(horse.jockey)} kusk={horse.jockey} {...rest} />
}
