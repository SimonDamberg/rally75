// Loads a race's hidden stats and seed (GM only) and replays the deterministic simulation.
import { useEffect, useEffectEvent, useState } from 'react'
import { toRallyError, type RallyError } from '../lib/errors'
import { getApi } from '../lib/supabase'
import type { RaceRow, RaceSecrets } from '../lib/types'
import { distMeters } from '../shared/game/format'
import { simulateRace } from '../shared/game/sim'
import type { RaceTimeline } from '../shared/game/types'
import { useGmAuth } from './gmAuth'

const RETRY_MS = [1000, 2000, 4000, 8000]
const cache = new Map<string, RaceSecrets>()

/** Hands secrets fetched by "Starta loppet" to the race screen so it starts without a round trip. */
export function primeSecrets(raceId: string, secrets: RaceSecrets): void {
  cache.set(raceId, secrets)
}

const replay = (race: RaceRow, secrets: RaceSecrets): RaceTimeline =>
  simulateRace({
    horses: race.field,
    stats: secrets.stats,
    seed: secrets.seed,
    raceNo: race.race_no,
    meters: distMeters(race.dist),
  })

export function useRaceTimeline(race: RaceRow): { timeline: RaceTimeline | null; error: RallyError | null } {
  const { password, logout } = useGmAuth()
  const raceId = race.id
  const [state, setState] = useState<{ raceId: string; timeline: RaceTimeline | null; error: RallyError | null }>(
    () => {
      const cached = cache.get(raceId)
      return { raceId, timeline: cached ? replay(race, cached) : null, error: null }
    },
  )
  const build = useEffectEvent((secrets: RaceSecrets) => replay(race, secrets))
  const current = state.raceId === raceId
  const loaded = current && state.timeline !== null

  useEffect(() => {
    if (loaded || !password) return
    let cancelled = false
    let attempt = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      try {
        const secrets = await getApi().gm.getSecrets(password, raceId)
        if (cancelled) return
        cache.set(raceId, secrets)
        setState({ raceId, timeline: build(secrets), error: null })
      } catch (err) {
        if (cancelled) return
        const error = toRallyError(err)
        if (error.code === 'gm_unauthorized') return logout()
        setState({ raceId, timeline: null, error })
        timer = setTimeout(load, RETRY_MS[Math.min(attempt++, RETRY_MS.length - 1)])
      }
    }
    void load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [loaded, password, raceId, logout])

  return current ? { timeline: state.timeline, error: state.error } : { timeline: null, error: null }
}
