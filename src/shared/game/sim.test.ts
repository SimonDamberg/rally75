import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { buildField, FIELD_SIZE } from './field'
import { BOOSTS, COMIC_GAGS, commentAt, demoteWinner, INQUIRY_RATE, PHOTO_MARGIN, SCRIPT_WEIGHTS, progressAt, simulateRace, SLOWMO, STRETCH_TICK, TICKS } from './sim'
import { winWeights } from './odds'
import { NAMED_KUSKAR } from '../content/kuskar'

function race(seed: number) {
  const { horses, stats } = buildField(FIELD_SIZE, NAMED_KUSKAR, createRng(seed))
  return { horses, stats, timeline: simulateRace({ horses, stats, seed, raceNo: 3, meters: 2140 }) }
}

describe('simulateRace', () => {
  it('is deterministic per seed', () => {
    expect(race(123).timeline).toEqual(race(123).timeline)
    // Same field, different race seed gives a different race
    const { horses, stats } = race(123)
    const a = simulateRace({ horses, stats, seed: 1, raceNo: 3 })
    const b = simulateRace({ horses, stats, seed: 2, raceNo: 3 })
    expect(a.frames).not.toEqual(b.frames)
  })

  it('survives a JSON round trip of field and stats (DB storage)', () => {
    const { horses, stats, timeline } = race(77)
    const again = simulateRace({
      horses: JSON.parse(JSON.stringify(horses)),
      stats: JSON.parse(JSON.stringify(stats)),
      seed: 77,
      raceNo: 3,
      meters: 2140,
    })
    expect(again).toEqual(timeline)
  })

  it('produces a well-formed timeline', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { horses, timeline } = race(seed)
      const { frames, finishOrder } = timeline
      const end = frames.length - 1
      // One frame per tick, plus SLOWMO - 1 extra for every tick played in ultrarapid.
      const slowFrames = frames.filter((f) => f.slowmo).length
      expect(end).toBe(TICKS + (slowFrames * (SLOWMO - 1)) / SLOWMO)
      frames.forEach((f, k) => expect(f.tick).toBe(k))
      expect(frames[0].comment?.text).toBe('Och de är iväg i lopp 3!')
      expect(frames[end].meters).toBe(2140)
      expect([...finishOrder].sort()).toEqual(horses.map((h) => h.n))

      const last = frames[end].runners
      const byPos = [...last].sort((a, b) => b.pos - a.pos).map((x) => x.n)
      expect(finishOrder).toEqual(byPos)

      const top = last.find((x) => x.n === finishOrder[0])!
      const second = last.find((x) => x.n === finishOrder[1])!
      expect(timeline.margin).toBeCloseTo(top.pos - second.pos, 12)
      expect(timeline.photo).toBe(timeline.margin < PHOTO_MARGIN)
      expect(timeline.finalLeft[finishOrder[0]]).toBe(91)

      for (const f of frames.slice(1)) {
        const leader = f.runners.find((x) => x.n === f.leader)!
        expect(leader.pos).toBe(Math.max(...f.runners.map((x) => x.pos)))
        expect(leader.left).toBeCloseTo(6 + f.progress * 85, 9)
        expect(f.stretch).toBe(f.progress >= progressAt(STRETCH_TICK) - 1e-12)
        // The upplopp has its own slow motion; ultrarapid is only for the gags before it.
        expect(f.stretch && f.slowmo).toBe(false)
        for (const x of f.runners) expect(x.left).toBeGreaterThanOrEqual(4)
      }
      for (let t = 1; t <= end; t++) {
        expect(frames[t].meters).toBeGreaterThanOrEqual(frames[t - 1].meters)
        frames[t].runners.forEach((x, i) => {
          // Only a horse running the wrong way ever loses ground.
          if (x.gag !== 'backwards') expect(x.pos).toBeGreaterThanOrEqual(frames[t - 1].runners[i].pos)
          expect(x.broke).toBe(x.gag === 'galopp')
        })
      }
    }
  })

  it('runs the upplopp in slow motion', () => {
    const { frames } = race(5).timeline
    const step = (k: number) => frames[k].meters - frames[k - 1].meters
    const normal = frames.findIndex((f, k) => k > 1 && !f.slowmo && !f.stretch && !frames[k - 1].slowmo)
    const late = frames.length - 10
    expect(step(late)).toBeLessThan(step(normal) * 0.7)
  })

  it('draws the winner from the true win chances, so the house keeps its edge', () => {
    const N = 5000
    const wins = [0, 0, 0, 0]
    const expected = [0, 0, 0, 0]
    const paid = [0, 0, 0, 0]
    for (let seed = 1; seed <= N; seed++) {
      const { horses, stats } = buildField(FIELD_SIZE, NAMED_KUSKAR, createRng(seed))
      const t = simulateRace({ horses, stats, seed: seed * 7 + 1, raceNo: 1 })
      const w = winWeights(stats)
      const ranked = horses.map((h, i) => ({ h, i })).sort((a, b) => a.h.baseOdds - b.h.baseOdds)
      ranked.forEach(({ h, i }, rank) => {
        expected[rank] += w[i]
        if (t.finishOrder[0] === h.n) {
          wins[rank]++
          paid[rank] += h.baseOdds
        }
      })
    }
    for (let rank = 0; rank < 4; rank++) {
      expect(Math.abs(wins[rank] - expected[rank]) / N).toBeLessThan(0.03)
      // A flat 1 RM bet on the favourite (or anyone else) loses money over time.
      expect(paid[rank] / N).toBeLessThan(1)
    }
    // The favourite no longer wins everything (it won 84 % with the old sim).
    expect(wins[0] / N).toBeLessThan(0.5)
  })

  it('plays every gag in ultrarapid, and keeps its line on screen for a while', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { frames, gags } = race(seed).timeline
      for (const g of gags) {
        if (g.kind === 'turbo' && frames[g.tick].progress > progressAt(60)) continue // the comeback surge
        const slow = frames.slice(g.tick + 1, g.tick + g.ticks + 1)
        expect(slow.every((f) => f.slowmo)).toBe(true)
        // At least 3 base ticks of gag, three frames each: 2.7 s or more.
        expect(g.ticks).toBeGreaterThanOrEqual(3 * SLOWMO)
      }
    }
  })

  it('is exciting: late lead changes, photos, few processions, every script and gag', () => {
    const N = 3000
    let late = 0
    let photos = 0
    let wire = 0
    let lateGags = 0
    let repeats = 0
    const scripts = new Set<string>()
    const gags = new Set<string>()
    for (let seed = 1; seed <= N; seed++) {
      const { timeline: t } = race(seed)
      if (t.photo) photos++
      scripts.add(t.script)
      for (const g of t.gags) {
        gags.add(g.kind)
        if (t.frames[g.tick + g.ticks].stretch) lateGags++
      }
      if (t.frames.some((f, k, arr) => k > 0 && f.progress >= progressAt(75) && f.leader !== arr[k - 1].leader)) late++
      if (t.frames.filter((f) => f.progress >= progressAt(6)).every((f) => f.leader === t.finishOrder[0])) wire++
      const lines = t.frames.flatMap((f) => (f.comment ? [f.comment.text] : []))
      lines.forEach((l, i) => i > 0 && l === lines[i - 1] && repeats++)
    }
    expect(late / N).toBeGreaterThan(0.35)
    expect(photos / N).toBeGreaterThan(0.15)
    expect(photos / N).toBeLessThan(0.3)
    expect(wire / N).toBeLessThan(0.3)
    expect(lateGags).toBe(0)
    expect(repeats).toBe(0)
    expect([...scripts].sort()).toEqual(Object.keys(SCRIPT_WEIGHTS).sort())
    expect([...gags].sort()).toEqual(['galopp', ...COMIC_GAGS].sort())
  })

  it('pairs kommitte in adjacent lanes, keeps boosts off the winner, and lets a server crash snap back', () => {
    let pairs = 0
    let crashes = 0
    for (let seed = 1; seed <= 3000; seed++) {
      const { horses, timeline: t } = race(seed)
      const lane = (n: number) => horses.findIndex((h) => h.n === n)
      for (const g of t.gags) {
        const comebackSurge = g.kind === 'turbo' && t.frames[g.tick].progress > progressAt(60)
        if (BOOSTS.includes(g.kind) && !comebackSurge) expect(g.n).not.toBe(t.finishOrder[0])
        if (g.kind === 'kommitte') {
          pairs++
          expect(g.partner).toBeDefined()
          expect(Math.abs(lane(g.n) - lane(g.partner!))).toBe(1)
          expect([g.n, g.partner]).not.toContain(t.finishOrder[0])
          const mate = t.gags.find((x) => x.n === g.partner && x.kind === 'kommitte')
          expect(mate).toMatchObject({ partner: g.n, tick: g.tick, ticks: g.ticks })
        }
        if (g.kind === 'serverkrasch') {
          crashes++
          const i = lane(g.n)
          const end = g.tick + g.ticks
          // Frozen during the crash, then most of the lost ground comes back in one tick.
          const during = t.frames[end].runners[i].pos - t.frames[g.tick + 1].runners[i].pos
          const jump = t.frames[end + 1].runners[i].pos - t.frames[end].runners[i].pos
          // Compared with its normal stride just before the crash.
          const step = t.frames[g.tick].runners[i].pos - t.frames[g.tick - 1].runners[i].pos
          expect(during).toBeLessThan(1)
          expect(jump).toBeGreaterThan(Math.max(1, 2 * step))
        }
      }
    }
    expect(pairs).toBeGreaterThan(0)
    expect(crashes).toBeGreaterThan(0)
  })

  it('keeps commentary lines apart so they can be read', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const ticks = race(seed).timeline.frames.filter((f) => f.comment).map((f) => f.tick)
      ticks.forEach((t, i) => i > 0 && expect(t - ticks[i - 1]).toBeGreaterThanOrEqual(7))
    }
  })

  it('flags an inquiry in about 10 % of races', () => {
    const { horses, stats } = race(1)
    let count = 0
    const N = 3000
    for (let seed = 1; seed <= N; seed++) {
      const t = simulateRace({ horses, stats, seed, raceNo: 1 })
      if (t.inquiry) {
        count++
        expect(t.inquiry.text).toMatch(/^Videogranskning pågår\. .+ misstänks ha .+\.$/)
      }
    }
    expect(count / N).toBeGreaterThan(INQUIRY_RATE - 0.03)
    expect(count / N).toBeLessThan(INQUIRY_RATE + 0.03)
  })

  it('commentAt returns the latest line at or before a tick', () => {
    const { timeline } = race(9)
    expect(commentAt(timeline, 0).text).toBe('Och de är iväg i lopp 3!')
    const withComment = timeline.frames.filter((f) => f.comment)
    const last = withComment[withComment.length - 1]
    expect(commentAt(timeline, timeline.frames.length - 1)).toEqual(last.comment)
    expect(commentAt(timeline, 999)).toEqual(last.comment)
    expect(commentAt(timeline, last.tick).text).toBe(last.comment!.text)
    const stretch = timeline.frames.findIndex((f) => f.stretch)
    expect(commentAt(timeline, stretch)).toEqual(timeline.frames[stretch].comment)
  })

  it('throws when stats are missing for a horse', () => {
    const { horses, stats } = race(4)
    expect(() => simulateRace({ horses, stats: stats.slice(1), seed: 1, raceNo: 1 })).toThrow()
  })
})

describe('demoteWinner', () => {
  it('moves the winner to last', () => {
    expect(demoteWinner([4, 2, 6, 1, 3, 5])).toEqual([2, 6, 1, 3, 5, 4])
    expect(demoteWinner([])).toEqual([])
  })
})
