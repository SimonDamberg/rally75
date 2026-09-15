import { describe, expect, it } from 'vitest'
import { parseDelta, parseNotes } from './parse'

describe('parseDelta', () => {
  it('reads signed integers, including the typographic minus', () => {
    expect(parseDelta('100')).toBe(100)
    expect(parseDelta('+25')).toBe(25)
    expect(parseDelta(' -50 ')).toBe(-50)
    expect(parseDelta('−500')).toBe(-500)
    expect(parseDelta('1 000')).toBe(1000)
  })

  it('rejects zero, decimals and junk', () => {
    for (const t of ['', '0', '-0', '1,5', '12.5', 'abc', '--5', '5-']) expect(parseDelta(t)).toBeNull()
  })
})

describe('parseNotes', () => {
  it('keeps one trimmed comment per non-empty line', () => {
    expect(parseNotes(' Ett \n\n  Två\r\nTre  \n')).toEqual(['Ett', 'Två', 'Tre'])
    expect(parseNotes('')).toEqual([])
  })
})
