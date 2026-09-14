import { cx } from './cx'

export type LogoSize = 'sm' | 'md' | 'lg' | 'tv'

const SIZE: Record<LogoSize, string> = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-7xl',
  tv: 'text-tv-xl',
}

/** "RALLY" plus the slanted 75 plate. The plate shape is shared with SilkBadge. */
export function Logo({ size = 'md', className }: { size?: LogoSize; className?: string }) {
  return (
    <span
      className={cx('inline-flex items-center font-display leading-none font-black tracking-tight uppercase', SIZE[size], className)}
    >
      <span className="text-ink">Rally</span>
      <span className="plate ml-[0.1em] rounded-[0.08em] bg-plate px-[0.12em] pt-[0.04em] text-night shadow-[0.07em_0.07em_0_var(--color-sleaze)]">
        <span className="unplate">75</span>
      </span>
    </span>
  )
}
