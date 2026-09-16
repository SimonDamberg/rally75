// Swedish error copy. Codes match the exceptions raised by the SQL RPCs
// (supabase/migrations/*_rpc_*.sql) plus client-side network/config errors.

export const ERROR_MESSAGES = {
  // Guest
  player_not_found: 'Vi hittar inte ditt konto. Det kan ha raderats av spelledaren.',
  invalid_token: 'Din inloggning gäller inte längre.',
  name_empty: 'Skriv ett namn först.',
  name_too_long: 'Namnet är för långt (max 24 tecken).',
  race_not_found: 'Loppet finns inte.',
  race_not_betting: 'Spelet är stängt för det här loppet.',
  horse_not_found: 'Hästen finns inte i det här loppet.',
  stake_too_low: 'Minsta insats är 10 RM.',
  insufficient_balance: 'Du har inte råd med den insatsen. Snabblån finns, tyvärr.',
  loan_not_allowed: 'Du har fortfarande pengar kvar. Spela upp dem först.',
  // Game master
  gm_unauthorized: 'Fel lösenord.',
  gm_no_password: 'Inget spelledarlösenord är satt i databasen.',
  invalid_field: 'Fältet är ogiltigt.',
  race_in_progress: 'Avsluta eller stryk pågående lopp först.',
  race_not_paddock: 'Fältet kan bara slumpas om i paddocken.',
  race_not_running: 'Loppet pågår inte.',
  invalid_transition: 'Det steget går inte just nu.',
  invalid_order: 'Resultatordningen är ogiltig.',
  invalid_ruling: 'Okänt domslut.',
  balance_negative: 'Saldot kan inte bli negativt.',
  bad_run_ms: 'Ogiltig looptid.',
  kusk_not_found: 'Kusken finns inte.',
  // Client side
  network: 'Ingen anslutning. Försöker igen...',
  config: 'Rally75 saknar serverinställningar.',
  unknown: 'Något gick fel. Försök igen.',
} as const

export type ErrorCode = keyof typeof ERROR_MESSAGES
