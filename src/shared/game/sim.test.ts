import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { buildField, FIELD_SIZE } from './field'
import { BOOSTS, COMIC_GAGS, commentAt, demoteWinner, HARD_GAGS, INQUIRY_RATE, LIGHT_GAGS, PHOTO_MARGIN, SCRIPT_WEIGHTS, simulateRace, STRETCH_GAG_TICK, STRETCH_TICK, TICKS } from './sim'
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
          // Nobody ever loses ground. Over the line everyone takes a real stride: the finish is
          // force-set clear of the last tick, so it needs no clamp.
          if (t === TICKS) expect(x.pos).toBeGreaterThan(frames[t - 1].runners[i].pos)
          else expect(x.pos).toBeGreaterThanOrEqual(frames[t - 1].runners[i].pos)
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
        // Only the upplopp gag reaches the upplopp, and it takes the money off its victim.
        if (g.tick + g.ticks >= STRETCH_TICK) {
          lateGags++
          expect(g.tick).toBe(STRETCH_GAG_TICK)
          expect(t.finishOrder.slice(0, 2)).not.toContain(g.n)
          expect(t.finishOrder.indexOf(g.n)).toBeGreaterThanOrEqual(2)
          expect(g.kind).not.toBe('kommitte')
          expect(g.kind).not.toBe('serverkrasch')
          expect(BOOSTS).not.toContain(g.kind)
          // It turned for home in front: that is the ground the gag took off it.
          const turn = t.frames[STRETCH_TICK].runners
          const behind = Math.max(...turn.map((x) => x.pos)) - turn.find((x) => x.n === g.n)!.pos
          expect(behind).toBeLessThan(1.5)
        }
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
    // About 40 % of races get an upplopp gag.
    expect(lateGags / N).toBeGreaterThan(0.33)
    expect(lateGags / N).toBeLessThan(0.47)
    expect(repeats).toBe(0)
    expect([...scripts].sort()).toEqual(Object.keys(SCRIPT_WEIGHTS).sort())
    expect([...gags].sort()).toEqual(['galopp', ...COMIC_GAGS].sort())
  })

  it('pairs kommitte in adjacent lanes, aims gags by finishing place, and lets a server crash snap back', () => {
    let pairs = 0
    let crashes = 0
    let rushed = 0
    for (let seed = 1; seed <= 3000; seed++) {
      const { horses, timeline: t } = race(seed)
      const lane = (n: number) => horses.findIndex((h) => h.n === n)
      for (const g of t.gags) {
        // A boost goes to a horse that finishes well, a hard gag only to one that was losing.
        if (BOOSTS.includes(g.kind)) expect(t.finishOrder.indexOf(g.n)).toBeLessThan(2)
        if (HARD_GAGS.includes(g.kind)) expect(t.finishOrder.indexOf(g.n)).toBeGreaterThanOrEqual(FIELD_SIZE / 2)
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
          // Frozen during the crash, then the ground it does get back comes in a rush, not a melt.
          const during = t.frames[end].runners[i].pos - t.frames[g.tick + 1].runners[i].pos
          const jump = t.frames[Math.min(TICKS, end + 3)].runners[i].pos - t.frames[end].runners[i].pos
          // Compared with its normal stride just before the crash.
          const step = t.frames[g.tick].runners[i].pos - t.frames[g.tick - 1].runners[i].pos
          expect(during).toBeLessThan(1)
          // Not every crash: the 3.6 units it keeps leave a horse that was fading anyway parked
          // for a few ticks longer, which is the right picture.
          if (jump > 2 * step) rushed++
        }
      }
    }
    expect(pairs).toBeGreaterThan(0)
    expect(crashes).toBeGreaterThan(0)
    expect(rushed / crashes).toBeGreaterThan(0.95)
  })

  it('lets gags keep the ground they take, and boosts the ground they gain', () => {
    const N = 3000
    const hard: number[] = []
    const boosted: number[] = []
    let settled = 0
    for (let seed = 1; seed <= N; seed++) {
      const { horses, timeline: t } = race(seed)
      const gapAt = (tick: number, n: number) => {
        const rs = t.frames[tick].runners
        return Math.max(...rs.map((x) => x.pos)) - rs.find((x) => x.n === n)!.pos
      }
      // Nothing is still melting at the line: the plan and the gags have to add back up exactly,
      // or the drawn order and the drawn margins would not be what the room sees.
      for (const h of horses) {
        settled = Math.max(settled, Math.abs(gapAt(TICKS, h.n) - gapAt(TICKS - 1, h.n)))
      }
      for (const g of t.gags) {
        if (g.tick === STRETCH_GAG_TICK) continue
        const lost = gapAt(Math.min(TICKS, g.tick + g.ticks + 15), g.n) - gapAt(g.tick, g.n)
        if (HARD_GAGS.includes(g.kind)) hard.push(lost)
        if (BOOSTS.includes(g.kind)) boosted.push(-lost)
      }
    }
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
    expect(settled).toBeLessThan(0.2)
    // The storyline keeps moving the field, so this is an average, not a promise per gag. It would
    // collapse to about zero if a gag stopped keeping its ground.
    expect(hard.length).toBeGreaterThan(500)
    expect(mean(hard)).toBeGreaterThan(1.2)
    expect(boosted.length).toBeGreaterThan(500)
    expect(mean(boosted)).toBeGreaterThan(2)
  })

  it('makes every mishap cost ground and every boost gain it', () => {
    const lost = new Map<string, number[]>()
    for (let seed = 1; seed <= 3000; seed++) {
      const { timeline: t } = race(seed)
      const gapAt = (tick: number, n: number) => {
        const rs = t.frames[tick].runners
        return Math.max(...rs.map((x) => x.pos)) - rs.find((x) => x.n === n)!.pos
      }
      for (const g of t.gags) {
        // The upplopp gag has its own drag, sized from the ground it is told to take.
        if (g.tick === STRETCH_GAG_TICK) continue
        const at = gapAt(Math.min(TICKS, g.tick + g.ticks + 15), g.n) - gapAt(g.tick, g.n)
        lost.set(g.kind, [...(lost.get(g.kind) ?? []), at])
      }
    }
    for (const kind of ['galopp', ...COMIC_GAGS] as const) {
      const all = lost.get(kind) ?? []
      expect(all.length).toBeGreaterThan(50)
      const mean = all.reduce((x, y) => x + y, 0) / all.length
      // The storyline keeps moving the field, so this is the sign of an average, not a promise per
      // gag: a drag too small to cover what its tier keeps would flip it.
      if (BOOSTS.includes(kind)) expect(mean).toBeLessThan(-1)
      else expect(mean).toBeGreaterThan(0.5)
    }
  })

  it('sorts every gag kind into exactly one tier', () => {
    const tiers = [...LIGHT_GAGS, ...HARD_GAGS, ...BOOSTS, 'kommitte']
    expect(new Set(tiers).size).toBe(tiers.length)
    expect([...tiers].sort()).toEqual(['galopp', ...COMIC_GAGS].sort())
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
