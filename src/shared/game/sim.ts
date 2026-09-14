// Deterministic race simulation, ported from the prototype's step()/finishRace().
// The whole timeline is computed up front from the seed, so the GM iPad can replay a race
// after a reload and "Snabbspola" simply jumps to the last frame.
import { createRng } from './rng'
import type { HorsePublic, HorseStats, RaceComment, RaceFrame, RaceTimeline } from './types'
import { COMMENTARY, inquiryText } from '../content/commentary'

export const TICKS = 68
export const TICK_MS = 300
export const PHOTO_MARGIN = 1.6
export const INQUIRY_RATE = 0.1
/** Screen gap per unit of distance, in percent. Gap-based so a photo finish looks close. */
const GAP_SCALE = 2.2
const START_LEFT = 6
const TRACK_SPAN = 85
const FINISH_LEFT = 91
const MIN_LEFT = 4

export interface SimInput {
  horses: readonly Pick<HorsePublic, 'n' | 'name' | 'jockey'>[]
  stats: readonly HorseStats[]
  seed: number
  raceNo: number
  /** Race distance for the clock, see distMeters(). */
  meters?: number
}

interface Runner {
  n: number
  name: string
  jockey: string
  strength: number
  stamina: number
  temper: number
  pos: number
  broke: boolean
  brokeTicks: number
}

export function simulateRace({ horses, stats, seed, raceNo, meters = 2140 }: SimInput): RaceTimeline {
  const r = createRng(seed)
  const runners: Runner[] = horses.map((h) => {
    const s = stats.find((x) => x.n === h.n)
    if (!s) throw new Error(`Saknar statistik för häst ${h.n}`)
    return { ...h, strength: s.strength, stamina: s.stamina, temper: s.temper, pos: 0, broke: false, brokeTicks: 0 }
  })

  const frames: RaceFrame[] = [
    {
      tick: 0,
      progress: 0,
      meters: 0,
      leader: null,
      runners: runners.map((h) => ({ n: h.n, pos: 0, left: START_LEFT, broke: false })),
      comment: { text: COMMENTARY.start(raceNo), hype: true },
    },
  ]

  let lastCommentTick = 0
  let lastLeader: Runner | null = null
  let order: Runner[] = runners

  for (let tick = 1; tick <= TICKS; tick++) {
    const progress = tick / TICKS
    let comment: RaceComment | undefined
    const say = (text: string, hype: boolean) => {
      comment = { text, hype }
      lastCommentTick = tick
    }

    for (const h of runners) {
      if (h.brokeTicks > 0) {
        h.brokeTicks--
        if (h.brokeTicks === 0) h.broke = false
      } else if (r.next() < h.temper * 0.045) {
        h.broke = true
        h.brokeTicks = 3 + r.int(4)
        if (tick < TICKS - 6) say(COMMENTARY.galopp(h), true)
      }
      const stam = 1 - Math.max(0, progress - 0.55) * (1.25 - h.stamina) * 0.9
      const speed = h.strength * stam * r.float(0.72, 1.3) * (h.broke ? 0.25 : 1)
      h.pos += speed
    }

    // Commentary at milestones, plus whenever the lead changes hands
    order = runners.slice().sort((a, b) => b.pos - a.pos)
    const leader = order[0]
    const milestone = COMMENTARY.milestones[tick]
    if (milestone) {
      say(milestone(order), COMMENTARY.hypeMilestones.includes(tick))
    } else if (lastLeader && leader !== lastLeader && tick > 6 && tick - lastCommentTick >= 7) {
      say(r.pick(COMMENTARY.leadChange)(leader, lastLeader), true)
    }
    lastLeader = leader

    // The leader drives the field forward, the rest are placed by actual gap in lengths
    const maxPos = leader.pos
    const leadLeft = START_LEFT + progress * TRACK_SPAN
    frames.push({
      tick,
      progress,
      meters: Math.round(progress * meters),
      leader: leader.n,
      runners: runners.map((h) => ({
        n: h.n,
        pos: h.pos,
        left: Math.max(MIN_LEFT, leadLeft - (maxPos - h.pos) * GAP_SCALE),
        broke: h.broke,
      })),
      ...(comment ? { comment } : {}),
    })
  }

  const winner = order[0]
  const margin = winner.pos - order[1].pos
  const photo = margin < PHOTO_MARGIN
  const finalLeft: Record<number, number> = {}
  for (const h of runners) finalLeft[h.n] = Math.max(MIN_LEFT, FINISH_LEFT - (winner.pos - h.pos) * GAP_SCALE)

  const inquiry = r.next() < INQUIRY_RATE ? { text: inquiryText(winner, r) } : null

  return {
    seed,
    tickMs: TICK_MS,
    frames,
    finishOrder: order.map((h) => h.n),
    margin,
    photo,
    finalLeft,
    finishComment: { text: photo ? COMMENTARY.photo : COMMENTARY.win(winner, raceNo), hype: true },
    inquiry,
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
