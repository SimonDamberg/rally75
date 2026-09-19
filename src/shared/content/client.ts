// Swedish copy for the guest app (src/client): onboarding, betting, result reveal, Snabblån,
// my bets and the leaderboard. Parody strings shared with the prototype stay in parody.ts.

// Tab labels. The game tabs carry product names (Rally75 now, the skraplott later) so the shelf
// under the Mr Green umbrella reads as a shelf.
export const CLIENT_TABS = {
  home: 'Rally75',
  plinko: 'Plånko',
  bets: 'Mina spel',
  bank: 'Bank',
  butik: 'Butik',
  board: 'Topplista',
} as const

export const ONBOARDING = {
  connectTitle: 'Upprättar säker anslutning',
  skip: 'Tryck för att hoppa över',
  nameLabel: 'Namn',
  ageLabel: 'Jag är minst 13 år gammal',
  ageLocked: 'Obligatoriskt. Vi har redan kryssat i åt dig.',
  lossLabel: 'Hur mycket tänker du förlora idag?',
  lossOptions: ['Lite', 'Allt', 'Mer än allt'],
  originLabel: 'Var har du dina pengar?',
  originPlaceholder: 'Valfritt. Vi läser det ändå inte.',
  creating: 'Verifierar',
  bonusTitle: 'Välkomstbonus!',
  bonusText: 'Insatt på ditt konto. Helt utan omsättningskrav (just idag).',
  bonusGreeting: (label: string) => `Välkommen, ${label}`,
  bonusCta: 'Till spelet',
} as const

export const COOKIES = {
  title: 'Vi använder kakor',
  text: 'Vi och våra 1 337 partner lagrar allt om dig för att ge dig en personlig spelupplevelse och sälja resten.',
  acceptAll: 'Acceptera alla',
  necessary: 'Endast nödvändiga',
  settings: 'Inställningar',
  settingsTitle: 'Kakinställningar',
  settingsText: 'Alla kakor är nödvändiga. Det har våra jurister kommit fram till.',
  categories: ['Nödvändiga', 'Statistik', 'Marknadsföring', 'Spelbeteende', 'Säljs vidare'],
  locked: 'Alltid på',
  save: 'Spara val',
  saved: 'Dina val är sparade. Alla kakor är på.',
} as const

export const HEADER = {
  balance: 'Saldo',
  debt: 'Skuld',
  loan: 'Snabblån',
} as const

export const HOME = {
  /** Sits beside the Rally75 wordmark on the race panel, so the sub-brand explains itself. */
  productTag: 'Officiell travpartner',
  loading: 'Hämtar loppet',
  offline: 'Ingen anslutning till banan. Vi försöker igen...',
  noRace: 'Inget lopp än',
  noRaceText: 'Spelledaren sadlar nästa lopp. Håll telefonen nära och plånboken ännu närmare.',
  paddockHint: 'Spelet öppnar snart. Välj favorit nu, spela sen.',
  pickHint: 'Tryck på en häst för att spela.',
  runningTitle: 'Alla ögon på skärmen',
  closedTitle: 'Spelen är låsta',
  runningText: 'Loppet visas på storbildsskärmen. Här händer inget förrän domarna har talat.',
  closedText: 'Hästarna går till start. Nu kan bara hästarna, och möjligen domarna, ändra något.',
  yourBets: 'Dina spel på loppet',
  noBetsHere: 'Du har inga spel på det här loppet. Modigt.',
  resultTitle: 'Resultat',
  voided: 'Loppet ströks. Öppna spel betalades tillbaka.',
  finalOdds: 'Slutodds',
  ruling: {
    none: '',
    pay_new_winner: 'Vinnaren flyttades ner efter utredning. Ny vinnare utsedd.',
    void: 'Loppet ströks efter utredning. Huset behöll insatserna.',
    dismiss: 'Utredningen lades ner. Resultatet står fast.',
  },
} as const

export const SLIP = {
  stake: 'Insats',
  allIn: 'All in',
  clear: 'Rensa',
  odds: 'Odds nu',
  potential: 'Möjlig vinst',
  place: 'Spela',
  minStake: (rm: string) => `Minsta insats ${rm}`,
  tooPoor: 'Saldot räcker inte',
  close: 'Stäng',
  chip: (n: number) => `Lägg till ${n}`,
} as const

