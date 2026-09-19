import { BONUS_BAR } from '../shared/content/parody'
import { cx } from './cx'

const REPEAT = 2

/** Scrolling bonus strip with chasing marquee bulbs. Its colours are their own brand tokens:
 *  hot pink on Rally75, a gold band with felt-green lettering on Mr Green. */
export function BonusBar({ text = BONUS_BAR, className }: { text?: string; className?: string }) {
  const run = Array.from({ length: REPEAT }, () => text)
  return (
    <div className={cx('bulbs overflow-hidden bg-marquee text-marquee-ink [--color-bulb:var(--color-marquee-bulb)]', className)} aria-label={text} role="note">
      <div className="flex w-max animate-marquee py-2.5" aria-hidden>
        {[0, 1].map((copy) => (
          <span key={copy} className="flex shrink-0">
            {run.map((t, i) => (
              <span
                key={i}
                className="flex items-center gap-6 pr-6 font-display text-base leading-none font-extrabold tracking-[0.12em] whitespace-nowrap uppercase"
              >
                {t}
                <span className="text-marquee-bulb">★</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  )
}
