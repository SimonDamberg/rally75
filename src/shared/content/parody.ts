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
  "Pia",
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
    text: "Förlorar du idag får du allt tillbaka*. Det lovar vi med handen på plånboken.",
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
  viewers: "spelar",
  paid: "Utbetalt idag",
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
    landing: "Öppen dygnet runt, bemannad av en vän i kostym:",
  },
} as const;

// Landing page ----------------------------------------------------------------------------------
// What a phone with no account sees first: an overhyped casino homepage in front of the sign-up.
// Every button leads to the same place (the KYC form), which is the joke.

export interface LandingProduct {
  id: "rally" | "plinko" | "butik";
  kicker: string;
  title: string;
  text: string;
  /** Label + value pairs, like a real casino's game tile. */
  stats: readonly (readonly [string, string])[];
}

export interface LandingReview {
  text: string;
  who: string;
}

export interface LandingFaq {
  q: string;
  a: string;
}

export const LANDING = {
  login: "Logga in",
  kupong: {
    title: "Du har en kupong som väntar",
    text: "Skapa ett konto så betalar vi ut den direkt. Det enda vi någonsin betalar ut direkt.",
  },
  hero: {
    kicker: "Trav, skrap och andra sätt att bli av med pengar.",
    /** Follows the bonus amount, which is rendered from WELCOME_BONUS. */
    headline: "i välkomstbonus",
    sub: "Helt gratis. Utan insättning, utan krav, utan eftertanke.",
    cta: "Hämta bonusen",
    footnote: "Störst i Atlantis",
  },
  ticker: "Senaste vinsterna",
  shelf: {
    title: "Våra spel",
    sub: "Handplockade för att du ska stanna.",
    cta: "Spela",
  },
  products: [
    {
      id: "rally",
      kicker: "Officiell travpartner",
      title: "Rally75",
      text: "Riktiga hästar, påhittade chanser. Loppen körs live på storbildsskärmen och du spelar från telefonen.",
      stats: [
        ["Återbetalning", "Ibland"],
        ["Hästar", "4 per lopp"],
      ],
    },
    {
      id: "plinko",
      kicker: "Droppa kulor som om det vore hjälprebusar",
      title: "Plånko",
      text: "Töm plånboken, en kula i taget. Fysik har aldrig varit så dyrt.",
      stats: [
        ["Max vinst", "100x"],
        ["Min vinst", "Tröst"],
      ],
    },
    {
      id: "butik",
      kicker: "Svarta marknaden",
      title: "Butiken",
      text: "Byt dina RallyMynt mot riktiga vinster. Kvitto ingår, ånger ingår inte.",
      stats: [
        ["Öppet", "Tills det tar slut"],
        ["Returrätt", "Nej"],
      ],
    },
  ] as readonly LandingProduct[],
  steps: {
    title: "Så enkelt är det",
    items: [
      ["Ange ett namn", "Vilket som helst. Vi kontrollerar ingenting."],
      // No-break space, as fmtRm writes it; a test ties this to WELCOME_BONUS.
      ["Få 100\u00a0RM", "Insatt direkt, utan en enda fråga om varför."],
      ["Förlora dem i lugn och ro", "Eller snabbt. Vi dömer ingen."],
    ] as readonly (readonly [string, string])[],
  },
  reviews: {
    title: "Vad våra spelare säger",
    items: [
      {
        text: "Jag har aldrig varit så nära en vinst. Två gånger idag!",
        who: "Kerstin, Tierp",
      },
      {
        text: "Köpte en shot i Butiken för hela min förmögenhet. Den var god.",
        who: "Bosse, Östhammar",
      },
      {
        text: "Snabblånet ändrade mitt liv. Jag vet bara inte åt vilket håll än.",
        who: "Agneta, Knivsta",
      },
      {
        text: "Kundtjänst svarade direkt. Han var utklädd, men han lyssnade.",
        who: "Gun, Sala",
      },
    ] as readonly LandingReview[],
  },
  /** Trust seals: [label, value]. */
  badges: [
    ["Licens", "Atlantis"],
    ["Ålder", "13+"],
    ["Spelpaus", "Nej"],
    ["Krypterat", "Typ"],
    ["Certifierat", "Av oss"],
  ] as readonly (readonly [string, string])[],
  faq: {
    title: "Vanliga frågor",
    items: [
      {
        q: "Är det här lagligt?",
        a: "Vi har en licens från Atlantis och en jurist som heter Lena. Båda är lika verkliga.",
      },
      {
        q: "Kan jag ta ut mina vinster?",
        a: "Ja, i Butiken. Allt annat behandlas inom 3 till 5 arbetsliv.",
      },
      {
        q: "Vad händer om jag förlorar allt?",
        a: "Då erbjuder vi ett Snabblån med en ränta som gör oss mycket glada. Vill du hellre prata med någon finns vår stödlinje.",
      },
      {
        q: "Varför har ni redan kryssat i åldersrutan?",
        a: "För att spara tid åt dig. Vi tänker alltid på dig först, och på dina pengar strax därefter.",
      },
      {
        q: "Hur lång tid tar det att komma igång?",
        a: "Under en minut. Att sluta tar längre tid.",
      },
    ] as readonly LandingFaq[],
  },
  final: {
    title: "Bonusen väntar inte för evigt",
    text: "Den väntar ungefär en minut. Sen förlänger vi den. Men ändå.",
    cta: "Ja, ge mig pengarna",
  },
  finePrint:
    "Välkomstbonusen betalas ut i RallyMynt, som saknar värde utanför det här Rebusrallyt och i viss mån även i det. Bonusen omfattas av ett omsättningskrav på 40x, som vi har valt att inte kontrollera. Mr Green förbehåller sig rätten att ändra odds, regler, öppettider och personlighet utan förvarning. Recensionerna är äkta i den meningen att någon har skrivit dem. Siffran under Utbetalt idag är avrundad uppåt, ibland kraftigt. Genom att scrolla hit har du godkänt samtliga villkor, även de vi inte har skrivit än.",
} as const;
