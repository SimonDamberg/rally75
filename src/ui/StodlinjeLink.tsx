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
