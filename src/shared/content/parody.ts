// Sleazy betting-site dressing from the prototype, used by the client parody layer.

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
  "Välkomstbonus 500 % • Licensierad i Atlantis • 13+ • Uttag inom 3 till 5 arbetsliv • Spela inte lagom";

// Prototype said "Nat Casino Derby ... Nat Holdings Ltd"; rebranded for the Mr Green umbrella.
// Rally23 Holdings stays: the racing product and the site share an owner, which is the joke.
export const LEGAL_TEXT =
  "Mr Green Nätcasino drivs av Rally23 Holdings Ltd, reg.nr 20230930, Atlantis. Odds kan ändras utan förvarning. Vinster betalas ut i handling, sällskap eller inget alls. Bandomarnas beslut kan inte överklagas. Spelproblem? Spela mer.";

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

// Stage 6: pop-up offers, fake social proof and small print ------------------------------------

export interface OfferCopy {
  id: string;
  kicker: string;
  title: string;
  text: string;
  cta: string;
  /** Toast after accepting. null sends the guest to Spela instead. */
  accepted: string | null;
  smallPrint: string;
}

export const OFFERS: readonly OfferCopy[] = [
  {
    id: "vip",
    kicker: "Endast idag",
    title: "VIP Platinum Diamant",
    text: "Du är handplockad bland alla som fick det här meddelandet. Som VIP får du samma odds, fast i guld.",
    cta: "Bli VIP nu",
    accepted: "Grattis, du är VIP. Förmånerna skickas med brevduva.",
    smallPrint:
      "VIP-status upphör vid midnatt, vid förlust eller när vi känner för det.",
  },
  {
    id: "deposit",
    kicker: "Insättningsbonus",
    title: "200 % på din insättning",
    text: "Sätt in 0 RallyMynt och få 0 RallyMynt extra. Matematiskt helt ärligt.",
    cta: "Sätt in nu",
    accepted: "Insättningen gick inte igenom. Prova med mer pengar.",
    smallPrint: "Omsättningskrav 40x på bonus, insättning, tröja och byxor.",
  },
  {
    id: "cashback",
    kicker: "Tröstpaket",
    title: "100 % cashback",
    text: "Förlorar du ikväll får du allt tillbaka*. Det lovar vi med handen på plånboken.",
    cta: "Aktivera cashback",
    accepted: "Cashback aktiverad. Utbetalas i form av tröst.",
    smallPrint: "*Återbetalas som en klapp på axeln från närmaste vuxen.",
  },
  {
    id: "boost",
    kicker: "Superboost",
    title: "Alla hästar vinner!",
    text: "Bara under nästa lopp: alla hästar vinner. Utom de som förlorar.",
    cta: "Spela nu",
    accepted: null,
    smallPrint: "Boosten gäller endast hästar som går i mål först.",
  },
  {
    id: "friend",
    kicker: "Värva en vän",
    title: "Ta med en vän",
    text: "Värva en vän och få en vän. Vännen får välkomstbonus, du får känslan av att ha gjort något.",
    cta: "Värva nu",
    accepted:
      "Peka din vän mot QR-koden på storbildsskärmen. Vi tar det därifrån.",
    smallPrint: "Vänskapen omfattas inte av insättningsgarantin.",
  },
  {
    id: "tip",
    kicker: "Expertens spik",
    title: "Dagens säkra spik",
    text: "Vår expert Lena har tittat djupt i hästarnas ögon. Hon vet vem som vinner. Hon säger det inte, men hon vet.",
    cta: "Spela på spiken",
    accepted: null,
    smallPrint: "Lena har inte vunnit sedan 1994.",
  },
];

export const OFFER_UI = {
  expires: "Går ut om",
  extended: "Förlängt! Bara för dig",
  decline: "Nej tack, jag gillar att förlora",
  terms: "Villkor gäller",
} as const;

export const PROOF = {
  viewers: "tittar",
  paid: "Utbetalt i kväll",
  someone: "En hemlig VIP",
  bet: (label: string, rm: string, horse: string) =>
    `${label} satsade ${rm} på ${horse}`,
  betsFolded: (n: number) => `${n} nya spel på loppet. Oddsen rör sig!`,
} as const;

/** Rotating small print under each guest screen, next to LEGAL_TEXT. */
export const SMALL_PRINT = [
  "Spel kan vara beroendeframkallande. Det är hela affärsidén.",
  "Mr Green saknar licens men drivs av väldigt fina personer",
  "Tidigare vinster är ingen garanti för framtida vinster. Tidigare förluster däremot.",
  "Alla odds är slutgiltiga tills de ändras.",
  "Uttag behandlas inom 3 till 5 arbetsliv.",
  "Genom att läsa detta har du godkänt villkoren.",
  "Huset vinner alltid. Huset är dessutom trevligt.",
] as const;

/** Stödlinje: a real phone number answered by a friend in costume. `lead` texts precede the link. */
export const STODLINJE = {
  label: "Stödlinje",
  /** E.164, for the tel: link. */
  number: "+46767767679",
  display: "076 776 76 79",
  callLabel: "Ring Stödlinjen",
  lead: {
    smallPrint: "Eller ring vår",
    loan: "Tveksam? Prata med någon som inte vill åt dina pengar:",
    debt: "Skuld? Vår vän tar emot samtal dygnet runt:",
    loss: "Hästen hade en dålig dag. Det kan du också ha:",
    kyc: "Frågor om verifieringen? Vår kundtjänst är (typ) en människa:",
  },
} as const;
