// Typed wrappers for every RPC and the public read queries. Takes a client so Node scripts
// can reuse it; never touches import.meta.env.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RaceStatus, Ruling } from '../shared/game/types'
import { toRallyError } from './errors'
import {
  toBet,
  toPlayer,
  toRace,
  type BetRow,
  type Identity,
  type KuskInputRow,
  type KuskRow,
  type NewPlayer,
  type PlayerRow,
  type RaceCardInput,
  type RaceRow,
  type RaceSecrets,
} from './types'

type Row = Record<string, unknown>

export function createApi(db: SupabaseClient) {
  async function rpc<T>(fn: string, args: Row): Promise<T> {
    let res
    try {
      res = await db.rpc(fn, args)
    } catch (err) {
      throw toRallyError(err)
    }
    if (res.error) throw toRallyError(res.error)
    return res.data as T
  }

  async function query<T>(run: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
    let res
    try {
      res = await run()
    } catch (err) {
      throw toRallyError(err)
    }
    if (res.error) throw toRallyError(res.error)
    return res.data as T
  }

  const cardArgs = (card: RaceCardInput) => ({
    p_field: card.horses,
    p_stats: card.stats,
    p_seed: card.seed,
    p_dist: card.dist,
    p_cond: card.cond,
  })

  return {
    // Reads ------------------------------------------------------------------------------

    async getActiveRaceId(): Promise<string | null> {
      const row = await query<{ active_race_id: string | null } | null>(() =>
        db.from('game_state').select('active_race_id').maybeSingle(),
      )
      return row?.active_race_id ?? null
    },

    async getRace(raceId: string): Promise<RaceRow | null> {
      const row = await query<Row | null>(() => db.from('races').select('*').eq('id', raceId).maybeSingle())
      return row ? toRace(row) : null
    },

    async getActiveRace(): Promise<RaceRow | null> {
      const row = await query<{ races: Row | null } | null>(() =>
        db.from('game_state').select('races(*)').maybeSingle(),
      )
      return row?.races ? toRace(row.races) : null
    },

    async getRaces(): Promise<RaceRow[]> {
      const rows = await query<Row[]>(() => db.from('races').select('*').order('race_no'))
      return rows.map(toRace)
    },

    async getRaceBets(raceId: string): Promise<BetRow[]> {
      const rows = await query<Row[]>(() => db.from('bets').select('*').eq('race_id', raceId).order('created_at'))
      return rows.map(toBet)
    },

    async getPlayerBets(playerId: string): Promise<BetRow[]> {
      const rows = await query<Row[]>(() =>
        db.from('bets').select('*').eq('player_id', playerId).order('created_at', { ascending: false }),
      )
      return rows.map(toBet)
    },

    async getPlayer(playerId: string): Promise<PlayerRow | null> {
      const row = await query<Row | null>(() => db.from('players').select('*').eq('id', playerId).maybeSingle())
      return row ? toPlayer(row) : null
    },

    async getPlayers(): Promise<PlayerRow[]> {
      const rows = await query<Row[]>(() => db.from('players').select('*').order('created_at'))
      return rows.map(toPlayer)
    },

    async getKusks(): Promise<KuskRow[]> {
      return query<KuskRow[]>(() => db.from('kusks').select('*').order('created_at').order('name'))
    },

    // Guest RPCs -------------------------------------------------------------------------

    createPlayer(name: string): Promise<NewPlayer> {
      return rpc('create_player', { p_name: name })
    },

    async placeBet(identity: Identity, raceId: string, horseN: number, stake: number): Promise<BetRow> {
      const row = await rpc<Row>('place_bet', {
        p_player_id: identity.playerId,
        p_token: identity.token,
        p_race_id: raceId,
        p_horse_n: horseN,
        p_stake: stake,
      })
      return toBet(row)
    },

    takeLoan(identity: Identity): Promise<PlayerRow> {
      return rpc('take_loan', { p_player_id: identity.playerId, p_token: identity.token })
    },

    /** Server-side odds (rounded), for the SQL/TS parity check. */
    async computeOdds(baseOdds: readonly number[], pools: readonly number[]): Promise<number[]> {
      const res = await rpc<unknown[]>('compute_odds', { p_base_odds: baseOdds, p_pools: pools })
      return res.map(Number)
    },

    // GM RPCs (password first) -----------------------------------------------------------

    gm: {
      login(password: string): Promise<boolean> {
        return rpc('gm_login', { p_password: password })
      },

      async createRace(password: string, card: RaceCardInput): Promise<RaceRow> {
        return toRace(await rpc<Row>('gm_create_race', { p_password: password, ...cardArgs(card) }))
      },

      async rerollRace(password: string, raceId: string, card: RaceCardInput): Promise<RaceRow> {
        return toRace(
          await rpc<Row>('gm_reroll_race', { p_password: password, p_race_id: raceId, ...cardArgs(card) }),
        )
      },

      async setStatus(password: string, raceId: string, status: RaceStatus): Promise<RaceRow> {
        return toRace(
          await rpc<Row>('gm_set_status', { p_password: password, p_race_id: raceId, p_status: status }),
        )
      },

      getSecrets(password: string, raceId: string): Promise<RaceSecrets> {
        return rpc('gm_get_secrets', { p_password: password, p_race_id: raceId })
      },

      /** `order` is the simulated finish order; the server applies the ruling. */
      async publishResult(
        password: string,
        raceId: string,
        order: readonly number[],
        ruling: Ruling,
        inquiryText: string | null,
      ): Promise<RaceRow> {
        return toRace(
          await rpc<Row>('gm_publish_result', {
            p_password: password,
            p_race_id: raceId,
            p_order: order,
            p_ruling: ruling,
            p_inquiry_text: inquiryText,
          }),
        )
      },

      adjustBalance(password: string, playerId: string, delta: number): Promise<PlayerRow> {
        return rpc('gm_adjust_balance', { p_password: password, p_player_id: playerId, p_delta: delta })
      },

      renamePlayer(password: string, playerId: string, name: string): Promise<PlayerRow> {
        return rpc('gm_rename_player', { p_password: password, p_player_id: playerId, p_name: name })
      },

      async deletePlayer(password: string, playerId: string): Promise<void> {
        await rpc('gm_delete_player', { p_password: password, p_player_id: playerId })
      },

      upsertKusk(password: string, kusk: KuskInputRow): Promise<KuskRow> {
        return rpc('gm_upsert_kusk', {
          p_password: password,
          p_id: kusk.id,
          p_name: kusk.name,
          p_title: kusk.title,
          p_notes: kusk.notes,
          p_active: kusk.active,
        })
      },

      async deleteKusk(password: string, kuskId: string): Promise<void> {
        await rpc('gm_delete_kusk', { p_password: password, p_id: kuskId })
      },

      /** Wipes players, bets and races. Keeps kuskar and the password. */
      async resetNight(password: string): Promise<void> {
        await rpc('gm_reset_night', { p_password: password })
      },
    },
  }
}

export type Api = ReturnType<typeof createApi>
