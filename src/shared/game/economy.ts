// Economy constants. Mirrored in SQL (supabase/migrations/*_rpc_client.sql); change both together.

/** Balance given to every new player. */
export const WELCOME_BONUS = 1000
/** Smallest accepted stake. A player below this is broke and may take a Snabblån. */
export const MIN_STAKE = 10
/** RM paid out by one Snabblån. */
export const LOAN_AMOUNT = 500
/** Debt added by one Snabblån (the absurd interest is the joke). */
export const LOAN_DEBT = 1337
/** Longest allowed player name, after trimming. */
export const MAX_NAME_LENGTH = 24

/**
 * What a player actually owns: the balance with the debt taken off and the Butik spending added
 * back. This is what the Topplista ranks on, so a stack of Snabblån cannot buy a place at the top,
 * and a round of beers from the svarta marknaden cannot cost you one. Spending has its own list
 * ("Kvällens största slösare"), which ranks on `spent`.
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
