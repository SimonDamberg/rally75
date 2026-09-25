// Row types for the Supabase tables and RPC results. Hand-written (not generated) so the jsonb
// columns carry the real shared game types. Keep in sync with supabase/migrations/.
import type { BoxRarity } from "../shared/game/box";
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

/** 'box' is the Mystery Box: opened with open_box, never bought with buy_item. */
export type ShopKind = "physical" | "digital" | "box";

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
  /** A file name under public/butik/; '' draws the fallback tile. */
  image: string;
  created_at: string;
}

/** One prize in the Mystery Box. Physical, counted, and gone from the box once won. */
export interface BoxPrizeRow {
  id: string;
  name: string;
  blurb: string;
  /** A file name under public/butik/; '' draws the fallback tile. */
  image: string;
  rarity: BoxRarity;
  stock: number;
  sort: number;
  active: boolean;
  created_at: string;
}

export interface BoxPrizeInputRow {
  /** null creates a new prize. */
  id: string | null;
  name: string;
  blurb: string;
  image: string;
  rarity: BoxRarity;
  stock: number;
  sort: number;
  active: boolean;
}

export interface PurchaseRow {
  id: string;
  player_id: string;
  /** null once the GM deletes the item; item_name is the snapshot that survives. */
  item_id: string | null;
  item_name: string;
  kind: ShopKind;
  price: number;
  /** Set on a Mystery Box opening: what came out of the box (snapshots, like item_name). */
  prize_id: string | null;
  prize_name: string | null;
  prize_rarity: BoxRarity | null;
  created_at: string;
}

/** One Plånko ball: drawn and paid by plinko_drop in one transaction. */
export interface PlinkoDropRow {
  id: string;
  player_id: string;
  stake: number;
  /** 12-bit mask, bit i set = bounce right at row i. */
  path: number;
  slot: number;
  /** Multiplier in tenths of the stake. */
  m10: number;
  /** Stake included; 0 is not possible, the lowest slot pays 0,3x. */
  payout: number;
  /** The player's balance right after this drop (what the header shows once the ball lands). */
  balance_after: number;
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
  image: string;
}

/**
 * A printed kupong. The code itself is never here: it lives in coupon_secrets, which no browser can
 * read. `redeemed_at` is the authority on whether a ticket is spent, since deleting a player only
 * clears `redeemed_by`.
 */
export interface CouponRow {
  id: string;
  /** 1 brons, 2 silver, 3 guld. */
  tier: number;
  /** What the guest is paid. */
  amount: number;
  /** What the ticket says when it says more than it pays (the bonuskupong prank), else null. */
  face: number | null;
  /** Which game handed it out ("Dart"); '' when the GM left it blank. */
  label: string;
  /** One print run. */
  batch: string;
  created_at: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
}

/** Returned once by gm_create_coupons or gm_batch_codes. The only time codes are readable. */
export interface CouponBatch {
  batch: string;
  coupons: { id: string; code: string }[];
}

/**
 * A vinstkort: a reusable printed card a game runner flashes at a winner. The code is never here:
 * it lives in prize_card_secrets, which no browser can read.
 */
export interface PrizeCardRow {
  id: string;
  /** 1 = 100, 2 = 500, 3 = 1 000 RM. */
  tier: number;
  amount: number;
  /** Which game carries it ("Dart"); '' when the GM left it blank. */
  label: string;
  /** Off: scans are refused with card_inactive. */
  active: boolean;
  created_at: string;
}

/** One payout from a vinstkort. tier, amount and label are snapshots of the card. */
export interface PrizeClaimRow {
  id: string;
  /** null once the card has been deleted. */
  card_id: string | null;
  player_id: string;
  tier: number;
  amount: number;
  label: string;
  created_at: string;
}

/** Returned by the GM RPCs that mint, reprint or rotate a card. The only time a code is readable. */
export interface PrizeCardCode {
  id: string;
  code: string;
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
