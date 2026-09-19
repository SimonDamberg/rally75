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
  type CouponBatch,
  type CouponRow,
  type Identity,
  type KuskInputRow,
  type KuskRow,
  type NewPlayer,
  type PlayerRow,
  type PlinkoDropRow,
  type PurchaseRow,
  type RaceCardInput,
  type RaceRow,
  type RaceSecrets,
  type ShopItemInputRow,
  type ShopItemRow,
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

    /**
     * Sum of every winning payout tonight ("Utbetalt i kväll"). Aggregated server-side: summing
     * the rows here would cap out at PostgREST's 1000-row default and ship the whole winners
     * list to every phone after each race.
     */
    async getNightPaid(): Promise<number> {
      return Number(await rpc<number | string>('night_paid', {}))
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

    /** The Butik catalogue, in the order the GM put it in. Inactive items come along; the shop hides them. */
    async getShopItems(): Promise<ShopItemRow[]> {
      return query<ShopItemRow[]>(() => db.from('shop_items').select('*').order('sort').order('price'))
    },

    /** One player's receipts, newest first. */
    async getPlayerPurchases(playerId: string): Promise<PurchaseRow[]> {
      return query<PurchaseRow[]>(() =>
        db.from('purchases').select('*').eq('player_id', playerId).order('created_at', { ascending: false }),
      )
    },

    /** Everything sold tonight, newest first. Drives the GM feed and the display toasts. */
    async getPurchases(limit = 200): Promise<PurchaseRow[]> {
      return query<PurchaseRow[]>(() =>
        db.from('purchases').select('*').order('created_at', { ascending: false }).limit(limit),
      )
    },

    /** One player's Plånko drops, newest first. */
    async getPlayerPlinkoDrops(playerId: string): Promise<PlinkoDropRow[]> {
      return query<PlinkoDropRow[]>(() =>
        db.from('plinko_drops').select('*').eq('player_id', playerId).order('created_at', { ascending: false }),
      )
    },

    /** Every Plånko drop tonight, newest first. Drives the GM totals and the display toasts. */
    async getPlinkoDrops(limit = 1000): Promise<PlinkoDropRow[]> {
      return query<PlinkoDropRow[]>(() =>
        db.from('plinko_drops').select('*').order('created_at', { ascending: false }).limit(limit),
      )
    },

    /**
     * Every printed kupong, newest first. No codes: those are in coupon_secrets, which no browser
     * can read. Drives the display toasts and the counts on /gm/kuponger.
     */
    async getCoupons(limit = 500): Promise<CouponRow[]> {
      return query<CouponRow[]>(() =>
        db.from('coupons').select('*').order('created_at', { ascending: false }).limit(limit),
      )
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

    /** Pays RM off the Snabblån debt. Floored: a fractional amount would fail Postgres' int cast. */
    async repayDebt(identity: Identity, amount: number): Promise<PlayerRow> {
      return toPlayer(
        await rpc<Row>('repay_debt', {
          p_player_id: identity.playerId,
          p_token: identity.token,
          p_amount: Math.floor(amount),
        }),
      )
    },

    /** Spends RM in the Butik. The server captures the price, so a stale catalogue cannot cheat. */
    buyItem(identity: Identity, itemId: string): Promise<PurchaseRow> {
      return rpc('buy_item', { p_player_id: identity.playerId, p_token: identity.token, p_item_id: itemId })
    },

    /**
     * Drops one Plånko ball. The server draws the path and pays out before this resolves, so the
     * balance has already moved by the time the phone starts animating.
     */
    plinkoDrop(identity: Identity, stake: number): Promise<PlinkoDropRow> {
      return rpc('plinko_drop', { p_player_id: identity.playerId, p_token: identity.token, p_stake: Math.floor(stake) })
    },

    /**
     * Cashes in a printed kupong. The server normalises the code (case, dashes, the Crockford
     * lookalikes) and refuses one that is already stamped, so a second scan always loses.
     */
    redeemCoupon(identity: Identity, code: string): Promise<CouponRow> {
      return rpc('redeem_coupon', {
        p_player_id: identity.playerId,
        p_token: identity.token,
        p_code: code,
      })
    },

    /**
     * Database clock, for measuring this device's offset. The race replay runs off
     * races.started_at, so the display and the control device must agree on "now".
     */
    async serverNow(): Promise<number> {
      return Date.parse(await rpc<string>('server_now', {}))
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

      /**
       * Snabbspola: drags started_at back by the timeline length so the race is at its last frame.
       * Goes through the server so the display device follows over Realtime.
       */
      async skipRace(password: string, raceId: string, runMs: number): Promise<RaceRow> {
        return toRace(
          await rpc<Row>('gm_skip_race', { p_password: password, p_race_id: raceId, p_run_ms: Math.round(runMs) }),
        )
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

      upsertShopItem(password: string, item: ShopItemInputRow): Promise<ShopItemRow> {
        return rpc('gm_upsert_shop_item', {
          p_password: password,
          p_id: item.id,
          p_name: item.name,
          p_blurb: item.blurb,
          p_price: item.price,
          p_stock: item.stock,
          p_kind: item.kind,
          p_effect: item.effect,
          p_effect_value: item.effect_value,
          p_sort: item.sort,
          p_active: item.active,
        })
      },

      async deleteShopItem(password: string, itemId: string): Promise<void> {
        await rpc('gm_delete_shop_item', { p_password: password, p_id: itemId })
      },

      /** Ångra: refunds the RM, restocks the shelf and deletes the receipt. Keeps any title or badge. */
      refundPurchase(password: string, purchaseId: string): Promise<PurchaseRow> {
        return rpc('gm_refund_purchase', { p_password: password, p_id: purchaseId })
      },

      /**
       * Mints a print run and returns the plaintext codes. They are readable here and in
       * batchCodes and nowhere else, so whatever calls this is also what prints them.
       */
      createCoupons(
        password: string,
        tier: number,
        amount: number,
        label: string,
        count: number,
      ): Promise<CouponBatch> {
        return rpc('gm_create_coupons', {
          p_password: password,
          p_tier: tier,
          p_amount: amount,
          p_label: label,
          p_count: count,
        })
      },

      /** Reads a print run's codes back out, for reprinting a sheet. */
      batchCodes(password: string, batch: string): Promise<CouponBatch> {
        return rpc('gm_batch_codes', { p_password: password, p_batch: batch })
      },

      /** Ångra: takes the RM back off the balance and frees the kupong to be claimed again. */
      voidClaim(password: string, couponId: string): Promise<CouponRow> {
        return rpc('gm_void_claim', { p_password: password, p_id: couponId })
      },

      /** Throws away a whole print run, codes included. Returns how many kuponger went. */
      deleteCouponBatch(password: string, batch: string): Promise<number> {
        return rpc('gm_delete_coupon_batch', { p_password: password, p_batch: batch })
      },

      /** Wipes players, bets and races. Keeps kuskar and the password. */
      async resetNight(password: string): Promise<void> {
        await rpc('gm_reset_night', { p_password: password })
      },
    },
  }
}

export type Api = ReturnType<typeof createApi>
