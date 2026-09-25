// Swedish copy for the shared design-system components (src/ui). Screen copy for each app goes
// here too as the apps are built, so components never carry inline strings.
import type { RaceStatus } from "../game/types";
import { BETTING_SUBTITLE } from "./parody";

/**
 * The two brands. Mr Green Nätcasino is the site the guests log in to; Rally75 is the trotting
 * product inside it (and the name the GM apps keep). Kept here so no component spells either out.
 */
export const BRAND = {
  name: "mr green",
  sub: "nätcasino",
  full: "Mr Green Nätcasino",
  logoAlt: "Mr Green Nätcasino",
  rally: "Rally75",
} as const;

export const STATUS_LABELS: Record<
  RaceStatus,
  { title: string; subtitle: string }
> = {
  paddock: {
    title: "Paddock",
    subtitle: "Kolla in fältet. Plånboken kan du ta fram redan nu.",
  },
  betting: { title: "Spelet öppet", subtitle: BETTING_SUBTITLE },
  closed: {
    title: "Spelstopp",
    subtitle: "Inga fler spel. Hästarna går till start.",
  },
  running: { title: "Loppet pågår", subtitle: "Håll i hatten och i kvittot." },
  finished: {
    title: "Resultat klart",
    subtitle: "Domarna har talat. Huset har räknat.",
  },
  void: { title: "Struket", subtitle: "Loppet räknas inte." },
};

/** Keys match ConnectionStatus in src/lib/connection.ts. */
export const CONNECTION_LABELS = {
  connecting: "Ansluter",
  online: "Live",
  offline: "Ingen anslutning",
} as const;

export const OFFLINE_BANNER = "Ingen anslutning. Försöker igen...";

/**
 * Shown while the game master bundle downloads. It lives here rather than in content/gm.ts so the
 * router does not pull the whole GM copy module into the chunk every guest downloads.
 */
export const GM_LOADING = "Laddar spelledaren";

/** Mystery Box rarity tiers, CS style, commonest first. */
export const RARITY_LABELS = {
  bla: "Vardaglig",
  lila: "Ovanlig",
  rosa: "Hemligstämplad",
  rod: "Förbjuden",
  guld: "Extremt sällsynt",
} as const

export const UI_LABELS = {
  race: "Lopp",
  live: "Live",
  odds: "Odds",
  pool: "Insatt",
  /** On a horse row: what this guest already has riding on it. */
  yours: "Du",
  kusk: "Kusk",
  close: "Stäng",
  loading: "Laddar",
  startNumber: (n: number) => `Startnummer ${n}`,
  kuskBadge: (n: number, kusk: string) => `Startnummer ${n}, kusk ${kusk}`,
} as const;

/** GM attract screen: shown on the iPad between races to pull guests in. */
export const ATTRACT = {
  jackpotLabel: "Dagens jackpott",
  nightPaid: "Utbetalt idag",
  jackpotSmallPrint: "* Betalas enbart ut till Rallykå i utbyte mot tidsavdrag",
  /** The umbrella brand on the iPad: the marquee, the line under Rally75 and the QR. */
  marquee: `Rally75 • En del av ${BRAND.full} • Licensierad i Atlantis • Välkomstbonus 500 % • Uttag inom 3 till 5 arbetsliv • 13+ • Spela inte lagom`,
  partOf: `En del av ${BRAND.full}`,
  playAt: `på ${BRAND.full}`,
  scan: "Skanna och spela",
  bonus: (amount: string) => `${amount} i välkomstbonus`,
  qrLabel: (url: string) => `QR-kod till ${url}`,
  players: (n: number) => `${n} spelare vid bordet`,
  noPlayers: "Bli först att kamma hem drömvinsten",
  lastIn: (label: string) => `Senast in: ${label}`,
  joined: (label: string) => `${label} är med`,
  joinedMany: (label: string, more: number) =>
    `${label} och ${more} till är med`,
  joinedBonus: (amount: string) => `+${amount} på kontot`,
  /** Display iPad, while a race is in the paddock, betting or closed. */
  fieldTitle: "Nästa Lopp",
  spotlightTitle: "Spelet är öppet",
  spotlightOf: (i: number, n: number) => `Häst ${i} av ${n}`,
  /** Betting closed: the last word is red, so the room reads it across the room. */
  closedTitleLead: "Spelet är",
  closedTitleWord: "stängt",
  closedSub: "Loppet startar strax",
  /** The held start on the display iPad: 3, 2, 1 and then away. */
  countdownGo: "KÖR",
  countdownLabel: (n: number) => `Start om ${n}`,
  /** Toasts on the display iPad when money lands on a horse. */
  bet: (label: string, amount: string, horse: string) =>
    `${label} satsade ${amount} på ${horse}`,
  betsMany: (n: number) => `${n} nya spel. Oddsen rör sig!`,
  /** Toasts on the display iPad when someone spends winnings at the black market. */
  bought: (label: string, item: string, amount: string) =>
    `${label} köpte ${item} för ${amount}`,
  boughtMany: (n: number) => `${n} köp i butiken. Baren går varm!`,
  /** A Mystery Box opening, after the guest's reel has stopped. */
  unboxed: (label: string, prize: string, rarity: string) =>
    `${label} öppnade en Mystery Box och fick ${prize} (${rarity})`,
  /** Toasts on the display iPad when a printed kupong is cashed in. */
  coupon: (label: string, amount: string, game: string) =>
    `${label} löste in en kupong på ${amount}${game ? ` från ${game}` : ''}`,
  /** The bonuskupong prank: a ticket that said more than it paid. */
  couponShort: (label: string, face: string, amount: string) =>
    `${label} löste in en kupong på ${face} och fick ${amount}. Välkommen till Mr Green!`,
  couponMany:(n: number) => `${n} kuponger inlösta. Utbetalningarna rullar!`,
  /** Toasts on the display iPad when a vinstkort is scanned. */
  prizeCard: (label: string, amount: string, game: string) =>
    game ? `${label} vann ${amount} från ${game}` : `${label} vann ${amount} på ett vinstkort`,
  prizeCardMany: (n: number) => `${n} vinstkort skannade. Lekarna betalar ut!`,
  /** Toasts on the display iPad when a Plånko ball lands on a big multiplier. */
  plinko: (label: string, mult: string, amount: string) =>
    `${label} träffade ${mult} i Plånko: ${amount}`,
  plinkoMany: (n: number) => `${n} storvinster i Plånko. Kulorna regnar!`,
  /** A bet or a purchase whose player row has not landed on this device yet. */
  someone: "En anonym spelare",
  /** Who is on the spotlighted horse. */
  onHorse: "Pengar på hästen",
  noBettors: "Ingen vågar. Än.",
  moreBettors: (n: number) => `och ${n} till`,
  paddockSub: "Studera fältet, snart kan du satsa allt du äger.",
  lines: [
    "Inget konto behövs!",
    "Huset har aldrig varit så generöst",
    "Statistiskt sett vinner (nästan) alla",
    "Krossa facebookmorsorna på hemmaplan",
    "Här trivs du som spindeln i nätet",
  ],
} as const;
