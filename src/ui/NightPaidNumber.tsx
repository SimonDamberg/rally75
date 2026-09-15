import { useEffect, useState } from 'react'
import { nightPaidDisplay } from '../shared/game/hype'
import { RollingNumber } from './RollingNumber'

const TICK_MS = 1100

/** "Utbetalt i kväll": the real payouts on top of a clock-grown fake base, rolling as it grows. */
export function NightPaidNumber({ realPaid, className }: { realPaid: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [])
  return <RollingNumber value={nightPaidDisplay(now, realPaid)} className={className} />
}
