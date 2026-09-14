// Swedish copy for the shared design-system components (src/ui). Screen copy for each app goes
// here too as the apps are built, so components never carry inline strings.
import type { RaceStatus } from '../game/types'
import { BETTING_SUBTITLE } from './parody'

export const STATUS_LABELS: Record<RaceStatus, { title: string; subtitle: string }> = {
  paddock: { title: 'Paddock', subtitle: 'Kolla in fältet. Spelet öppnar snart.' },
  betting: { title: 'Spelet öppet', subtitle: BETTING_SUBTITLE },
  closed: { title: 'Spelstopp', subtitle: 'Inga fler spel. Hästarna går till start.' },
  running: { title: 'Loppet pågår', subtitle: 'Håll i drinken.' },
  finished: { title: 'Resultat klart', subtitle: 'Domarna har talat.' },
  void: { title: 'Struket', subtitle: 'Loppet räknas inte.' },
}

/** Keys match ConnectionStatus in src/lib/connection.ts. */
export const CONNECTION_LABELS = {
  connecting: 'Ansluter',
  online: 'Live',
  offline: 'Ingen anslutning',
} as const

export const OFFLINE_BANNER = 'Ingen anslutning. Försöker igen...'

export const UI_LABELS = {
  race: 'Lopp',
  live: 'Live',
  odds: 'Odds',
  pool: 'Insatt',
  kusk: 'Kusk',
  form: 'Form',
  close: 'Stäng',
  loading: 'Laddar',
  startNumber: (n: number) => `Startnummer ${n}`,
} as const

/** GM attract screen: shown on the iPad between races to pull guests in. */
export const ATTRACT = {
  jackpotLabel: 'Kvällens jackpott',
  jackpotSmallPrint: '* Betalas ut i mån av tid.',
  scan: 'Skanna och spela',
  bonus: (amount: string) => `${amount} i välkomstbonus`,
  qrLabel: (url: string) => `QR-kod till ${url}`,
  players: (n: number) => `${n} spelare vid bordet`,
  noPlayers: 'Bordet är tomt. Bli först.',
  lastIn: (label: string) => `Senast in: ${label}`,
  joined: (label: string) => `${label} är med`,
  joinedMany: (label: string, more: number) => `${label} och ${more} till är med`,
  joinedBonus: (amount: string) => `+${amount} på kontot`,
  lines: [
    'Inget konto. Bara ett namn.',
    'Bonusen väntar. Inte länge till.',
    'Oddsen rör sig. Du borde också.',
    'Huset har aldrig varit så generöst.',
    'Alla vinner. Statistiskt sett nästan.',
    'Första spelet är alltid gratis. Typ.',
  ],
  testField: 'Testfält',
  back: 'Tillbaka',
} as const
