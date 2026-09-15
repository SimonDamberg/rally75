// Realtime-backed React hooks. Pattern: fetch once, apply Realtime payloads, refetch on every
// (re)subscribe and when the tab becomes visible again, retry failed fetches with backoff.
import { useCallback, useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from 'react'
import { connectionStore, type ConnectionStatus } from './connection'
import { RallyError, toRallyError } from './errors'
import { identityStore } from './identity'
import { applyChange, byBalance, byLosses, type RowChange } from './realtime'
import { getApi, getSupabase } from './supabase'
import { toBet, toPlayer, toRace, type BetRow, type Identity, type KuskRow, type PlayerRow, type RaceRow } from './types'

export interface LiveResult<T> {
  /** undefined until the first successful fetch. */
  data: T | undefined
  /** Latest fetch error; cleared by the next success. Retries continue in the background. */
  error: RallyError | null
  reload: () => void
}

interface LiveOptions<T> {
  /** Identity of the query; null disables it. A new key refetches and resubscribes. */
  key: string | null
  load: () => Promise<T>
  /** Tables to watch (all in schema public). Empty: fetch only. */
  tables: readonly string[]
  /** Merge a change into the current data. Omit to refetch on every change. */
  apply?: (prev: T, change: RowChange) => T
}

const RETRY_MS = [1000, 2000, 4000, 8000, 10000]
const REFETCH_DEBOUNCE_MS = 150

function useLive<T>({ key, load, tables, apply }: LiveOptions<T>): LiveResult<T> {
  const [state, setState] = useState<{ key: string | null; data: T | undefined; error: RallyError | null }>({
    key,
    data: undefined,
    error: null,
  })
  const [reloadTick, setReloadTick] = useState(0)
  const tablesKey = tables.join(',')

  const doLoad = useEffectEvent(() => load())
  const doApply = useEffectEvent((prev: T, change: RowChange) => (apply ? apply(prev, change) : prev))
  const hasApply = apply !== undefined

  useEffect(() => {
    if (key === null) return
    let cancelled = false
    let attempt = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const channelId = `${key}:${Math.random().toString(36).slice(2)}`
    // Latest data this subscription fetched or merged. Changes are merged here, outside the state
    // updater: React may run updaters during render, where effect events must not be called.
    let current: T | undefined

    const fetchNow = async () => {
      clearTimeout(timer)
      try {
        const data = await doLoad()
        if (cancelled) return
        attempt = 0
        connectionStore.reportFetch(true)
        current = data
        setState({ key, data, error: null })
      } catch (err) {
        if (cancelled) return
        const error = toRallyError(err)
        if (error.code === 'network') connectionStore.reportFetch(false)
        setState((s) => ({ key, data: s.key === key ? s.data : undefined, error }))
        if (error.code !== 'config') {
          timer = setTimeout(fetchNow, RETRY_MS[Math.min(attempt++, RETRY_MS.length - 1)])
        }
      }
    }
    const scheduleFetch = () => {
      clearTimeout(timer)
      timer = setTimeout(fetchNow, REFETCH_DEBOUNCE_MS)
    }

    let removeChannel = () => {}
    const tableList = tablesKey ? tablesKey.split(',') : []
    if (tableList.length === 0) {
      void fetchNow()
    } else {
      try {
        const db = getSupabase()
        let channel = db.channel(`live:${channelId}`)
        for (const table of tableList) {
          channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
            if (cancelled) return
            if (!hasApply) return scheduleFetch()
            // Before the first fetch there is nothing to merge into; that fetch includes the change.
            if (current === undefined) return
            const next = doApply(current, payload as unknown as RowChange)
            if (next === current) return
            current = next
            setState((s) => (s.key === key ? { ...s, data: next } : s))
          })
        }
        // Changes only flow once Postgres confirms (after SUBSCRIBED); refetch then to close the gap.
        channel = channel.on('system', {}, (payload: { extension?: string; status?: string }) => {
          if (!cancelled && payload.extension === 'postgres_changes' && payload.status === 'ok') scheduleFetch()
        })
        channel.subscribe((status) => {
          if (cancelled) return
          connectionStore.reportChannel(channelId, status)
          if (status === 'SUBSCRIBED') void fetchNow()
        })
        removeChannel = () => {
          connectionStore.reportChannel(channelId, null)
          void db.removeChannel(channel)
        }
      } catch {
        // Missing config: the fetch fails the same way and reports it.
        void fetchNow()
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleFetch()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      removeChannel()
    }
  }, [key, tablesKey, hasApply, reloadTick])

  const reload = useCallback(() => setReloadTick((t) => t + 1), [])
  const current = state.key === key
  return { data: current ? state.data : undefined, error: current ? state.error : null, reload }
}

