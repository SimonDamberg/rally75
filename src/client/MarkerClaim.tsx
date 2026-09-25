// The marker claim screen, shown to Mr Green across the counter. claim_markers has already stamped
// the receipts when this opens, so it is pure proof: an endless RM rain, colours that never sit
// still, a throbbing count and a clock ticking in seconds, so a screenshot is easy to tell apart
// from the real thing. No sound; one tap closes it.
import { useEffect, useState } from 'react'
import { MARKER } from '../shared/content/client'
import { Button } from '../ui'
import { CoinBurst } from './CoinBurst'

export function MarkerClaim({ count, who, onClose }: { count: number; who: string; onClose: () => void }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 250)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${count} ${MARKER.rainUnit}`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 overflow-hidden bg-night-deep p-6 text-center"
    >
      <div
        aria-hidden
        className="absolute inset-0 animate-rave bg-[radial-gradient(circle_at_30%_20%,var(--color-sleaze),transparent_55%),radial-gradient(circle_at_70%_80%,var(--color-cash),transparent_55%),radial-gradient(circle_at_50%_50%,var(--color-plate),transparent_70%)] opacity-70"
      />
      <CoinBurst big loop />

      <div className="relative z-20 flex flex-col items-center gap-2">
        <p className="animate-blink rounded-full bg-night/80 px-4 py-1 text-sm font-black tracking-widest text-plate uppercase">
          {MARKER.rainKicker}
        </p>
        <p className="animate-throb font-display text-[9rem] leading-none font-black text-plate tabular-nums [text-shadow:0.4rem_0.4rem_0_var(--color-night)]">
          {count}
        </p>
        <p className="animate-shake font-display text-5xl leading-none font-black text-ink uppercase [text-shadow:0.2rem_0.2rem_0_var(--color-night)]">
          {MARKER.rainUnit}
        </p>
        <p className="mt-2 rounded-xl bg-night/80 px-4 py-2 text-xl font-bold">{MARKER.rainTo(who)}</p>
        <p className="font-display text-4xl font-black text-cash tabular-nums [text-shadow:0.15rem_0.15rem_0_var(--color-night)]">
          {now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>

      <p className="relative z-20 max-w-xs rounded-xl bg-night/80 px-4 py-2 text-sm text-ink-dim">{MARKER.rainHint}</p>
      <Button size="lg" onClick={onClose} className="relative z-20">
        {MARKER.rainDone}
      </Button>
    </div>
  )
}
