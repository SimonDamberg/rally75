import { useState } from 'react'
import { LEGAL_TEXT, SMALL_PRINT } from '../shared/content/parody'
import { cx } from './cx'

/** Legal small print for the bottom of a screen: one rotating line plus the house legalese. */
export function SmallPrint({ className }: { className?: string }) {
  const [line] = useState(() => SMALL_PRINT[Math.floor(Math.random() * SMALL_PRINT.length)])
  return (
    <p className={cx('px-4 pt-2 pb-5 text-center text-[0.65rem] leading-snug text-ink-dim/70', className)}>
      {line} {LEGAL_TEXT}
    </p>
  )
}
