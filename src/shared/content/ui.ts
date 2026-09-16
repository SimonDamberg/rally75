// Swedish copy for the shared design-system components (src/ui). Screen copy for each app goes
// here too as the apps are built, so components never carry inline strings.
import type { RaceStatus } from "../game/types";
import { BETTING_SUBTITLE } from "./parody";

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

export const UI_LABELS = {
  race: "Lopp",
  live: "Live",
  odds: "Odds",
  pool: "Insatt",
  kusk: "Kusk",
  close: "Stäng",
  loading: "Laddar",
  startNumber: (n: number) => `Startnummer ${n}`,
} as const;

/** GM attract screen: shown on the iPad between races to pull guests in. */
export const ATTRACT = {
  jackpotLabel: "Dagens jackpott",
  nightPaid: "Utbetalt i kväll",
  jackpotSmallPrint: "* Betalas enbart ut till Rallykå i utbyte mot tidsavdrag",
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
  closedTitle: "Spelet är stängt",
  closedSub: "Loppet startar strax",
  /** Toasts on the display iPad when money lands on a horse. */
  bet: (label: string, amount: string, horse: string) =>
    `${label} satsade ${amount} på ${horse}`,
  betsMany: (n: number) => `${n} nya spel. Oddsen rör sig!`,
  /** A bet whose player row has not landed on this device yet. */
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
