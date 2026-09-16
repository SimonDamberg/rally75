// Row types for the Supabase tables and RPC results. Hand-written (not generated) so the jsonb
// columns carry the real shared game types. Keep in sync with supabase/migrations/.
import type {
  BetStatus,
  HorsePublic,
  HorseStats,
  RaceStatus,
  Ruling,
} from "../shared/game/types";

export interface PlayerRow {
  id: string;
  name: string;
  /** Random 10..99, shown as "Simon #42". */
  tag: number;
  balance: number;
  debt: number;
  loans_taken: number;
  /** RM left in the Butik. Added back by netWorth, so buying never costs you a place. */
  spent: number;
  /** Bought in the Butik: a title under the name on the Topplista. '' when nothing is bought. */
  title: string;
  /** Bought in the Butik: an emoji in front of the name. '' when nothing is bought. */
  badge: string;
  created_at: string;
}

export interface RaceResult {
  /** Official order after the ruling, winner first. */
  order: number[];
  /** The simulated finish order the GM published. */
  original_order: number[];
  ruling: Ruling;
  inquiry_text: string | null;
}

export interface RaceRow {
  id: string;
  race_no: number;
  status: RaceStatus;
  dist: string;
  cond: string;
  field: HorsePublic[];
  result: RaceResult | null;
  created_at: string;
  betting_at: string | null;
  closed_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface BetRow {
  id: string;
  player_id: string;
  race_id: string;
  horse_n: number;
  stake: number;
  /** Odds captured at placement. */
  odds: number;
  /** null while open; stake for a refunded void, 0 for lost or house-kept void. */
  payout: number | null;
  status: BetStatus;
  created_at: string;
}

export interface KuskRow {
  id: string;
  name: string;
  title: string;
  notes: string[];
  active: boolean;
  created_at: string;
}

/** What an item grants beyond the receipt. Never anything that touches the game. */
export type ShopEffect = "none" | "title" | "badge";

export type ShopKind = "physical" | "digital";

export interface ShopItemRow {
  id: string;
  name: string;
  blurb: string;
  price: number;
  /** null = obegränsat; 0 = slutsålt. */
  stock: number | null;
  kind: ShopKind;
  effect: ShopEffect;
  /** The title text or the badge emoji; '' when effect is 'none'. */
  effect_value: string;
  sort: number;
  active: boolean;
  created_at: string;
}

export interface PurchaseRow {
  id: string;
  player_id: string;
  /** null once the GM deletes the item; item_name is the snapshot that survives. */
  item_id: string | null;
  item_name: string;
  kind: ShopKind;
  price: number;
  created_at: string;
}

export interface ShopItemInputRow {
  /** null creates a new item. */
  id: string | null;
  name: string;
  blurb: string;
  price: number;
  /** null = obegränsat. */
  stock: number | null;
  kind: ShopKind;
  effect: ShopEffect;
  effect_value: string;
  sort: number;
  active: boolean;
}

export interface GameStateRow {
  id: boolean;
  active_race_id: string | null;
}

export interface RaceSecrets {
  stats: HorseStats[];
  seed: number;
}

/** Returned once by create_player. Store it; the token is never readable again. */
export interface NewPlayer {
  id: string;
  token: string;
  tag: number;
}

export interface Identity {
  playerId: string;
  token: string;
}

/** A generated race card as sent to gm_create_race / gm_reroll_race. */
export interface RaceCardInput {
  horses: HorsePublic[];
  stats: HorseStats[];
  seed: number;
  dist: string;
  cond: string;
}

export interface KuskInputRow {
  /** null creates a new kusk. */
  id: string | null;
  name: string;
  title: string;
  notes: string[];
  active: boolean;
}

// numeric columns may arrive as strings (Realtime); normalize at the edge.

export function toBet(row: Record<string, unknown>): BetRow {
  return { ...(row as unknown as BetRow), odds: Number(row.odds) };
}

export function toPlayer(row: Record<string, unknown>): PlayerRow {
  return row as unknown as PlayerRow;
}

export function toRace(row: Record<string, unknown>): RaceRow {
  return row as unknown as RaceRow;
}
