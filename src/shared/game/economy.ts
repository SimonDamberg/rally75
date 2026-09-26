// Economy constants. Mirrored in SQL (the newest migration defining each RPC); change both together.

/** Balance given to every new player. */
export const WELCOME_BONUS = 100
/** Smallest accepted stake. A player below this is broke and may take a Snabblån. */
export const MIN_STAKE = 10
/**
 * Below this balance a player is broke and may take a Snabblån. Higher than MIN_STAKE because Plånko
 * pays odd amounts and leaves guests on 23 RM, which is technically money and practically nothing.
 * Mirrored in *_loan_threshold.sql.
 */
export const LOAN_THRESHOLD = 50
/** RM paid out by one Snabblån. */
export const LOAN_AMOUNT = 100
/** Debt added by one Snabblån (the absurd interest is the joke). */
export const LOAN_DEBT = 1337
/** Longest allowed player name, after trimming. */
export const MAX_NAME_LENGTH = 24

/**
 * Printed kupong tiers (`*_coupons.sql` mirrors the caps below, not these amounts: the GM page sends
 * the value with the call, so the tiers are a starting point Simon can override).
 *
 * A kupong's RM lands in `players.balance` and is spendable like any other, but it is also counted
 * in `players.coupon_rm`, which netWorth takes back off: printed kuponger do not move the Topplista
 * (Simon's call; vinstkort do). The value and the batch size are still capped in SQL, since this is
 * the only RM the GM can mint at will.
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

/** Most marker (chips for the physical games) one buy_markers call may take. Mirrored in *_markers.sql. */
export const MARKER_MAX_QTY = 100

/**
 * Fewest marker the Butik sells at once (a handful for one game). Client side only: buy_markers still
 * accepts 1, so a stale phone cannot hit an error mid-party.
 */
export const MARKER_MIN_QTY = 3

/** Seconds a guest waits between two vinstkort claims (any card). Stops a double scan of one flash. */
export const PRIZE_CARD_COOLDOWN_S = 5

/** What the Topplista reads off a player row. */
export interface Standing {
  balance: number
  debt: number
  spent: number
  /** Snabblån taken. Treated as 0 when absent. */
  loans_taken?: number
  /** RM paid in from printed kuponger (players.coupon_rm). Treated as 0 when absent. */
  coupon_rm?: number
}

/**
 * The Topplista score plus the welcome bonus: total gained for the night, from WELCOME_BONUS
 * (Simon's call). What counts is Rally75, Plånko and vinstkort winnings, minus LOAN_AMOUNT per
 * Snabblån, minus the marker. Everything else is taken back out of the balance:
 *
 * - Butik spending on the bar and the Mystery Box is added back (`spent`). Marker never enter
 *   `spent` (*_markers_count.sql), so they cost you like a bet.
 * - A Snabblån hands over LOAN_AMOUNT and books LOAN_DEBT. The debt comes off and each loan adds
 *   LOAN_DEBT - LOAN_AMOUNT back, so taking one is neutral and losing it costs LOAN_AMOUNT.
 *   Repaying moves the same RM out of balance and debt, which nets to nothing.
 * - Printed kuponger pay into the balance but are not winnings here (`coupon_rm`, *_coupon_rm.sql).
 */
export function netWorth(player: Standing): number {
  const loans = player.loans_taken ?? 0
  return player.balance - player.debt + player.spent + (LOAN_DEBT - LOAN_AMOUNT) * loans - (player.coupon_rm ?? 0)
}

/**
 * How far ahead or behind a player is for the night, counted from zero: the Topplista number.
 * The welcome bonus is not winnings, so someone who never placed a bet is break even.
 */
export function nightNet(player: Standing): number {
  return netWorth(player) - WELCOME_BONUS
}
