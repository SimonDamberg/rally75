// The held start on the display iPad: 3, 2, 1, KÖR over the field at the gate.
//
// It is not a local delay. gm_set_status stamps races.started_at a few seconds ahead, so the
// countdown is just the negative side of the same server clock the race replays against: every
// device counts to the same zero, and tick 0 is the first stride.
import { ATTRACT } from '../../shared/content/ui'
import type { Countdown } from '../raceClock'

export function StartCountdown({ value }: { value: Countdown }) {
  if (value === null) return null
  const go = value === 'go'

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-black/45"
      role="status"
      aria-label={go ? ATTRACT.countdownGo : ATTRACT.countdownLabel(value)}
    >
      {/* Keyed on the value so every number lands with its own punch. */}
      <span
        key={String(value)}
        className={
          go
            ? 'animate-stamp rounded-3xl bg-cash px-[6vw] py-[2vh] font-display text-[18vh] leading-none font-black text-void uppercase shadow-[0.5rem_0.5rem_0_rgb(0_0_0/0.5)]'
            : 'animate-countdown font-display text-[36vh] leading-none font-black text-plate tabular-nums drop-shadow-[0_0_3rem_rgb(0_0_0/0.8)]'
        }
      >
        {go ? ATTRACT.countdownGo : value}
      </span>
    </div>
  )
}
