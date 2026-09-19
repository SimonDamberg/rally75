import { describe, expect, it } from 'vitest'
import { PLINKO_ROWS, slotOf } from '../shared/game/plinko'
import { ballPoints, heldBalance, pegsInRow, PEG_DX, slotX } from './drop'

describe('board geometry', () => {
  it('ends every path over its slot', () => {
    for (let path = 0; path < 1 << PLINKO_ROWS; path++) {
      const points = ballPoints(path)
      expect(points).toHaveLength(PLINKO_ROWS + 2)
      expect(points.at(-1)!.x).toBe(slotX(slotOf(path)))
    }
  })

  it('hits a peg in every row', () => {
    for (const path of [0, 4095, 0b101010101010, 1234]) {
      ballPoints(path)
        .slice(1, -1)
        .forEach((p, r) => {
          expect(pegsInRow(r).some((peg) => peg.x === p.x)).toBe(true)
        })
    }
  })

  it('puts a slot under every gap of the last row', () => {
    const last = pegsInRow(PLINKO_ROWS - 1)
    expect(last).toHaveLength(PLINKO_ROWS + 2)
    for (let k = 0; k <= PLINKO_ROWS; k++) {
      expect(slotX(k)).toBe(last[k].x + PEG_DX / 2)
    }
  })
})

describe('heldBalance', () => {
  it('is undefined when nothing is falling', () => {
    expect(heldBalance(undefined, [])).toBeUndefined()
    expect(heldBalance({ balance_after: 900 }, [])).toBeUndefined()
  })

  it('holds back the payouts still in the air', () => {
    // 1000, dropped 100 (pays 30) and 100 (pays 1200): the server says 2030.
    expect(heldBalance({ balance_after: 2030 }, [{ payout: 30 }, { payout: 1200 }])).toBe(800)
    // The first ball landed.
    expect(heldBalance({ balance_after: 2030 }, [{ payout: 1200 }])).toBe(830)
  })
})
