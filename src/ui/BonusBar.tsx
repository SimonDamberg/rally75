import { BONUS_BAR } from '../shared/content/parody'
import { cx } from './cx'

const REPEAT = 3

/** Scrolling sleaze strip with chasing marquee bulbs. */
export function BonusBar({ text = BONUS_BAR, className }: { text?: string; className?: string }) {
  const run = Array.from({ length: REPEAT }, () => text)
  return (
    <div className={cx('bulbs overflow-hidden bg-sleaze text-white', className)} aria-label={text} role="note">
      <div className="flex w-max animate-marquee py-2.5" aria-hidden>
        {[0, 1].map((copy) => (
          <span key={copy} className="flex shrink-0">
            {run.map((t, i) => (
              <span
                key={i}
                className="flex items-center gap-6 pr-6 font-display text-base leading-none font-extrabold tracking-[0.12em] whitespace-nowrap uppercase"
              >
                {t}
                <span className="text-plate">★</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  )
}
