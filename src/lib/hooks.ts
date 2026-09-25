// Realtime-backed React hooks. Pattern: fetch once, apply Realtime payloads, refetch on every
// (re)subscribe and when the tab becomes visible again, retry failed fetches with backoff.
import { useCallback, useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from 'react'
import { measureOffset, serverTime, usableOffset } from './clock'
import { connectionStore, type ConnectionStatus } from './connection'
import { RallyError, toRallyError } from './errors'
import { identityStore } from './identity'
import { applyChange, byLosses, byNetWorth, type RowChange } from './realtime'
import { getApi, getSupabase } from './supabase'
import {
  toBet,
  toPlayer,
  type BetRow,
  type CouponRow,
  type Identity,
  type KuskRow,
  type PlayerRow,
  type PlinkoDropRow,
  type PrizeCardRow,
  type PrizeClaimRow,
  type PurchaseRow,
  type BoxPrizeRow,
  type RaceRow,
  type ShopItemRow,
} from './types'

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
  /**
   * Also refetch every pollMs while the tab is visible. A safety net for a socket that died
   * without telling anyone: the heartbeat only notices after a while, and a push missed in that
   * gap is gone for good (Realtime has no replay).
   */
  pollMs?: number
}

const RETRY_MS = [1000, 2000, 4000, 8000, 10000]
const REFETCH_DEBOUNCE_MS = 150

function useLive<T>({ key, load, tables, apply, pollMs }: LiveOptions<T>): LiveResult<T> {
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
    // Fetches can overlap (a slow one, then a change or a poll). Only the newest may land, or a
    // stale "closed" could overwrite a fresh "running".
    let seq = 0

    const fetchNow = async () => {
      clearTimeout(timer)
      const mine = ++seq
      try {
        const data = await doLoad()
        if (cancelled || mine !== seq) return
        attempt = 0
        connectionStore.reportFetch(true)
        current = data
        setState({ key, data, error: null })
      } catch (err) {
        if (cancelled || mine !== seq) return
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
    const poll = pollMs
      ? setInterval(() => {
          if (document.visibilityState === 'visible') scheduleFetch()
        }, pollMs)
      : undefined

    return () => {
      cancelled = true
      clearTimeout(timer)
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      removeChannel()
    }
  }, [key, tablesKey, hasApply, pollMs, reloadTick])

  const reload = useCallback(() => setReloadTick((t) => t + 1), [])
  const current = state.key === key
  return { data: current ? state.data : undefined, error: current ? state.error : null, reload }
}

// Public hooks -------------------------------------------------------------------------------

export function useConnection(): ConnectionStatus {
  return useSyncExternalStore(connectionStore.subscribe, connectionStore.getSnapshot, () => 'connecting')
}

/**
 * The race in game_state.active_race_id; null when there is none. The display iPad passes pollMs:
 * a start is one row change, and if that push is lost the iPad would sit out the whole race.
 */
