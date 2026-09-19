// Deterministic race simulation. The whole timeline is computed up front from the seed, so both GM
// devices replay the same race from races.started_at and "Snabbspola" just jumps to the last frame.
//
// The result comes first: the finish order is drawn from the same win chances the morning line is
// built from (winWeights), so the odds tell the truth and upsets happen as often as they should.
// Then a storyline (script) is drawn, and every horse's gap to the leader is keyframed to tell it:
// front-runners that collapse, comebacks from last, duels to a photo. Gags (galopp, running the
// wrong way, a seagull) bend a horse's curve for a few ticks and the script takes it back after.
import { createRng, type Rng } from './rng'
import { winWeights } from './odds'
import type {
  GagKind,
  HorsePublic,
  HorseStats,
  RaceComment,
  RaceFrame,
  RaceGag,
  RaceScript,
  RaceTimeline,
} from './types'
import { COMMENTARY, GAG_LINES, GAG_WIN, inquiryText, KOMMITTE_LINES, type NamedRunner } from '../content/commentary'

/** 100 ticks of 300 ms: 30 s from the start to the line. */
export const TICKS = 100
export const TICK_MS = 300
/** The upplopp starts here and covers the last STRETCH_FROM of the distance at half speed. */
export const STRETCH_TICK = 76
const STRETCH_FROM = 0.85
export const PHOTO_MARGIN = 1.6
export const INQUIRY_RATE = 0.1
/** A winner at these morning-line odds or longer is a skräll. */
export const SKRALL_ODDS = 4
/** Screen gap per unit of distance, in percent. Gap-based so a photo finish looks close. */
const GAP_SCALE = 2.2
const START_LEFT = 6
const TRACK_SPAN = 85
const FINISH_LEFT = 91
const MIN_LEFT = 4
/** Units the leader covers over the whole race. */
const RACE_UNITS = 70
/** Largest gap a horse may lose per unit of progress, so nobody ever has to run backwards. */
const MAX_FADE = 40
/** Keyframes (progress) for the scripted gaps. */
const KEYS = [0, 0.12, 0.3, 0.5, 0.7, 0.85, 1] as const
/** The keyframe where the upplopp starts (progress 0.85). */
const UPPLOPP_KEY = 5
/**
 * Share of its final gap a beaten horse has already lost when the field turns into the upplopp: the
 * finish is a fight between the front two, not a queue of four.
 */
const BEATEN_AT_UPPLOPP = [0.65, 1] as const
/** Commentary lines stay on screen at least this many ticks (read at 2 m). */
const COMMENT_GAP = 7
/** Gags start in this tick window, so they are over (and recovered) before the upplopp. */
const GAG_FIRST = 12
const GAG_LAST = 50
const GAG_RECOVER = 14
/** The turn for home: the storyline's big line. */
const TURN_TICK = 66
const COMEBACK_TURBO_TICK = TURN_TICK - 1
/**
 * The upplopp gag: in this share of races the winner or the runner-up gets a gag on the way home.
 * It starts 6 ticks after the UPPLOPPET line, so its own line fits between that one and the last-100 m
 * line at tick 90, and the horse wins its ground back before the finish.
 */
const STRETCH_GAG_CHANCE = 0.4
export const STRETCH_GAG_TICK = 82
/**
 * The field moves at half speed in the upplopp, so a gag there needs less drag to stop a horse. Not
 * half, though: this is the gag that decides the race, and it should cost real ground.
 */
const STRETCH_DRAG = 0.8
const STRETCH_RECOVER = 10

export const SCRIPT_WEIGHTS: Record<RaceScript, number> = {
  wire: 0.14,
  comeback: 0.24,
  collapse: 0.24,
  duel: 0.18,
  pack: 0.2,
}
export const COMIC_GAGS: readonly GagKind[] = [
  'backwards',
  'selfie',
  'turbo',
  'nap',
  'banana',
  'snabblan',
  'husvagn',
  'kommitte',
  'serverkrasch',
  'fatbyte',
  'eckero',
  'rallyhafte',
  'hjalprebus',
]
/** Gags that speed a horse up: never handed to the winner, where they would look like the cause. */
export const BOOSTS: readonly GagKind[] = ['turbo', 'husvagn']
/**
 * Every race gets a comic gag; these are the chances of a second and a third on top. Galopp comes
 * on top of that, from temper, within MAX_GAG_SLOTS moments in all.
 */
