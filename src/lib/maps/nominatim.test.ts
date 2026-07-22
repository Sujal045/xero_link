import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  reverseGeocodeNominatim,
  searchGeocodeNominatim,
} from './nominatim'

describe('nominatim geocoding', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reverse returns display_name', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ display_name: 'Sector 21, Gandhinagar, Gujarat' }),
    })

    const address = await reverseGeocodeNominatim({ lat: 23.2, lng: 72.6 })
    expect(address).toBe('Sector 21, Gandhinagar, Gujarat')
  })

  it('search returns mapped results', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          lat: '23.2156',
          lon: '72.6369',
          display_name: 'Gandhinagar, Gujarat, India',
        },
      ],
    })

    const results = await searchGeocodeNominatim('Gandhinagar')
    expect(results).toEqual([
      {
        lat: 23.2156,
        lng: 72.6369,
        display_name: 'Gandhinagar, Gujarat, India',
      },
    ])
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('nominatim.openstreetmap.org/search')
    expect(url).toContain('q=Gandhinagar')
  })

  it('search returns empty for short queries without calling Nominatim', async () => {
    await expect(searchGeocodeNominatim('ab')).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
