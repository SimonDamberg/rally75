// Money landing on a horse, announced on the display iPad. The room sees who just bet without
// anyone having to read the phone out loud.
//
// Same shape as the guest's useSocialProof, with one difference: the display has no player of its
// own, so nothing is filtered out. Bets already on the race when the iPad loads are not announced.
import { useEffect, useEffectEvent, useRef } from 'react'
import { freshBets } from '../../lib/realtime'
import type { BetRow, PlayerRow, RaceRow } from '../../lib/types'
import { ATTRACT } from '../../shared/content/ui'
import { badgedLabel, fmtRm } from '../../shared/game/format'
import { toast } from '../../ui'

const BET_TOAST_MS = 6000
/** More bets than this in one batch fold into a single line. Lower than the phone's: read at 2 m. */
const FOLD_AT = 1

export function useBetToasts(race: RaceRow | null | undefined, bets: readonly BetRow[] | undefined, players: ReadonlyMap<string, PlayerRow>) {
  const raceId = race?.id
  const field = race?.field
  const seen = useRef<{ raceId: string; ids: ReadonlySet<string> } | null>(null)

  const announce = useEffectEvent((fresh: readonly BetRow[], horses: NonNullable<typeof field>) => {
    if (document.hidden) return
    if (fresh.length > FOLD_AT) return void toast({ text: ATTRACT.betsMany(fresh.length), ms: BET_TOAST_MS })
    for (const b of fresh) {
      const horse = horses.find((h) => h.n === b.horse_n)
      if (!horse) continue
      const p = players.get(b.player_id)
      const label = p ? badgedLabel(p) : ATTRACT.someone
      toast({ text: ATTRACT.bet(label, fmtRm(b.stake), horse.name), ms: BET_TOAST_MS })
    }
  })

  useEffect(() => {
    if (!raceId || !bets || !field) return
    const prev = seen.current?.raceId === raceId ? seen.current.ids : null
    const next = freshBets(prev, bets, '')
    seen.current = { raceId, ids: next.seen }
    if (next.fresh.length) announce(next.fresh, field)
  }, [raceId, bets, field])
}
