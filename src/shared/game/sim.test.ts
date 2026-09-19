import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { buildField, FIELD_SIZE } from './field'
import { COMIC_GAGS, commentAt, demoteWinner, INQUIRY_RATE, PHOTO_MARGIN, SCRIPT_WEIGHTS, simulateRace, STRETCH_TICK, TICKS } from './sim'
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
      expect(frames).toHaveLength(TICKS + 1)
      expect(frames[0].comment?.text).toBe('Och de är iväg i lopp 3!')
      expect(frames[TICKS].meters).toBe(2140)
      expect([...finishOrder].sort()).toEqual(horses.map((h) => h.n))

      const last = frames[TICKS].runners
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
        expect(f.stretch).toBe(f.tick >= STRETCH_TICK)
        for (const x of f.runners) expect(x.left).toBeGreaterThanOrEqual(4)
      }
      for (let t = 1; t <= TICKS; t++) {
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
    const early = frames[10].meters - frames[9].meters
    const late = frames[90].meters - frames[89].meters
    expect(late).toBeLessThan(early * 0.7)
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
        if (g.tick + g.ticks >= STRETCH_TICK) lateGags++
      }
      if (t.frames.slice(TICKS * 0.75).some((f, k, arr) => k > 0 && f.leader !== arr[k - 1].leader)) late++
      if (t.frames.slice(6).every((f) => f.leader === t.finishOrder[0])) wire++
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
    expect(commentAt(timeline, TICKS)).toEqual(last.comment)
    expect(commentAt(timeline, 999)).toEqual(last.comment)
    expect(commentAt(timeline, last.tick).text).toBe(last.comment!.text)
    expect(commentAt(timeline, STRETCH_TICK)).toEqual(timeline.frames[STRETCH_TICK].comment)
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