const SECOND_COMIC_CHANCE = 0.7
const THIRD_COMIC_CHANCE = 0.3
const MAX_GAG_SLOTS = 4

/**
 * Extra gap per gag tick, in units. Above the leader's ~0.78/tick the horse stands still (or, for
 * backwards, moves back), and the harder the drag, the longer it stays stuck while the gap melts
 * away again. A gag has to hurt: the room should see the ground go.
 */
const GAG_DRAG: Record<GagKind, number> = {
  galopp: 0.7,
  backwards: 1.5,
  selfie: 0.55,
  turbo: -0.8,
  nap: 1.6,
  banana: 0.55,
  snabblan: 0.6,
  husvagn: -0.8,
  kommitte: 0.7,
  serverkrasch: 2,
  fatbyte: 1.5,
  eckero: 1.5,
  rallyhafte: 0.75,
  hjalprebus: 0.75,
}
/** Every gag lasts 7 ticks (2.1 s), long enough for the room to read the sticker and the line. */
const GAG_TICKS = 7
/** Ticks a gag's lost ground takes to melt away. A crashed server comes back all at once. */
const GAG_RECOVERY: Partial<Record<GagKind, number>> = { serverkrasch: 1 }

export interface SimInput {
  horses: readonly Pick<HorsePublic, 'n' | 'name' | 'jockey' | 'baseOdds'>[]
  stats: readonly HorseStats[]
  seed: number
  raceNo: number
  /** Race distance for the clock, see distMeters(). */
  meters?: number
}

/** Progress (0..1) at a tick: even up to the upplopp, then half speed. */
export function progressAt(tick: number): number {
  if (tick <= STRETCH_TICK) return (STRETCH_FROM * tick) / STRETCH_TICK
  return STRETCH_FROM + ((1 - STRETCH_FROM) * (tick - STRETCH_TICK)) / (TICKS - STRETCH_TICK)
}

const smooth = (x: number) => x * x * (3 - 2 * x)

/** Finish order by successive weighted draws (Plackett-Luce): each place goes to one of the rest. */
function drawOrder(weights: readonly number[], r: Rng): number[] {
  const left = weights.map((w, i) => ({ i, w }))
  const out: number[] = []
  while (left.length) {
    const tot = left.reduce((s, x) => s + x.w, 0)
    let x = r.next() * tot
    let k = 0
    while (k < left.length - 1 && x >= left[k].w) x -= left[k++].w
    out.push(left[k].i)
    left.splice(k, 1)
  }
  return out
}

function pickScript(r: Rng): RaceScript {
  let x = r.next()
  for (const [s, w] of Object.entries(SCRIPT_WEIGHTS) as [RaceScript, number][]) {
    if ((x -= w) < 0) return s
  }
  return 'pack'
}

interface Plan {
  /** Gap to the reference line per horse index, one value per KEYS entry. */
  gaps: number[][]
  /** Horses the commentary talks about: a is the script's main character. */
  a: number
  b: number
  margin: number
}

/**
 * Keyframed gaps for one storyline. `order` is horse indices, winner first; `fav` the favourite.
 * Every script ends on the drawn order: final gaps rise strictly down the order.
 */
