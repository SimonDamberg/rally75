// Economy constants. Mirrored in SQL (supabase/migrations/*_rpc_client.sql); change both together.

/** Balance given to every new player. */
export const WELCOME_BONUS = 1000
/** Smallest accepted stake. A player below this is broke and may take a Snabblån. */
export const MIN_STAKE = 10
/**
 * Below this balance a player is broke and may take a Snabblån. Higher than MIN_STAKE because Plånko
 * pays odd amounts and leaves guests on 23 RM, which is technically money and practically nothing.
 * Mirrored in *_loan_threshold.sql.
 */
export const LOAN_THRESHOLD = 50
/** RM paid out by one Snabblån. */
export const LOAN_AMOUNT = 500
/** Debt added by one Snabblån (the absurd interest is the joke). */
export const LOAN_DEBT = 1337
/** Longest allowed player name, after trimming. */
export const MAX_NAME_LENGTH = 24

/**
 * Printed kupong tiers (`*_coupons.sql` mirrors the caps below, not these amounts: the GM page sends
 * the value with the call, so the tiers are a starting point Simon can override).
 *
 * A kupong is the one thing in the game that is **not** rank neutral. Its RM lands in
 * `players.balance` and nowhere else, so unlike a Butik purchase or a debt repayment it does move
 * you on Toppen and on `nightNet`. Winning at dart is meant to be worth something, which is also
 * why the value and the batch size are capped in SQL: this is the only RM the GM can mint at will.
 */
export const COUPON_TIERS = [
  { tier: 1, amount: 250 },
  { tier: 2, amount: 500 },
  { tier: 3, amount: 1000 },
] as const

export type CouponTier = (typeof COUPON_TIERS)[number]['tier']

/** Most RM one kupong may be worth. */
export const COUPON_MAX_AMOUNT = 5000
/** Most kuponger one print run may mint. */
export const COUPON_MAX_BATCH = 200
/** Characters in a printed code (Crockford base32, so 2^40 possibilities). */
export const COUPON_CODE_LENGTH = 8

/**
 * Vinstkort: reusable printed cards the game runners carry and flash at a winner, scanned inside the
 * guest app. Unlike a kupong, the value is fixed by the tier in SQL (`*_prize_cards.sql` checks the
 * pair), so these amounts are the mirror, not a suggestion. Not rank neutral, like a kupong.
 */
export const PRIZE_CARD_TIERS = [
  { tier: 1, amount: 100 },
  { tier: 2, amount: 500 },
  { tier: 3, amount: 1000 },
] as const

export type PrizeCardTier = (typeof PRIZE_CARD_TIERS)[number]['tier']

/** Seconds a guest waits between two vinstkort claims (any card). Stops a double scan of one flash. */
export const PRIZE_CARD_COOLDOWN_S = 5

/**
 * What a player actually owns: the balance with the debt taken off and the Butik spending added
 * back. This is what the Topplista ranks on, so a stack of Snabblån cannot buy a place at the top,
 * and a round of beers from the svarta marknaden cannot cost you one: the money leaves the balance
 * but never the rank.
 */
export function netWorth(player: { balance: number; debt: number; spent: number }): number {
  return player.balance - player.debt + player.spent
}

/**
 * How far ahead or behind a player is for the night, counted from zero.
 *
 * The welcome bonus is not winnings, so it has to come back off: someone who never placed a bet
 * sits on WELCOME_BONUS and is break even, not 1000 RM up. Debt counts against you in full (you
 * received LOAN_AMOUNT but owe LOAN_DEBT), which is the joke.
 */
export function nightNet(player: { balance: number; debt: number; spent: number }): number {
  return netWorth(player) - WELCOME_BONUS
}
