import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/maps/nominatim', () => ({
  searchGeocodeNominatim: vi.fn(),
}))

const { searchGeocodeNominatim } = await import('@/lib/maps/nominatim')
const { GET } = await import('@/app/api/geocode/search/route')

function makeRequest(q: string, near?: { lat: number; lng: number }) {
  const url = new URL('http://localhost/api/geocode/search')
  url.searchParams.set('q', q)
  if (near) {
    url.searchParams.set('nearLat', String(near.lat))
    url.searchParams.set('nearLng', String(near.lng))
  }
  return new NextRequest(url)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/geocode/search', () => {
  it('returns empty results for short queries', async () => {
    const res = await GET(makeRequest('ab'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.results).toEqual([])
    expect(searchGeocodeNominatim).not.toHaveBeenCalled()
  })

  it('returns search results', async () => {
    vi.mocked(searchGeocodeNominatim).mockResolvedValue([
      { lat: 23.2, lng: 72.6, display_name: 'Test Place' },
    ])
    const res = await GET(makeRequest('Test Place', { lat: 23.2, lng: 72.6 }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.results).toHaveLength(1)
    expect(searchGeocodeNominatim).toHaveBeenCalledWith('Test Place', {
      limit: 5,
      near: { lat: 23.2, lng: 72.6 },
    })
  })
})
