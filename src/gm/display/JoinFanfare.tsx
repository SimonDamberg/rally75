// Big sweeping banner whenever a new guest signs up. Players already there on first load are
// not announced. A rush of sign-ups is folded into one "och N till" banner.
import { useEffect, useState } from 'react'
import type { PlayerRow } from '../../lib/types'
import { WELCOME_BONUS } from '../../shared/game/economy'
import { fmtRm, playerLabel } from '../../shared/game/format'
import { ATTRACT } from '../../shared/content/ui'

const SHOW_MS = 3600
const FOLD_AT = 3

export function JoinFanfare({ players }: { players: readonly PlayerRow[] | undefined }) {
  const [seen, setSeen] = useState<ReadonlySet<string> | null>(null)
  const [queue, setQueue] = useState<PlayerRow[]>([])

  // Adjusting state while rendering (React's pattern for reacting to new props).
  if (players) {
    if (!seen) {
      setSeen(new Set(players.map((p) => p.id)))
    } else {
      const fresh = players.filter((p) => !seen.has(p.id))
      if (fresh.length) {
        setSeen(new Set([...seen, ...fresh.map((p) => p.id)]))
        setQueue([...queue, ...fresh])
      }
    }
  }

  const current = queue[0]
  const folded = queue.length > FOLD_AT
  useEffect(() => {
    if (!current) return
    const id = setTimeout(() => setQueue((q) => (q.length > FOLD_AT ? [] : q.slice(1))), SHOW_MS)
    return () => clearTimeout(id)
  }, [current])

  if (!current) return null
  const label = playerLabel(current.name, current.tag)
  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden">
      <div
        key={folded ? 'folded' : current.id}
        className="bulbs w-[120%] animate-fanfare bg-sleaze py-8 text-center shadow-[0_0_4rem_rgb(255_46_136/0.6)]"
      >
        <p className="truncate px-[10%] font-display text-tv-xl font-black text-white uppercase">
          {folded ? ATTRACT.joinedMany(label, queue.length - 1) : ATTRACT.joined(label)}
        </p>
        <p className="mt-2 font-display text-tv-md font-black text-plate uppercase">
          {ATTRACT.joinedBonus(fmtRm(WELCOME_BONUS))}
        </p>
      </div>
    </div>
  )
}