export const CONFIRM = {
  title: 'Bekräfta spel',
  horse: 'Häst',
  stake: 'Insats',
  odds: 'Odds nu',
  payout: 'Utbetalning vid vinst',
  lock: 'Oddset låses när du bekräftar och kan ha rört sig en aning.',
  cancel: 'Avbryt',
  ok: 'Bekräfta spel',
  placed: (rm: string, n: number, odds: string) => `Spelat ${rm} på nummer ${n} till odds ${odds}. Lycka till!`,
  closedWhileOpen: 'Spelet stängdes innan du hann bekräfta.',
} as const

export const BET_STATUS = {
  open: 'Öppet',
  won: (rm: string) => `Vann ${rm}`,
  lost: 'Förlust',
  refunded: 'Återbetalt',
  kept: 'Struket, huset behöll insatsen',
} as const

export const REVEAL = {
  winTitle: 'Vinst!',
  bigWinTitle: 'Storvinst!',
  winText: 'Pengarna är på kontot. Spela upp dem direkt, det gör alla.',
  lossTitle: 'Nästan!',
  lossText: 'Hästen hade en dålig dag. Nästa lopp är ditt, det känns på oss.',
  refundTitle: 'Loppet ströks',
  refundText: 'Dina insatser är tillbaka på kontot. Perfekt läge att satsa dem igen.',
  keptTitle: 'Struket efter utredning',
  keptText: 'Loppet ströks och huset behöll insatserna. Det står i villkoren.',
  watchTitle: 'Resultatet är klart',
  watchText: 'Du spelade inte på loppet. Det gjorde någon annan, och vann.',
  voidTitle: 'Loppet ströks',
  voidText: 'Inga spel att betala tillbaka.',
  winner: 'Vinnare',
  staked: 'Insatt',
  paid: 'Utbetalt',
  ok: 'Vidare',
  raceNo: (n: number) => `Lopp ${n}`,
} as const

export const LOAN = {
  title: 'Snabblån',
  text: 'Pank? Ingen fara. Vi har godkänt dig redan innan du frågade.',
  amount: 'Du får',
  repay: 'Du betalar tillbaka',
  interest: 'Effektiv ränta',
  interestValue: 'Ja',
  term: 'Löptid',
  termValue: 'Resten av livet',
  accept: 'Ta lånet',
  decline: 'Inte nu',
  taken: (rm: string) => `${rm} insatt. Skulden växer i lugn takt.`,
  debtSmallPrint: 'Skulden syns på topplistan. Det är en del av avtalet.',
} as const

export const BANK = {
  title: 'Bank',
  balance: 'Saldo',
  debt: 'Skuld',
  net: 'Netto idag',
  netHint: 'Räknat från noll. Välkomstbonusen är inte en vinst, den är ett lockbete.',
  repayTitle: 'Betala av skulden',
  repayText: 'Lös ut ditt Snabblån, helt eller lite i taget. Vi tar emot pengar dygnet runt.',
  pick: 'Välj belopp',
  all: 'Allt',
  clear: 'Rensa',
  pay: (rm: string) => `Betala ${rm}`,
  payNothing: 'Betala',
  after: (balance: string, debt: string) => `Kvar efter: ${balance} i saldo, ${debt} i skuld`,
  paid: (rm: string) => `${rm} avbetalt. Skulden krymper, känslan består.`,
  debtFree: 'Du är skuldfri',
  debtFreeText: 'Inga lån, inga krav, ingen spänning. Det går att lösa.',
  noMoney: 'Saldot är slut. Svårt att betala av med tomma händer.',
  loan: 'Ta ett snabblån',
  loanLocked: (rm: string) =>
    `Snabblån öppnas när saldot är under ${rm}. Vi hjälper bara den som verkligen behöver.`,
  smallPrint: 'Avbetalning påverkar inte topplistan. Skulden försvinner bara från din rad.',
  couponTitle: 'Lös in en kupong',
  couponText: 'Vann du något i baren? Skriv av koden från kupongen, eller skanna QR-koden.',
  couponPlaceholder: 'ABCD-1234',
  couponSubmit: 'Lös in',
} as const

/** The printed kupong: the reveal pop-up and the manual entry in Bank. */
export const KUPONG = {
  waitingTitle: 'Du har en kupong',
  waitingText: 'Någon har betalat ut i den fysiska världen. Vi tar hand om resten.',
  redeem: 'Lös in kupongen',
  later: 'Inte nu',
  wonTitle: 'Inlöst!',
  redeemedCta: 'Tillbaka till spelet',
  wonText: 'Pengarna ligger på kontot. Ingen handläggningstid, ingen motprestation, ingen ånger.',
  from: (label: string) => `Från ${label}`,
  smallPrint: 'En kupong gäller en gång. Den som skannar först får pengarna.',
} as const

