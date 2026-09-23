// Sticky top bar: logo, who you are, the balance (flashes when it moves) and debt.
// No connection dot here: the "Ingen anslutning" banner under this bar already says it, louder.
import { useState } from 'react'
import type { PlayerRow } from '../lib/types'
import { HEADER } from '../shared/content/client'
import { UI_LABELS } from '../shared/content/ui'
import { badgedLabel, fmtRm } from '../shared/game/format'
import { cx, MrGreenLogo, StodlinjeButton } from '../ui'

export function Header({
  player,
  heldBalance,
  broke,
  onLoan,
  onScan,
}: {
  player: PlayerRow | undefined
  /** Shown instead of the live balance while Plånko balls are still falling. */
  heldBalance?: number
  broke: boolean
  onLoan: () => void
  /** Opens the in-app scanner: one tap from any tab, for a winner standing at the dart board. */
  onScan: () => void
}) {
  const balance = heldBalance ?? player?.balance
  const [track, setTrack] = useState({ balance, dir: 0, flash: 0 })
  if (balance !== track.balance) {
    // Adjust while rendering when the balance changes (same pattern as OddsValue).
    const dir = balance === undefined || track.balance === undefined ? 0 : Math.sign(balance - track.balance)
    setTrack({ balance, dir, flash: track.flash + 1 })
  }

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-night-deep/85 px-4 py-2.5">
      <div className="flex min-w-0 flex-col gap-1">
        <MrGreenLogo variant="lockup" size="sm" />
        <span className="truncate text-xs font-semibold text-ink-dim">
          {player ? badgedLabel(player) : UI_LABELS.loading}
          {player?.title && <span className="ml-1.5 font-bold text-sleaze uppercase">{player.title}</span>}
        </span>
      </div>
      <span className="flex-1" />
      {/* Stacked, not side by side: the row has no width to spare once the balance has six digits. */}
      <div className="flex shrink-0 flex-col items-stretch gap-1.5">
        <button
          type="button"
          onClick={onScan}
          aria-label={HEADER.scan}
          className="flex items-center justify-center gap-1.5 rounded-full bg-sleaze px-3 py-1 font-display text-sm font-extrabold tracking-wide text-sleaze-ink uppercase active:scale-95"
        >
          <QrGlyph />
          {HEADER.scanShort}
        </button>
        {broke ? (
          <button
            type="button"
            onClick={onLoan}
            className="animate-pulse-live rounded-full bg-sleaze px-3 py-1 font-display text-sm font-extrabold tracking-wide text-sleaze-ink uppercase"
          >
            {HEADER.loan}
          </button>
        ) : (
          // The slot is never empty: without the loan offer it holds the help line, one tap from any tab.
          <StodlinjeButton className="py-1 text-center" />
        )}
      </div>
      <div className="flex flex-col items-end leading-none">
        <span className="text-[0.65rem] font-bold tracking-[0.16em] text-ink-dim uppercase">{HEADER.balance}</span>
        <span
          key={track.flash}
          className={cx(
            'mt-0.5 origin-right font-display text-3xl font-black tabular-nums',
            track.dir > 0 ? 'text-cash' : track.dir < 0 ? 'text-drift' : 'text-plate',
            track.flash > 1 && 'animate-odds-flash',
          )}
        >
          {balance === undefined ? '...' : fmtRm(balance)}
        </span>
        {player && player.debt > 0 && (
          <span className="mt-0.5 text-[0.7rem] font-bold whitespace-nowrap text-drift tabular-nums">
            {HEADER.debt} {fmtRm(player.debt)}
          </span>
        )}
      </div>
    </header>
  )
}

/** A tiny QR: three finder squares and a few modules. */
function QrGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <path d="M3 3h7v7H3zm2 2v3h3V5zM14 3h7v7h-7zm2 2v3h3V5zM3 14h7v7H3zm2 2v3h3v-3z" fillRule="evenodd" />
      <path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3v2h-3zM14 19h2v2h-2z" />
    </svg>
  )
}