// Public hooks -------------------------------------------------------------------------------

export function useConnection(): ConnectionStatus {
  return useSyncExternalStore(connectionStore.subscribe, connectionStore.getSnapshot, () => 'connecting')
}

/** The race in game_state.active_race_id; null when there is none. */
export function useActiveRace(): LiveResult<RaceRow | null> {
  return useLive({
    key: 'active-race',
    load: () => getApi().getActiveRace(),
    tables: ['game_state', 'races'],
  })
}

/** Every race of the night, by race number. Used for the guest bet history. */
export function useRaces(): LiveResult<RaceRow[]> {
  return useLive({
    key: 'races',
    load: () => getApi().getRaces(),
    tables: ['races'],
    apply: (prev, change) => {
      const next = applyChange(prev, change, toRace)
      return next === prev ? prev : next.slice().sort((a, b) => a.race_no - b.race_no)
    },
  })
}

/** All bets on one race, oldest first. Drives pools, odds ticker and GM live bets. */
export function useRaceBets(raceId: string | null): LiveResult<BetRow[]> {
  return useLive({
    key: raceId && `race-bets:${raceId}`,
    load: () => getApi().getRaceBets(raceId!),
    // Unfiltered: Realtime does not deliver filtered DELETEs (player deletion cascades).
    tables: ['bets'],
    apply: (prev, change) => applyChange(prev, change, toBet, (b) => b.race_id === raceId),
  })
}

/** One player's bets, newest first. */
export function usePlayerBets(playerId: string | null): LiveResult<BetRow[]> {
  return useLive({
    key: playerId && `player-bets:${playerId}`,
    load: () => getApi().getPlayerBets(playerId!),
    tables: ['bets'],
    apply: (prev, change) => {
      const next = applyChange(prev, change, toBet, (b) => b.player_id === playerId)
      return next === prev ? prev : next.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
  })
}

/** Real payouts tonight. Refetched on race changes only: settlement always updates the race. */
export function useNightPaid(): LiveResult<number> {
  return useLive({ key: 'night-paid', load: () => getApi().getNightPaid(), tables: ['races'] })
}

export interface PlayerState extends LiveResult<PlayerRow | null> {
  identity: Identity | null
  /** Creates the account, stores {playerId, token} and returns the new identity. */
  createPlayer: (name: string) => Promise<Identity>
  /** Forget this device's account (e.g. after a player_not_found error). */
  forget: () => void
}

/** This device's player. If the row is gone (deleted by the GM) the identity is cleared. */
export function usePlayer(): PlayerState {
  const identity = useSyncExternalStore(identityStore.subscribe, identityStore.get, () => null)
  const playerId = identity?.playerId ?? null
  const live = useLive({
    key: playerId && `player:${playerId}`,
    load: async () => {
      const row = await getApi().getPlayer(playerId!)
      if (!row) identityStore.clear()
      return row
    },
    tables: ['players'],
    apply: (prev, change) => {
      if (change.eventType === 'DELETE') return change.old.id === playerId ? null : prev
      return change.new.id === playerId ? toPlayer(change.new) : prev
    },
  })

  const createPlayer = useCallback(async (name: string) => {
    const created = await getApi().createPlayer(name)
    const next = { playerId: created.id, token: created.token }
    identityStore.set(next)
    return next
  }, [])

  return { ...live, identity, createPlayer, forget: identityStore.clear }
}

export interface Leaderboard {
  players: PlayerRow[]
  /** Richest first. */
  top: PlayerRow[]
  /** "Kvällens största förlorare": lowest balance minus debt first. */
  losers: PlayerRow[]
}

export function useLeaderboard(): LiveResult<Leaderboard> {
  const live = useLive({
    key: 'players',
    load: () => getApi().getPlayers(),
    tables: ['players'],
    apply: (prev, change) => applyChange(prev, change, toPlayer),
  })
  const players = live.data
  const data = useMemo(
    () => (players ? { players, top: byBalance(players), losers: byLosses(players) } : undefined),
    [players],
  )
  return { data, error: live.error, reload: live.reload }
}

/** Kuskar are not in the Realtime publication; call reload() after GM edits. */
export function useKusks(): LiveResult<KuskRow[]> {
  return useLive({ key: 'kusks', load: () => getApi().getKusks(), tables: [] })
}
