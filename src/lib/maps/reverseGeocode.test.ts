import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isValidLatLng, reverseGeocode } from './reverseGeocode'

describe('isValidLatLng', () => {
  it('accepts valid coordinates', () => {
    expect(isValidLatLng(23.2, 72.6)).toBe(true)
  })

  it('rejects out-of-range values', () => {
    expect(isValidLatLng(91, 0)).toBe(false)
    expect(isValidLatLng(0, 181)).toBe(false)
    expect(isValidLatLng('23', 72)).toBe(false)
    expect(isValidLatLng(NaN, 0)).toBe(false)
  })
})

describe('reverseGeocode', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns address from the Nominatim proxy', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ address: 'Sector 21, Gandhinagar, Gujarat' }),
    })
    const address = await reverseGeocode({ lat: 23.2, lng: 72.6 })
    expect(address).toBe('Sector 21, Gandhinagar, Gujarat')
    expect(fetchMock.mock.calls[0][0]).toContain('/api/geocode/reverse?')
  })

  it('returns null on 404', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    })
    await expect(reverseGeocode({ lat: 0, lng: 0 })).resolves.toBeNull()
  })
})
