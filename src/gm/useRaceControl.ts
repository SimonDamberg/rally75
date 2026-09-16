// Race lifecycle actions for the GM. Each action runs the RPC, then refetches the active race so
// the panel updates without waiting for Realtime.
import { useCallback } from 'react'
import type { KuskRow, RaceRow } from '../lib/types'
import { buildRaceCard } from '../shared/game/field'
import { createRng, randomSeed } from '../shared/game/rng'
import type { RaceStatus, Ruling } from '../shared/game/types'
import { useGmAction } from './gmAuth'
import { primeSecrets } from './useRaceTimeline'

export interface RaceControl {
  busy: boolean
  /** New paddock race (replaces a paddock race, needs a finished/void/no race otherwise). */
  create: () => Promise<RaceRow | undefined>
  reroll: (race: RaceRow) => Promise<RaceRow | undefined>
  setStatus: (race: RaceRow, status: Extract<RaceStatus, 'betting' | 'closed' | 'void'>) => Promise<RaceRow | undefined>
  /** Loads the secrets first so the race screen can start at tick 0, then sets running. */
  start: (race: RaceRow) => Promise<RaceRow | undefined>
  /** Snabbspola: moves started_at back by the timeline length, server-side so the display follows. */
  skip: (race: RaceRow, runMs: number) => Promise<RaceRow | undefined>
  publish: (race: RaceRow, order: readonly number[], ruling: Ruling, inquiryText: string | null) => Promise<RaceRow | undefined>
}

export function useRaceControl(kusks: readonly KuskRow[] | undefined, reload: () => void): RaceControl {
  const { run, busy } = useGmAction()

  const after = useCallback(
    <T>(result: T | undefined) => {
      if (result !== undefined) reload()
      return result
    },
    [reload],
  )

  const card = useCallback(() => {
    const active = (kusks ?? []).filter((k) => k.active)
    const { horses, stats, dist, cond } = buildRaceCard(active, createRng(randomSeed()))
    return { horses, stats, dist, cond, seed: randomSeed() }
  }, [kusks])

  return {
    busy,
    create: useCallback(async () => after(await run((gm, pw) => gm.createRace(pw, card()))), [after, run, card]),
    reroll: useCallback(
      async (race: RaceRow) => after(await run((gm, pw) => gm.rerollRace(pw, race.id, card()))),
      [after, run, card],
    ),
    setStatus: useCallback(
      async (race: RaceRow, status: RaceStatus) => after(await run((gm, pw) => gm.setStatus(pw, race.id, status))),
      [after, run],
    ),
    start: useCallback(
      async (race: RaceRow) => {
        const secrets = await run((gm, pw) => gm.getSecrets(pw, race.id))
        if (!secrets) return undefined
        primeSecrets(race.id, secrets)
        // The server stamps started_at; both devices replay against it.
        return after(await run((gm, pw) => gm.setStatus(pw, race.id, 'running')))
      },
      [after, run],
    ),
    skip: useCallback(
      async (race: RaceRow, runMs: number) => after(await run((gm, pw) => gm.skipRace(pw, race.id, runMs))),
      [after, run],
    ),
    publish: useCallback(
      async (race: RaceRow, order: readonly number[], ruling: Ruling, inquiryText: string | null) =>
        after(await run((gm, pw) => gm.publishResult(pw, race.id, order, ruling, inquiryText))),
      [after, run],
    ),
  }
}
