import { STODLINJE } from '../shared/content/parody'
import { cx } from './cx'

export interface StodlinjeLinkProps {
  /** Sentence that leads into the link, e.g. `STODLINJE.lead.debt`. */
  lead?: string
  className?: string
}

/** Tappable help-line link (parody): rings the friend in costume. Inline, so it sits in a sentence or a <p>. */
export function StodlinjeLink({ lead, className }: StodlinjeLinkProps) {
  return (
    <span className={className}>
      {lead && <>{lead} </>}
      <a
        href={`tel:${STODLINJE.number}`}
        aria-label={`${STODLINJE.callLabel} ${STODLINJE.display}`}
        className="inline-block py-1 font-bold whitespace-nowrap text-plate underline decoration-2 underline-offset-2"
      >
        {STODLINJE.label} {STODLINJE.display}
      </a>
    </span>
  )
}

/** Same link as a standalone line, for panels where it should read as its own note. */
export function StodlinjeNote({ lead, className }: StodlinjeLinkProps) {
  return (
    <p className={cx('text-sm text-ink-dim', className)}>
      <StodlinjeLink lead={lead} />
    </p>
  )
}

/**
 * Same number as a pill, for the header slot the blinking Snabblån button leaves empty. Solid and
 * pressable so it reads as something you can tap, but it never blinks: it is the counterweight to
 * the loan shark, not another offer.
 */
export function StodlinjeButton({ className }: { className?: string }) {
  return (
    <a
      href={`tel:${STODLINJE.number}`}
      aria-label={`${STODLINJE.callLabel} ${STODLINJE.display}`}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-2.5 py-1.5 font-display text-sm font-extrabold tracking-wide whitespace-nowrap text-night uppercase',
        'shadow-[0_0.2rem_0] shadow-black/45 transition-[transform,box-shadow] duration-75 active:translate-y-[0.2rem] active:shadow-none',
        className,
      )}
    >
      <PhoneGlyph />
      {STODLINJE.label}
    </a>
  )
}

function PhoneGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 shrink-0 max-[380px]:hidden" fill="currentColor">
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
    </svg>
  )
}