function planScript(script: RaceScript, order: readonly number[], fav: number, r: Rng): Plan {
  const n = order.length
  const [w, second] = order
  const others = order.slice(1)
  const margin =
    script === 'duel' ? r.float(0.1, 1.4) : script === 'pack' ? r.float(0.8, 3.2) : r.float(1.8, 4.5)
  const tight = script === 'pack'
  const final = new Array<number>(n).fill(0)
  let acc = margin
  final[second] = acc
  for (const i of order.slice(2)) final[i] = acc += tight ? r.float(0.5, 2) : r.float(1, 4)

  const gaps = order.map(() => KEYS.map(() => 0))
  const set = (i: number, vals: readonly number[]) => vals.forEach((v, k) => (gaps[i][k + 1] = v))
  const early = () => r.float(0, 2)
  let a = w
  let b = second

  switch (script) {
    case 'wire': {
      // The winner leads everywhere; the runner-up closes to a neck at the turn.
      set(w, [0, 0, 0, 0, 0, 0])
      for (const i of others) set(i, [early() + 0.5, r.float(1, 4), r.float(2, 6), r.float(2, 6), 0, final[i]])
      gaps[second][5] = 0.7
      for (const i of order.slice(2)) gaps[i][5] = r.float(3, 7)
      break
    }
    case 'comeback': {
      // The winner is last until the turn, then comes flying. Someone else leads meanwhile.
      const lead = others[r.int(others.length)]
      set(w, [2, 5, r.float(6.5, 8), r.float(6, 7.5), 1.2, 0])
      for (const i of others) set(i, [early(), r.float(0.5, 3.5), r.float(1, 4.5), r.float(1, 4.5), r.float(0.5, 3), final[i]])
      set(lead, [0, 0, 0, 0, 0, final[lead]])
      b = lead
      break
    }
    case 'collapse': {
      // A front-runner (the favourite when it loses) leads clearly and dies on the way home.
      const faller = fav !== w ? fav : second
      set(w, [early(), r.float(3, 5), r.float(3, 5), r.float(2.5, 4), r.float(0.8, 1.5), 0])
      for (const i of others) set(i, [early(), r.float(3, 6), r.float(3.5, 7), r.float(3, 6), r.float(1.5, 4), final[i]])
      set(faller, [0, 0, 0, 0, 0.3, final[faller]])
      a = faller
      b = w
      break
    }
    case 'duel': {
      // Two horses level from the turn, swapping the lead to the line; the rest fall away.
      set(w, [early(), r.float(0, 2), r.float(0, 1.5), 0, 0.4, 0])
      set(second, [early(), r.float(0, 2), r.float(0, 1.5), 0.3, 0, margin])
      for (const i of order.slice(2)) set(i, [early(), r.float(1, 3), r.float(1.5, 4), r.float(2.5, 5), r.float(3, 6), final[i]])
      break
    }
    case 'pack': {
      // Everyone within a length until the upplopp, then the winner squeezes out.
      for (const i of order) set(i, [early(), r.float(0, 1.2), r.float(0, 1.2), r.float(0, 1), r.float(0, 1), final[i]])
      break
    }
  }

  // Beaten horses are already beaten at the turn for home: the upplopp belongs to the front two, and
  // the last one home has daylight to it. Scaled by the final gap, so a clear win looks clear. Not in
  // a pack race, which is the one storyline where the whole field really does come home together.
  if (!tight) {
    for (const i of order.slice(2)) {
      gaps[i][UPPLOPP_KEY] = Math.max(gaps[i][UPPLOPP_KEY], final[i] * r.float(...BEATEN_AT_UPPLOPP))
    }
  }

  // Nobody may lose ground faster than they can trot: walk back from the line and lift earlier
  // keyframes where a fade would be too steep.
  for (const g of gaps) {
    for (let k = KEYS.length - 2; k >= 1; k--) {
      g[k] = Math.max(g[k], g[k + 1] - MAX_FADE * (KEYS[k + 1] - KEYS[k]) * 0.85)
    }
  }
  return { gaps, a, b, margin }
}

function gapAt(g: readonly number[], p: number): number {
  let k = 0
  while (k < KEYS.length - 2 && p > KEYS[k + 1]) k++
  const t = (p - KEYS[k]) / (KEYS[k + 1] - KEYS[k])
  return g[k] + (g[k + 1] - g[k]) * smooth(Math.min(1, Math.max(0, t)))
}

/** A gag as the sim needs it: horse index, and how much ground it costs per tick. */
interface PlacedGag extends RaceGag {
  i: number
  drag: number
  /** Ticks to win the lost ground back. */
  recover: number
  /** Partner horse index in a two-horse gag. */
  j?: number
}

/**
 * Galopp from temper, plus comic gags, spaced so each gets its own commentary line. A kommitte gag
 * takes two losers in adjacent lanes, and the one ahead gives up extra ground so they end up level.
 */
