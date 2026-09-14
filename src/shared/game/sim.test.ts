import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { buildField } from './field'
import { commentAt, demoteWinner, INQUIRY_RATE, PHOTO_MARGIN, simulateRace, TICKS } from './sim'
import { NAMED_KUSKAR } from '../content/kuskar'

function race(seed: number) {
  const { horses, stats } = buildField(6, NAMED_KUSKAR, createRng(seed))
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
      expect(timeline.finishComment.text).toBe(
        timeline.photo ? 'MÅLFOTO! Det går inte att se med blotta ögat!' : `${horses.find((h) => h.n === finishOrder[0])!.name} vinner lopp 3!`,
      )
      expect(timeline.finalLeft[finishOrder[0]]).toBe(91)

      for (const f of frames.slice(1)) {
        const leader = f.runners.find((x) => x.n === f.leader)!
        expect(leader.pos).toBe(Math.max(...f.runners.map((x) => x.pos)))
        expect(leader.left).toBeCloseTo(6 + f.progress * 85, 9)
        for (const x of f.runners) expect(x.left).toBeGreaterThanOrEqual(4)
      }
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

  it('has galopps, lead changes and photo finishes across many races', () => {
    let galopps = 0
    let photos = 0
    for (let seed = 1; seed <= 300; seed++) {
      const { timeline } = race(seed)
      if (timeline.photo) photos++
      if (timeline.frames.some((f) => f.runners.some((x) => x.broke))) galopps++
    }
    expect(galopps).toBeGreaterThan(0)
    expect(photos).toBeGreaterThan(0)
  })

  it('commentAt returns the latest line at or before a tick', () => {
    const { timeline } = race(9)
    expect(commentAt(timeline, 0).text).toBe('Och de är iväg i lopp 3!')
    const withComment = timeline.frames.filter((f) => f.comment)
    const last = withComment[withComment.length - 1]
    expect(commentAt(timeline, TICKS)).toEqual(last.comment)
    expect(commentAt(timeline, 999)).toEqual(last.comment)
    expect(commentAt(timeline, 12).text).toBe(timeline.frames[12].comment!.text)
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
