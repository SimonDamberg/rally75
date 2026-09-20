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
 * Same number as a quiet pill, for the header slot the blinking Snabblån button leaves empty.
 * Understated on purpose: it is the counterweight to the loan shark, not another offer.
 */
export function StodlinjeButton({ className }: { className?: string }) {
  return (
    <a
      href={`tel:${STODLINJE.number}`}
      aria-label={`${STODLINJE.callLabel} ${STODLINJE.display}`}
      className={cx(
        'rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-display text-sm font-extrabold tracking-wide text-ink-dim uppercase',
        className,
      )}
    >
      {STODLINJE.label}
    </a>
  )
}