function drawGags(temper: readonly number[], order: readonly number[], script: RaceScript, gaps: readonly number[][], r: Rng): PlacedGag[] {
  const gags: PlacedGag[] = []
  const slots = () => new Set(gags.map((g) => g.tick)).size
  // A horse takes one gag at a time: the ground lost to the last one has to be won back first, or
  // the two recoveries fight each other and neither reads.
  const alone = (who: readonly number[], tick: number, len: number) =>
    gags.every(
      (g) =>
        !who.includes(g.i) || tick >= g.tick + g.ticks + g.recover || tick + len + GAG_RECOVER <= g.tick,
    )
  const free = (tick: number, len: number, who: readonly number[]) =>
    tick + len + 2 <= GAG_LAST + 6 &&
    gags.every((g) => Math.abs(g.tick - tick) >= COMMENT_GAP + 1) &&
    alone(who, tick, len)
  const slot = (who: readonly number[], tries = 12): { tick: number; ticks: number } | null => {
    const ticks = GAG_TICKS
    for (let t = 0; t < tries; t++) {
      const tick = GAG_FIRST + r.int(GAG_LAST - GAG_FIRST + 1)
      if (free(tick, ticks, who)) return { tick, ticks }
    }
    return null
  }
  const gag = (i: number, kind: GagKind, at: { tick: number; ticks: number }, drag = GAG_DRAG[kind]): PlacedGag => ({
    i,
    n: -1,
    kind,
    ...at,
    drag,
    recover: GAG_RECOVERY[kind] ?? GAG_RECOVER,
  })
  const place = (i: number, kind: GagKind) => {
    const at = slot([i])
    if (at) gags.push(gag(i, kind, at))
  }
  const placePair = () => {
    const losers = new Set(order.slice(1))
    const pairs: [number, number][] = []
    for (let a = 0; a + 1 < order.length; a++) if (losers.has(a) && losers.has(a + 1)) pairs.push([a, a + 1])
    if (!pairs.length) return
    const [a, b] = r.pick(pairs)
    const at = slot([a, b])
    if (!at) return
    const p = progressAt(at.tick)
    // Positive when a is ahead of b on the plan: a drags that much extra to come back level.
    const lead = gapAt(gaps[b], p) - gapAt(gaps[a], p)
    const base = GAG_DRAG.kommitte
    gags.push(
      { ...gag(a, 'kommitte', at, base + Math.max(0, lead) / at.ticks), j: b },
      { ...gag(b, 'kommitte', at, base + Math.max(0, -lead) / at.ticks), j: a },
    )
  }

  // Galopp, about as often as the old tick-by-tick model: a hot temper breaks more.
  temper.forEach((t, i) => {
    if (r.next() < 1 - (1 - t * 0.045) ** 45) place(i, 'galopp')
  })
  const comic = 1 + (r.next() < SECOND_COMIC_CHANCE ? 1 : 0) + (r.next() < THIRD_COMIC_CHANCE ? 1 : 0)
  for (let c = 0; c < comic && slots() < MAX_GAG_SLOTS; c++) {
    const kind = r.pick(COMIC_GAGS.filter((k) => gags.every((g) => g.kind !== k)))
    if (kind === 'kommitte') {
      placePair()
      continue
    }
    // Mostly a loser; the winner may take a harmless one, which is funnier.
    const pool = r.next() < 0.25 && !BOOSTS.includes(kind) ? order : order.slice(1)
    place(pool[r.int(pool.length)], kind)
  }
  // A comeback winner may light a turbo for the surge, on the turn line ("här kommer ..."). Show
  // only: the script already gains the ground, and a real boost would melt away on the upplopp.
  if (script === 'comeback' && r.next() < 0.5) {
    gags.push(gag(order[0], 'turbo', { tick: COMEBACK_TURBO_TICK, ticks: GAG_TICKS }, 0))
  }
  // The upplopp gag, on the winner (who stalls, gets passed and still wins) or the runner-up (who
  // stalls right when it matters). Never a boost on the winner, and never the two-horse kommitte.
  if (r.next() < STRETCH_GAG_CHANCE) {
    const i = order[r.int(2)]
    const kinds = COMIC_GAGS.filter((k) => k !== 'kommitte' && !(i === order[0] && BOOSTS.includes(k)))
    const kind = r.pick(kinds)
    gags.push({
      ...gag(i, kind, { tick: STRETCH_GAG_TICK, ticks: GAG_TICKS }, GAG_DRAG[kind] * STRETCH_DRAG),
      recover: GAG_RECOVERY[kind] ?? STRETCH_RECOVER,
    })
  }
  return gags.sort((x, y) => x.tick - y.tick)
}

/** Extra gap from a gag at tick t: builds up during the gag, then melts away (the recovery). */
function gagGap(g: PlacedGag, t: number): number {
  if (t <= g.tick) return 0
  const peak = g.drag * g.ticks
  const end = g.tick + g.ticks
  if (t <= end) return (peak * (t - g.tick)) / g.ticks
  return peak * (1 - smooth(Math.min(1, (t - end) / g.recover)))
}

