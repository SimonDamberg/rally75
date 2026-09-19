// Full-screen race on the display iPad. Pure output: no buttons, and it never publishes.
// The timeline is replayed from the stored seed against races.started_at, so a reload mid-race
// resumes at the same tick and the control phone's Snabbspola lands here too. The drawing is
// RaceTrack; this side owns the clock, the secrets and the room's money.
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { useConnection, useServerClock } from '../../lib/hooks'
import type { BetRow, PlayerRow, RaceRow } from '../../lib/types'
import { GM_RACE } from '../../shared/content/gm'
import { ATTRACT } from '../../shared/content/ui'
import { ConnectionBadge } from '../../ui'
import { laneBackers } from '../book'
import { raceView } from '../raceClock'
import { useRaceTimeline } from '../useRaceTimeline'
import { InquiryDrama } from './InquiryDrama'
import { RaceTrack } from './RaceTrack'

const CLOCK_MS = 100

export function RaceScreen({
  race,
  bets,
  players,
}: {
  race: RaceRow
  bets: readonly BetRow[] | undefined
  players: ReadonlyMap<string, PlayerRow>
}) {
  const connection = useConnection()
  const { timeline, error } = useRaceTimeline(race)
  const { now: serverNow } = useServerClock()
  const start = race.started_at ? Date.parse(race.started_at) : serverNow()
  const [now, setNow] = useState(serverNow)

  const settled = race.status !== 'running'
  const tick = useEffectEvent(() => setNow(serverNow()))
  useEffect(() => {
    if (settled) return
    const id = setInterval(() => tick(), CLOCK_MS)
    return () => clearInterval(id)
  }, [settled])

  const view = timeline ? raceView(now - start, timeline) : null
  const phase = settled ? 'done' : (view?.phase ?? 'running')
  const backers = useMemo(() => laneBackers(race.field, bets ?? [], players, ATTRACT.someone), [race.field, bets, players])

  return (
    <RaceTrack
      raceNo={race.race_no}
      field={race.field}
      timeline={timeline}
      tick={view?.tick ?? 0}
      phase={phase}
      backers={backers}
      loadingText={error ? error.message : GM_RACE.loading}
      banner={<ConnectionBadge status={connection} variant="banner" size="tv" />}
    >
      {/* Drama only: the ruling buttons live on the control phone. */}
      {phase === 'done' && !settled && timeline?.inquiry && <InquiryDrama text={timeline.inquiry.text} />}
    </RaceTrack>
  )
}
