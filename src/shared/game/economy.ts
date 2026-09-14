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
