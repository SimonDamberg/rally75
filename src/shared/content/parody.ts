// Sleazy betting-site dressing from the prototype, kept for the client parody layer (Stages 5-6).

export const TOAST_NAMN = ["Kenneth","Yvonne","Bosse","Ann-Christin","Roger","Siv","Conny","Birgitta","Leffe","Doris","Ronny","Agneta","Håkan","Gun","Örjan","Majken"] as const

export const CONNECT_LINES = [
  "Upprättar säker anslutning till Willemstad...",
  "Kontrollerar din geografiska position...",
  "Hittade dig. Det är okej.",
  "Laddar odds från tredjepartsleverantör...",
  "Accepterar villkoren åt dig...",
] as const

export const BONUS_BAR = "Välkomstbonus 500 % • Omsättningskrav 40x • Licensierad i Curaçao • 18+ • Spela lagom"

// Prototype said "Nat Casino Derby ... Nat Holdings Ltd"; rebranded for Rally75.
export const LEGAL_TEXT = "Rally75 drivs av Rally Holdings Ltd, reg.nr 000-000-000, Willemstad. Odds kan ändras utan förvarning. Vinster betalas ut i handling, sällskap eller inget alls. Bandomarnas beslut kan inte överklagas. Spelproblem? Prata med någon i köket."

export const KYC_TITLE = "Verifiera din identitet"
export const KYC_TEXT = "Enligt gällande regelverk måste vi veta ungefär vem du är innan du får spela. Ange valfritt namn. Vi kontrollerar ingenting."
export const KYC_PLACEHOLDER = "Namn, smeknamn eller lögn"
export const KYC_CONFIRM = "Jag intygar att detta stämmer"

export const EMPTY_BETS = "Inga spel lagda än. Ingen tror på något."
export const EMPTY_PAYOUTS = "Ingen spelade på det här loppet. Huset vinner ändå."
export const BETTING_SUBTITLE = "Odds rör sig med pengarna. Sista chansen."

/** "Bosse från Östhammar vann just 31 573 kr" */
export const fakeWinToast = (name: string, ort: string, kr: string) => `${name} från ${ort} vann just ${kr}`