export function simulateRace({ horses, stats, seed, raceNo, meters = 2140 }: SimInput): RaceTimeline {
  const r = createRng(seed)
  const ordered = horses.map((h) => {
    const s = stats.find((x) => x.n === h.n)
    if (!s) throw new Error(`Saknar statistik för häst ${h.n}`)
    return s
  })
  const n = horses.length
  const order = drawOrder(winWeights(ordered), r)
  const fav = horses.reduce((best, h, i) => (h.baseOdds < horses[best].baseOdds ? i : best), 0)
  const script = pickScript(r)
  const plan = planScript(script, order, fav, r)
  const rawGags = drawGags(
    ordered.map((s) => s.temper),
    order,
    script,
    plan.gaps,
    r,
  )
  // Two slow sines per horse, fading out at both ends, so nobody moves like a train on rails.
  const wobble = horses.map(() => ({
    f1: r.float(1.5, 3),
    p1: r.next(),
    f2: r.float(4, 7),
    p2: r.next(),
    amp: r.float(0.35, 0.7),
  }))

  // Positions, tick by tick
  const pos: number[][] = []
  for (let t = 0; t <= TICKS; t++) {
    const p = progressAt(t)
    const taper = 4 * p * (1 - p)
    pos.push(
      horses.map((_, i) => {
        const wb = wobble[i]
        const wig = wb.amp * taper * (Math.sin(2 * Math.PI * (wb.f1 * p + wb.p1)) + 0.5 * Math.sin(2 * Math.PI * (wb.f2 * p + wb.p2)))
        const gag = rawGags.filter((g) => g.i === i).reduce((s, g) => s + gagGap(g, t), 0)
        return RACE_UNITS * p - gapAt(plan.gaps[i], p) + wig - gag
      }),
    )
  }
  const gagAt = (i: number, t: number) => rawGags.find((g) => g.i === i && t > g.tick && t <= g.tick + g.ticks)
  // Only a horse running the wrong way moves backwards.
  for (let t = 1; t <= TICKS; t++) {
    for (let i = 0; i < n; i++) {
      if (gagAt(i, t)?.kind !== 'backwards') pos[t][i] = Math.max(pos[t][i], pos[t - 1][i])
    }
  }
  // The line is exact: the drawn order with the drawn margins, whatever the wobble did.
  const top = Math.max(...pos[TICKS - 1]) + (RACE_UNITS * (1 - progressAt(TICKS - 1))) / 2
  for (let i = 0; i < n; i++) pos[TICKS][i] = top - gapAt(plan.gaps[i], 1)
  for (let i = 0; i < n; i++) pos[TICKS][i] = Math.max(pos[TICKS][i], pos[TICKS - 1][i])
  const finishIdx = [...order]

  // Frames, without commentary yet
  const frames: RaceFrame[] = []
  const leaders: number[] = []
  for (let t = 0; t <= TICKS; t++) {
    const progress = progressAt(t)
    const row = pos[t]
    const leadI = row.reduce((best, x, i) => (x > row[best] ? i : best), 0)
    leaders.push(leadI)
    const maxPos = row[leadI]
    const leadLeft = START_LEFT + progress * TRACK_SPAN
    frames.push({
      tick: t,
      progress,
      meters: Math.round(progress * meters),
      leader: t === 0 ? null : horses[leadI].n,
      stretch: t >= STRETCH_TICK,
      runners: horses.map((h, i) => {
        const gag = t > 0 ? gagAt(i, t) : undefined
        return {
          n: h.n,
          pos: row[i],
          left: t === 0 ? START_LEFT : Math.max(MIN_LEFT, leadLeft - (maxPos - row[i]) * GAP_SCALE),
          broke: gag?.kind === 'galopp',
          ...(gag ? { gag: gag.kind } : {}),
          ...(gag?.j !== undefined ? { partner: horses[gag.j].n } : {}),
        }
      }),
    })
  }

  // Commentary: candidates with priorities, then greedily kept so lines never crowd each other.
  const H = (i: number): NamedRunner => horses[i]
  const orderAt = (t: number) => horses.map((_, i) => i).sort((x, y) => pos[t][y] - pos[t][x])
  const cands: { tick: number; prio: number; comment: RaceComment }[] = []
  const add = (tick: number, prio: number, text: string, hype: boolean) => cands.push({ tick, prio, comment: { text, hype } })

  add(0, 9, COMMENTARY.start(raceNo), true)
  for (const g of rawGags) {
    if (g.tick === COMEBACK_TURBO_TICK) continue
    if (g.kind === 'kommitte') {
      // One line for the couple, from the upper lane's entry.
      if (g.j !== undefined && g.i < g.j) add(g.tick + 1, 6, r.pick(KOMMITTE_LINES)(H(g.i), H(g.j)), true)
    } else add(g.tick + 1, 6, r.pick(GAG_LINES[g.kind])(H(g.i)), true)
  }
  {
    const o = orderAt(20)
    add(20, 3, r.pick(COMMENTARY.early)(H(o[0]), H(o[1])), false)
  }
  {
    const o = orderAt(38)
    if (o[n - 1] === fav && order[0] !== fav) add(38, 4, r.pick(COMMENTARY.favouriteLast)(H(fav)), true)
    else add(38, 3, r.pick(COMMENTARY.halfway)(H(o[0]), H(o[n - 1])), false)
  }
  add(54, 4, r.pick(COMMENTARY.mid[script])(H(plan.a), H(plan.b)), false)
  add(TURN_TICK, 7, r.pick(COMMENTARY.turn[script])(H(plan.a), H(plan.b)), true)
  {
    const o = orderAt(STRETCH_TICK)
    add(STRETCH_TICK, 8, r.pick(COMMENTARY.stretch)(H(o[0]), H(o[1])), true)
  }
  {
    const t = 90
    const o = orderAt(t)
    const stalled = rawGags.some((g) => g.tick === STRETCH_GAG_TICK && g.i === finishIdx[0])
    add(
      t,
      8,
      stalled
        ? r.pick(COMMENTARY.backAgain)(H(finishIdx[0]))
        : COMMENTARY.final(H(o[0]), H(o[1]), pos[t][o[0]] - pos[t][o[1]] < 1.2),
      true,
    )
  }
  for (let t = 8; t < STRETCH_TICK; t++) {
    if (leaders[t] !== leaders[t - 1]) add(t, 1, r.pick(COMMENTARY.leadChange)(H(leaders[t]), H(leaders[t - 1])), true)
  }
  const kept: typeof cands = []
  for (const c of [...cands].sort((x, y) => y.prio - x.prio || x.tick - y.tick)) {
    if (kept.every((k) => Math.abs(k.tick - c.tick) >= COMMENT_GAP)) kept.push(c)
  }
  for (const c of kept) frames[c.tick].comment = c.comment

  const winner = horses[finishIdx[0]]
  const margin = pos[TICKS][finishIdx[0]] - pos[TICKS][finishIdx[1]]
  const photo = margin < PHOTO_MARGIN
  const finalLeft: Record<number, number> = {}
  horses.forEach((h, i) => {
    finalLeft[h.n] = Math.max(MIN_LEFT, FINISH_LEFT - (pos[TICKS][finishIdx[0]] - pos[TICKS][i]) * GAP_SCALE)
  })
  // The latest one: an upplopp gag makes the better finish line.
  const winnerGag = rawGags.filter((g) => g.i === finishIdx[0]).at(-1)
  const gagWin = winnerGag && GAG_WIN[winnerGag.kind]
  const finishText = photo
    ? COMMENTARY.photo
    : gagWin
      ? gagWin(winner)
      : winner.baseOdds >= SKRALL_ODDS
        ? COMMENTARY.skrall(winner, raceNo)
        : COMMENTARY.win(winner, raceNo)

  const inquiry = r.next() < INQUIRY_RATE ? { text: inquiryText(winner, r) } : null

  return {
    seed,
    tickMs: TICK_MS,
    frames,
    finishOrder: finishIdx.map((i) => horses[i].n),
    margin,
    photo,
    finalLeft,
    finishComment: { text: finishText, hype: true },
    inquiry,
    script,
    gags: rawGags.map(({ i, j, kind, tick, ticks }) => ({
      n: horses[i].n,
      kind,
      tick,
      ticks,
      ...(j !== undefined ? { partner: horses[j].n } : {}),
    })),
  }
}

/** The commentary line on screen at `tick` (the latest one at or before it). */
export function commentAt(timeline: RaceTimeline, tick: number): RaceComment {
  const last = Math.min(tick, timeline.frames.length - 1)
  for (let t = last; t >= 0; t--) {
    const c = timeline.frames[t].comment
    if (c) return c
  }
  return timeline.frames[0].comment as RaceComment
}

/** "Pay the new winner" ruling: the winner is demoted to last, everyone else moves up. */
export function demoteWinner(order: readonly number[]): number[] {
  return order.length ? [...order.slice(1), order[0]] : []
}