export const MY_BETS = {
  title: 'Mina spel',
  staked: 'Insatt',
  paid: 'Utbetalt',
  net: 'Netto',
  race: (n: number) => `Lopp ${n}`,
  unknownRace: 'Lopp',
  horse: (n: number) => `Nummer ${n}`,
  odds: (odds: string) => `Odds ${odds}`,
} as const

export const BUTIK = {
  title: 'Butik',
  subtitle: 'Svarta marknaden. Öppet så länge Simon står upp.',
  spendable: (rm: string) => `${rm} att göra av med`,
  physical: 'Svarta marknaden',
  physicalHint: 'Hämtas på riktigt. Visa kvittot för Simon, så löser det sig.',
  digital: 'Digitala förmåner',
  digitalHint: 'Finns inte. Kostar ändå.',
  empty: 'Hyllorna är tomma. Spelledaren fyller på.',
  buy: 'Köp',
  soldOut: 'Slutsålt',
  paused: 'Ur sortimentet',
  tooPoor: 'Har inte råd',
  left: (n: number) => (n === 1 ? '1 kvar' : `${n} kvar`),
  unlimited: 'Obegränsat',
  confirmTitle: (name: string) => `Köpa ${name}?`,
  confirmText: (rm: string) => `${rm} lämnar ditt saldo direkt. Ingen ångerrätt, inget kvitto per post.`,
  confirmAfter: (rm: string) => `Kvar efter köpet: ${rm}`,
  confirmBuy: (rm: string) => `Köp för ${rm}`,
  cancel: 'Nej tack',
  boughtTitle: 'Köpt!',
  boughtPhysical: 'Visa den här raden i baren, så får du din vara.',
  boughtDigital: 'Varan är levererad. Den finns inte, men den är levererad.',
  boughtEffect: (value: string) => `${value} sitter nu bredvid ditt namn på topplistan.`,
  boughtToast: (name: string) => `${name} är din.`,
  close: 'Klart',
  mineTitle: 'Mina köp',
  mineEmpty: 'Du har inte unnat dig något än. Det märks.',
  mineTotal: 'Spenderat idag',
  smallPrint: 'Köp påverkar inte Toppen eller förlorarlistan. De syns bara på slösarlistan.',
} as const

export const PLINKO = {
  title: 'Plånko',
  tagline: 'Töm plånboken, en kula i taget.',
  partner: 'Ett Mr Green-original',
  stake: 'Insats per kula',
  drop: (rm: string) => `Släpp kulan (${rm})`,
  tooPoor: 'Saldot räcker inte',
  tooHigh: (rm: string) => `Max ${rm} per kula`,
  inFlight: (n: number) => (n === 1 ? '1 kula i luften' : `${n} kulor i luften`),
  lastDrops: 'Senaste kulorna',
  noDrops: 'Inga kulor än. Brädet väntar.',
  night: 'Plånko idag',
  staked: 'Insatt',
  paid: 'Utbetalt',
  net: 'Netto',
  bigHit: (mult: string, rm: string) => `${mult}! ${rm} rakt ner i plånboken.`,
  hit: (mult: string, rm: string) => `${mult}, ${rm} tillbaka.`,
  smallPrint: 'Kulan har inget minne. Det har inte du heller. Återbetalning cirka 91 %, resten går till Simons pension.',
} as const

export const BOARD = {
  top: 'Toppen',
  losers: 'Största förlorare',
  losersTitle: 'Dagens största förlorare',
  spenders: 'Slösare',
  spendersTitle: 'Dagens största slösare',
  spendersEmpty: 'Ingen har handlat något än. Butiken väntar.',
  spent: 'Spenderat',
  empty: 'Inga spelare än. Bli först, det ger ingenting extra.',
  you: 'Du',
  debt: (rm: string) => `Skuld ${rm}`,
  loans: (n: number) => (n === 1 ? '1 snabblån' : `${n} snabblån`),
  net: 'Netto',
  /** The top list counts the debt off, so the number needs saying out loud. */
  worth: 'Efter skuld',
} as const

export const GUEST_ERRORS = {
  forgotten: 'Ditt konto finns inte längre. Registrera dig igen, bonusen väntar.',
} as const
