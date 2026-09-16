// Safety net, not a control path.
//
// Publishing is the control phone's job. But if it runs out of battery or walks out of range
// between the finish and the publish, every guest is left with open bets and no result, which is
// the one failure the night cannot recover from on its own. So the display waits a good while past
// the point where the phone should have published, then does it itself with the no-inquiry ruling.
//
// Racing the phone is harmless: gm_publish_result requires status 'running', so whichever call
// lands second fails with race_not_running and is swallowed. An inquiry is never auto-ruled here;
// that decision stays with Simon.
import { useEffect, useRef } from 'react'
import { useServerClock } from '../../lib/hooks'
import type { RaceRow } from '../../lib/types'
import { getApi } from '../../lib/supabase'
import { useGmAuth } from '../gmAuth'
import { pauseMs, runMs } from '../raceClock'
import { useRaceTimeline } from '../useRaceTimeline'

/** Grace period after the finish pause before the display steps in. */
export const FALLBACK_GRACE_MS = 12_000
const CHECK_MS = 1000

export function useFallbackPublish(race: RaceRow | null | undefined): void {
  const { password } = useGmAuth()
  const { timeline } = useRaceTimeline(race?.status === 'running' ? race : null)
  const { now: serverNow } = useServerClock()
  const attempted = useRef<string | null>(null)

  const raceId = race?.id ?? null
  const running = race?.status === 'running'
  const startedAt = race?.started_at ?? null
  const inquiry = !!timeline?.inquiry

  useEffect(() => {
    if (!running || !raceId || !startedAt || !timeline || !password) return
    // An inquiry needs a human ruling; never guess one.
    if (inquiry) return
    if (attempted.current === raceId) return

    const dueAt = Date.parse(startedAt) + runMs(timeline) + pauseMs(timeline) + FALLBACK_GRACE_MS
    const id = setInterval(() => {
      if (serverNow() < dueAt || attempted.current === raceId) return
      attempted.current = raceId
      void getApi()
        .gm.publishResult(password, raceId, timeline.finishOrder, 'none', null)
        .catch(() => {
          // The phone almost certainly got there first. Nothing to report on a display.
        })
    }, CHECK_MS)
    return () => clearInterval(id)
  }, [running, raceId, startedAt, timeline, password, inquiry, serverNow])
}
