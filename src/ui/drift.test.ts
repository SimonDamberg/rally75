import { describe, expect, it } from 'vitest'
import { computeOdds } from '../shared/game/odds'
import { oddsDrift } from './drift'

describe('oddsDrift', () => {
  it('detects lengthening and shortening', () => {
    expect(oddsDrift(2.5, 2.6)).toBe('up')
    expect(oddsDrift(2.6, 2.5)).toBe('down')
    expect(oddsDrift(2.5, 2.5)).toBe('none')
  })

  it('has no drift without a previous value', () => {
    expect(oddsDrift(undefined, 3)).toBe('none')
    expect(oddsDrift(null, 3)).toBe('none')
    expect(oddsDrift(Number.NaN, 3)).toBe('none')
  })

  it('ignores changes that do not show at two decimals', () => {
    expect(oddsDrift(2.501, 2.504)).toBe('none')
    expect(oddsDrift(0.1 + 0.2, 0.3)).toBe('none')
  })

  it('shows money on a horse as shortening, the others as lengthening', () => {
    const horses = [{ baseOdds: 2 }, { baseOdds: 4 }, { baseOdds: 8 }]
    const before = computeOdds(horses, [0, 0, 0])
    const after = computeOdds(horses, [200, 0, 0])
    expect(oddsDrift(before[0], after[0])).toBe('down')
    expect(oddsDrift(before[1], after[1])).toBe('up')
    expect(oddsDrift(before[2], after[2])).toBe('up')
  })
})
