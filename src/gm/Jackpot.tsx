// Fake, ever-growing jackpot on a tote board. Derived from the local clock (resets at noon) so a
// reload never resets it mid-party.
import { useEffect, useState } from 'react'
import { ATTRACT } from '../shared/content/ui'
import { fmtInt } from '../shared/game/format'

const BASE = 4_750_000
const PER_SECOND = 17
const TICK_MS = 1100
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

function jackpotAt(ms: number): number {
  const noon = new Date(ms)
  noon.setHours(12, 0, 0, 0)
  if (noon.getTime() > ms) noon.setDate(noon.getDate() - 1)
  return BASE + Math.floor(((ms - noon.getTime()) / 1000) * PER_SECOND)
}

function Digit({ value }: { value: number }) {
  return (
    <span className="inline-block h-[1em] overflow-hidden align-top">
      <span
        className="flex flex-col items-center transition-transform duration-700 ease-[cubic-bezier(0.2,0.9,0.25,1.1)]"
        style={{ transform: `translateY(-${value}em)` }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="h-[1em]">
            {d}
          </span>
        ))}
      </span>
    </span>
  )
}

export function Jackpot() {
  const [amount, setAmount] = useState(() => jackpotAt(Date.now()))
  useEffect(() => {
    const id = setInterval(() => setAmount(jackpotAt(Date.now())), TICK_MS)
    return () => clearInterval(id)
  }, [])

  // Keyed from the right so each digit keeps its roll when the number gains a digit.
  const chars = [...fmtInt(amount)].reverse()
  return (
    <div className="bulbs self-start rounded-2xl bg-night-deep px-8 pt-5 pb-4 ring-2 ring-plate/60">
      <p className="font-display text-tv-sm font-black tracking-[0.2em] text-sleaze uppercase">{ATTRACT.jackpotLabel}</p>
      <p
        role="img"
        aria-label={`${fmtInt(amount)} RM`}
        className="mt-1 flex items-baseline font-display text-[min(6rem,12dvh)] leading-none font-black text-plate tabular-nums drop-shadow-[0_0_1.5rem_rgb(255_214_10/0.4)]"
      >
        {chars
          .map((c, i) =>
            /\d/.test(c) ? <Digit key={i} value={Number(c)} /> : <span key={i} className="w-[0.22em]" />,
          )
          .reverse()}
        <span className="ml-4 text-tv-lg text-ink">RM</span>
      </p>
      <p className="mt-2 text-lg text-ink-dim">{ATTRACT.jackpotSmallPrint}</p>
    </div>
  )
}
