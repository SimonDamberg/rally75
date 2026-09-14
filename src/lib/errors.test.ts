import { describe, expect, it } from 'vitest'
import { RallyError, toRallyError } from './errors'
import { ERROR_MESSAGES } from '../shared/content/errors'

describe('toRallyError', () => {
  it('maps RPC exception codes to Swedish messages', () => {
    const e = toRallyError({ code: 'P0001', message: 'insufficient_balance', details: null, hint: null })
    expect(e.code).toBe('insufficient_balance')
    expect(e.message).toBe(ERROR_MESSAGES.insufficient_balance)
  })

  it('maps fetch failures to network', () => {
    expect(toRallyError(new TypeError('Failed to fetch')).code).toBe('network')
    expect(toRallyError({ message: 'TypeError: fetch failed' }).code).toBe('network')
    expect(toRallyError(new TypeError('Load failed')).code).toBe('network')
  })

  it('falls back to unknown and passes RallyErrors through', () => {
    expect(toRallyError({ message: 'duplicate key value' }).code).toBe('unknown')
    expect(toRallyError(null).code).toBe('unknown')
    const e = new RallyError('gm_unauthorized')
    expect(toRallyError(e)).toBe(e)
  })

  it('does not treat prototype keys as codes', () => {
    expect(toRallyError({ message: 'toString' }).code).toBe('unknown')
  })
})
