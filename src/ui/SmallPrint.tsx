import { useState } from 'react'
import { LEGAL_TEXT, SMALL_PRINT, STODLINJE } from '../shared/content/parody'
import { cx } from './cx'
import { StodlinjeLink } from './StodlinjeLink'

/** Legal small print for the bottom of a screen: one rotating line, the house legalese and the Stödlinje link. */
export function SmallPrint({ className }: { className?: string }) {
  const [line] = useState(() => SMALL_PRINT[Math.floor(Math.random() * SMALL_PRINT.length)])
  return (
    <p className={cx('px-4 pt-2 pb-5 text-center text-[0.65rem] leading-snug text-ink-dim/70', className)}>
      {line} {LEGAL_TEXT} <StodlinjeLink lead={STODLINJE.lead.smallPrint} />
    </p>
  )
}
