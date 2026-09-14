// Shared game types. HorsePublic and HorseStats are exactly the jsonb shapes stored in
// races.field and race_secrets.stats (Stage 2).

export interface Silk {
  /** CSS background, usually a gradient. */
  bg: string
  /** Solid accent colour for borders. */
  edge: string
}

/** Public race card info, visible to guests. */
export interface HorsePublic {
  /** Start number, 1..n */
  n: number
  name: string
  jockey: string
  /** Kusk epithet, shown in parentheses after the kusk name. */
  title: string
  story: string
  jnote: string
  /** Last five starts, g = galopp, d = diskad. Pure flavour. */
  form: string
  note: string
  tip: string
  silk: Silk
  /** Morning line. */
  baseOdds: number
}

/** Hidden per-horse stats. Never shown to guests. */
export interface HorseStats {
  n: number
  /** 0.72..1.32 */
  strength: number
  /** 0.80..1.20, bites after 55 % of the race */
  stamina: number
  /** 0.02..0.16, tendency to break (galopp) */
  temper: number
}

export interface KuskInput {
  name: string
  title: string
  notes: readonly string[]
}

export interface Field {
  horses: HorsePublic[]
  stats: HorseStats[]
}

export interface RaceCard extends Field {
  dist: string
  cond: string
}

export type RaceStatus = 'paddock' | 'betting' | 'closed' | 'running' | 'finished' | 'void'
export type BetStatus = 'open' | 'won' | 'lost' | 'void'
/** GM ruling after a race. pay_new_winner = winner demoted to last, second place pays. */
export type Ruling = 'none' | 'pay_new_winner' | 'void' | 'dismiss'

export interface RaceComment {
  text: string
  /** Gold, louder styling. */
  hype: boolean
}

export interface RunnerFrame {
  n: number
  /** Distance covered in abstract units. */
  pos: number
  /** Screen position in percent of lane width, gap-based. */
  left: number
  /** Currently in a galopp. */
  broke: boolean
}

export interface RaceFrame {
  tick: number
  /** 0..1 */
  progress: number
  meters: number
  /** Start number of the leader, null before the start. */
  leader: number | null
  /** Same order as the input horses. */
  runners: RunnerFrame[]
  /** Commentary line that appears on this tick, if any. */
  comment?: RaceComment
}

export interface RaceTimeline {
  seed: number
  tickMs: number
  /** frames[0] is the start, frames[TICKS] the last step. */
  frames: RaceFrame[]
  /** Start numbers, winner first. */
  finishOrder: number[]
  /** Winning margin in units. */
  margin: number
  /** Margin under 1.6: MÅLFOTO. */
  photo: boolean
  /** Final resting screen positions by start number (leader at 91 %). */
  finalLeft: Record<number, number>
  finishComment: RaceComment
  /** Set in ~10 % of races; the GM then picks a ruling. */
  inquiry: { text: string } | null
}
