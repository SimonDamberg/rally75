// Sleazy betting-site dressing from the prototype, kept for the client parody layer (Stages 5-6).

export const TOAST_NAMN = [
  "Kerstin",
  "Yvonne",
  "Ann-Kristin",
  "Siv",
  "Birgitta",
  "Doris",
  "Agneta",
  "Gun",
  "Annika",
  "Ewa",
  "Lena",
  "Anette",
] as const;

export const CONNECT_LINES = [
  "Kontrollerar din geografiska position...",
  "Hittade dig. Hur mår du egentligen?",
  "Laddar odds från tredjepartsleverantör...",
  "Accepterar villkoren åt dig...",
] as const;

export const BONUS_BAR =
  "Välkomstbonus 500 % • Licensierad i Atlantis • 13+ • Spela lagom";

// Prototype said "Nat Casino Derby ... Nat Holdings Ltd"; rebranded for Rally75.
export const LEGAL_TEXT =
  "Rally75 drivs av Rally23 Holdings Ltd, reg.nr 20230930, Atlantis. Odds kan ändras utan förvarning. Vinster betalas ut i handling, sällskap eller inget alls. Bandomarnas beslut kan inte överklagas. Spelproblem? Spela mer.";

export const KYC_TITLE = "Verifiera din identitet";
export const KYC_TEXT =
  "Enligt gällande regelverk måste vi veta ungefär vem du är innan du får spela. Ange valfritt namn. Vi kontrollerar ingenting.";
export const KYC_PLACEHOLDER = "Namn, smeknamn eller lögn";
export const KYC_CONFIRM = "Jag intygar att detta stämmer";

export const EMPTY_BETS = "Inga spel lagda än. Ingen tror på något.";
export const EMPTY_PAYOUTS =
  "Ingen spelade på det här loppet. Huset vinner ändå.";
export const BETTING_SUBTITLE = "Odds rör sig med pengarna. Sista chansen.";

/** "Bosse från Östhammar vann just 31 573 RM" */
export const fakeWinToast = (name: string, ort: string, amount: string) =>
  `${name} från ${ort} vann just ${amount}`;
