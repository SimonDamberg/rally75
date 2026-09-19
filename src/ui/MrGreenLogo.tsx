// The Mr Green Nätcasino mark: the umbrella brand of the guest app. Rally75 keeps its own wordmark
// in Logo.tsx, which is what the GM apps and the race panel render.
//
// One asset serves all three variants. "mark" and "lockup" crop the frog's head out of the full
// lockup with background-size/position rather than shipping a second file: the numbers below frame
// the square from the hat brim down to the jaw. The wordmark is drawn as text, not taken from the
// art, so it stays sharp at header size and costs nothing to download.
import { BRAND } from '../shared/content/ui'
import { cx } from './cx'

export type MrGreenVariant = 'mark' | 'lockup' | 'full'
export type MrGreenSize = 'sm' | 'md' | 'lg'

const ART = '/mrgreen-logo.jpg'

/** Crop to the head: 274 % wide anchored at the top puts the hat and eyes in a square box. */
const HEAD = { backgroundImage: `url(${ART})`, backgroundSize: '274% auto', backgroundPosition: '49% 0' }

const MARK: Record<MrGreenSize, string> = {
  sm: 'size-9',
  md: 'size-14',
  lg: 'size-24',
}

const NAME: Record<MrGreenSize, string> = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-5xl',
}

const SUB: Record<MrGreenSize, string> = {
  sm: 'text-[0.5rem]',
  md: 'text-[0.7rem]',
  lg: 'text-base',
}

const FULL: Record<MrGreenSize, string> = {
  sm: 'w-40',
  md: 'w-64',
  lg: 'w-80',
}

export function MrGreenLogo({
  variant = 'lockup',
  size = 'md',
  className,
}: {
  variant?: MrGreenVariant
  size?: MrGreenSize
  className?: string
}) {
  if (variant === 'full') {
    return (
      <img
        src={ART}
        alt={BRAND.logoAlt}
        width={1200}
        height={800}
        className={cx('h-auto rounded-2xl shadow-[0_0.5rem_2rem_rgb(0_0_0/0.45)]', FULL[size], className)}
      />
    )
  }

  const head = (
    <span
      role="img"
      aria-label={variant === 'mark' ? BRAND.logoAlt : undefined}
      aria-hidden={variant === 'mark' ? undefined : true}
      style={HEAD}
      className={cx('shrink-0 rounded-full ring-1 ring-white/25 ring-inset', MARK[size])}
    />
  )
  if (variant === 'mark') return className ? <span className={className}>{head}</span> : head

  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      {head}
      <span className="flex min-w-0 flex-col leading-none">
        <span className={cx('font-body font-black lowercase tracking-tight text-[#f9f8ed]', NAME[size])}>
          {BRAND.name}
        </span>
        <span className={cx('mt-0.5 font-body font-bold tracking-[0.3em] text-[#7fe3b1] uppercase', SUB[size])}>
          {BRAND.sub}
        </span>
      </span>
    </span>
  )
}
