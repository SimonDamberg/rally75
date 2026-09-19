// A big Plånko hit, announced on the display iPad. Same shape as usePurchaseToasts (drops already
// there when the iPad loads are not announced, a rush folds into one line), with two differences:
// only hits of PLINKO_BIG_M10 and up are worth the room's attention, and the toast waits for the
// ball to land on the guest's phone so the iPad never spoils the result.
import { useEffect, useEffectEvent, useRef } from 'react'
import type { PlayerRow, PlinkoDropRow } from '../../lib/types'
import { ATTRACT } from '../../shared/content/ui'
import { badgedLabel, fmtRm } from '../../shared/game/format'
import { fmtMult, PLINKO_BIG_M10, PLINKO_FALL_MS } from '../../shared/game/plinko'
import { toast } from '../../ui'

const PLINKO_TOAST_MS = 7000
/** More big hits than this at once fold into a single line. */
const FOLD_AT = 1

export function usePlinkoToasts(
  drops: readonly PlinkoDropRow[] | undefined,
  players: ReadonlyMap<string, PlayerRow>,
) {
  const seen = useRef<ReadonlySet<string> | null>(null)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  const announce = useEffectEvent((fresh: readonly PlinkoDropRow[]) => {
    if (document.hidden) return
    if (fresh.length > FOLD_AT) return void toast({ text: ATTRACT.plinkoMany(fresh.length), ms: PLINKO_TOAST_MS })
    for (const d of fresh) {
      const player = players.get(d.player_id)
      const label = player ? badgedLabel(player) : ATTRACT.someone
      toast({ text: ATTRACT.plinko(label, fmtMult(d.m10), fmtRm(d.payout)), ms: PLINKO_TOAST_MS })
    }
  })

  useEffect(() => {
    if (!drops) return
    const prev = seen.current
    seen.current = new Set(drops.map((d) => d.id))
    if (!prev) return
    const fresh = drops.filter((d) => !prev.has(d.id) && d.m10 >= PLINKO_BIG_M10)
    if (!fresh.length) return
    const t = setTimeout(() => {
      timers.current.delete(t)
      announce(fresh)
    }, PLINKO_FALL_MS + 300)
    timers.current.add(t)
  }, [drops])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])
}