export function useActiveRace(options: { pollMs?: number } = {}): LiveResult<RaceRow | null> {
  return useLive({
    key: 'active-race',
    load: () => getApi().getActiveRace(),
    tables: ['game_state', 'races'],
    pollMs: options.pollMs,
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
  /** Richest first, with each player's debt counted against them (see netWorth). */
  top: PlayerRow[]
  /** "Dagens största förlorare": lowest balance minus debt first. */
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
    () =>
      players ? { players, top: byNetWorth(players), losers: byLosses(players) } : undefined,
    [players],
  )
  return { data, error: live.error, reload: live.reload }
}

/** Kuskar are not in the Realtime publication; call reload() after GM edits. */
export function useKusks(): LiveResult<KuskRow[]> {
  return useLive({ key: 'kusks', load: () => getApi().getKusks(), tables: [] })
}

/**
 * The Butik catalogue. Realtime, unlike useKusks: stock has to drop on every phone the moment
 * someone else buys the last beer, not when the GM happens to reload.
 */
export function useShopItems(): LiveResult<ShopItemRow[]> {
  return useLive({
    key: 'shop-items',
    load: () => getApi().getShopItems(),
    tables: ['shop_items'],
    apply: (prev, change) => {
      const next = applyChange(prev, change, (row) => row as unknown as ShopItemRow)
      return next === prev ? prev : next.slice().sort((a, b) => a.sort - b.sort || a.price - b.price)
    },
  })
}

/** The Mystery Box contents, Realtime so a won prize leaves every phone's list at once. */
export function useBoxPrizes(): LiveResult<BoxPrizeRow[]> {
  return useLive({
    key: 'box-prizes',
    load: () => getApi().getBoxPrizes(),
    tables: ['box_prizes'],
    apply: (prev, change) => {
      const next = applyChange(prev, change, (row) => row as unknown as BoxPrizeRow)
      return next === prev ? prev : next.slice().sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
    },
  })
}

/** Everything sold tonight, newest first. Drives the GM feed and the display toasts. */
export function usePurchases(): LiveResult<PurchaseRow[]> {
  return useLive({
    key: 'purchases',
    load: () => getApi().getPurchases(),
    tables: ['purchases'],
    apply: (prev, change) => {
      const next = applyChange(prev, change, (row) => row as unknown as PurchaseRow)
      return next === prev ? prev : next.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
  })
}

/**
 * Every printed kupong, newest first. One hook for both readers: the display iPad toasts each
 * redemption, and /gm/kuponger counts what is left per omgång. A redemption arrives as an UPDATE,
 * which applyChange handles like any other row change.
 */
export function useCoupons(): LiveResult<CouponRow[]> {
  return useLive({
    key: 'coupons',
    load: () => getApi().getCoupons(),
    tables: ['coupons'],
    apply: (prev, change) => {
      const next = applyChange(prev, change, (row) => row as unknown as CouponRow)
      return next === prev ? prev : next.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
  })
}

/** Every vinstkort, newest first. The GM page's card list. */
export function usePrizeCards(): LiveResult<PrizeCardRow[]> {
  return useLive({
    key: 'prize-cards',
    load: () => getApi().getPrizeCards(),
    tables: ['prize_cards'],
    apply: (prev, change) => {
      const next = applyChange(prev, change, (row) => row as unknown as PrizeCardRow)
      return next === prev ? prev : next.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
  })
}

/** Vinstkort payouts tonight, newest first. The GM feed and the display toasts. */
export function usePrizeClaims(): LiveResult<PrizeClaimRow[]> {
  return useLive({
    key: 'prize-claims',
    load: () => getApi().getPrizeClaims(),
    tables: ['prize_claims'],
    apply: (prev, change) => {
      const next = applyChange(prev, change, (row) => row as unknown as PrizeClaimRow)
      return next === prev ? prev : next.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
  })
}

/** One player's receipts, newest first. */
export function usePlayerPurchases(playerId: string | null): LiveResult<PurchaseRow[]> {
  return useLive({
    key: playerId && `player-purchases:${playerId}`,
    load: () => getApi().getPlayerPurchases(playerId!),
    // Unfiltered: Realtime does not deliver filtered DELETEs (an Ångra from the GM).
    tables: ['purchases'],
    apply: (prev, change) => {
      const next = applyChange(prev, change, (row) => row as unknown as PurchaseRow, (p) => p.player_id === playerId)
      return next === prev ? prev : next.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
  })
}

/** Every Plånko drop tonight, newest first. The control phone's totals and the display toasts. */
export function usePlinkoDrops(): LiveResult<PlinkoDropRow[]> {
  return useLive({
    key: 'plinko-drops',
    load: () => getApi().getPlinkoDrops(),
    tables: ['plinko_drops'],
    apply: (prev, change) => {
      const next = applyChange(prev, change, (row) => row as unknown as PlinkoDropRow)
      return next === prev ? prev : next.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
  })
}

/** One player's Plånko drops, newest first. */
export function usePlayerPlinkoDrops(playerId: string | null): LiveResult<PlinkoDropRow[]> {
  return useLive({
    key: playerId && `player-plinko:${playerId}`,
    load: () => getApi().getPlayerPlinkoDrops(playerId!),
    // Unfiltered, like the purchases: a GM player delete arrives as an unfiltered DELETE.
    tables: ['plinko_drops'],
    apply: (prev, change) => {
      const next = applyChange(prev, change, (row) => row as unknown as PlinkoDropRow, (d) => d.player_id === playerId)
      return next === prev ? prev : next.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
  })
}

/**
 * Offset from this device's clock to the database clock, measured once and re-measured when the
 * connection comes back. The GM race replay runs off races.started_at (a server timestamp), so the
 * display iPad and the control phone need to agree on "now" even if a device clock drifts.
 * A failed measurement leaves the offset at 0, i.e. plain local time.
 */
export function useServerClock(): { now: () => number; offset: number } {
  const [offset, setOffset] = useState(0)
  const status = useConnection()
  const online = status === 'online'

  useEffect(() => {
    if (!online) return
    let cancelled = false
    const measure = async () => {
      const sentAt = Date.now()
      try {
        const serverMs = await getApi().serverNow()
        if (!cancelled) setOffset(usableOffset(measureOffset(serverMs, sentAt, Date.now())))
      } catch {
        // Keep the current offset; the local clock is the fallback.
      }
    }
    void measure()
    return () => {
      cancelled = true
    }
  }, [online])

  const now = useCallback(() => serverTime(offset), [offset])
  return { now, offset }
}
