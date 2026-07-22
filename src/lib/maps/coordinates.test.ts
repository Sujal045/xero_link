import { describe, it, expect } from 'vitest'
import { hasCoordinates } from './coordinates'

describe('hasCoordinates', () => {
  it('accepts numeric coords', () => {
    expect(hasCoordinates(23.2, 72.6)).toBe(true)
    expect(hasCoordinates('23.2', '72.6')).toBe(true)
  })

  it('rejects missing or invalid coords', () => {
    expect(hasCoordinates(null, 72)).toBe(false)
    expect(hasCoordinates(23, undefined)).toBe(false)
    expect(hasCoordinates('', '')).toBe(false)
    expect(hasCoordinates(91, 0)).toBe(false)
  })
})
