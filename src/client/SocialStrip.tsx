// Thin live strip under the header: a viewer count that never sits still and "Utbetalt i kväll".
import { useEffect, useState } from 'react'
import { useNightPaid } from '../lib/hooks'
import { PROOF } from '../shared/content/parody'
import { fmtInt } from '../shared/game/format'
import { initialViewers, stepViewers } from '../shared/game/hype'
import { createRng, randomSeed } from '../shared/game/rng'
import { NightPaidNumber } from '../ui'

const rng = createRng(randomSeed())
const VIEWER_TICK_MS = 2500

export function SocialStrip() {
  const [viewers, setViewers] = useState(() => initialViewers(rng))
  const { data: paid } = useNightPaid()

  useEffect(() => {
    const id = setInterval(() => setViewers((v) => stepViewers(v, rng)), VIEWER_TICK_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-night-deep/60 px-4 py-1.5 text-xs font-semibold text-ink-dim">
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="size-2 animate-pulse-live rounded-full bg-drift" />
        <b className="text-ink tabular-nums">{fmtInt(viewers)}</b> {PROOF.viewers}
      </span>
      <span className="flex-1" />
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        {PROOF.paid}
        <b className="text-cash">
          <NightPaidNumber realPaid={paid ?? 0} /> RM
        </b>
      </span>
    </div>
  )
}
