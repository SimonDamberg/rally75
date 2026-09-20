import type { RaceStatus } from '../shared/game/types'
import { STATUS_LABELS, UI_LABELS } from '../shared/content/ui'
import { cx } from './cx'

const TONE: Record<RaceStatus, string> = {
  paddock: 'bg-tote text-ink ring-2 ring-tote-hi ring-inset',
  betting: 'bg-plate text-night',
  closed: 'bg-drift text-white',
  running: 'bg-sleaze text-sleaze-ink',
  finished: 'bg-cash text-night',
  void: 'bg-void text-ink',
}

export interface StatusBannerProps {
  status: RaceStatus
  /** The ticket stub on the left. Left out on the guest phone, where the strip must stay short. */
  raceNo?: number
  /** Replaces the default subtitle, e.g. "2 140 m voltstart". */
  detail?: string
  size?: 'md' | 'tv'
  className?: string
}

/** Race status strip: a ticket-style race number, then the status in big letters. */
export function StatusBanner({ status, raceNo, detail, size = 'md', className }: StatusBannerProps) {
  const tv = size === 'tv'
  const { title, subtitle } = STATUS_LABELS[status]
  return (
    <div
      role="status"
      className={cx('flex items-stretch overflow-hidden rounded-xl', tv && 'rounded-3xl', TONE[status], className)}
    >
      {raceNo !== undefined && (
        <div
          className={cx(
            'flex shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-current/35 font-display leading-none font-black uppercase',
            tv ? 'px-8 py-4' : 'px-3 py-2',
          )}
        >
          <span className={cx('tracking-[0.18em] opacity-75', tv ? 'text-2xl' : 'text-[0.7rem]')}>{UI_LABELS.race}</span>
          <span className={cx('tabular-nums', tv ? 'text-tv-lg' : 'text-4xl')}>{raceNo}</span>
        </div>
      )}
      <div className={cx('flex min-w-0 flex-1 flex-col justify-center', tv ? 'gap-2 px-8 py-4' : 'gap-0.5 px-3 py-1.5')}>
        <div className={cx('flex items-center font-display leading-none font-black uppercase', tv ? 'gap-4 text-tv-lg' : 'gap-2 text-2xl')}>
          {status === 'running' && (
            <span
              aria-label={UI_LABELS.live}
              className={cx('shrink-0 animate-pulse-live rounded-full bg-white', tv ? 'size-6' : 'size-3')}
            />
          )}
          <span className="truncate">{title}</span>
        </div>
        <div className={cx('font-semibold opacity-85', tv ? 'text-2xl' : 'text-sm')}>{detail ?? subtitle}</div>
      </div>
    </div>
  )
}
