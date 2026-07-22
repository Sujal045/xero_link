import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/maps/nominatim', () => ({
  reverseGeocodeNominatim: vi.fn(),
}))

const { reverseGeocodeNominatim } = await import('@/lib/maps/nominatim')
const { GET } = await import('@/app/api/geocode/reverse/route')

function makeRequest(lat: string, lng: string) {
  return new NextRequest(
    `http://localhost/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/geocode/reverse', () => {
  it('returns 400 for invalid coords', async () => {
    const res = await GET(makeRequest('999', '0'))
    expect(res.status).toBe(400)
  })

  it('returns address from Nominatim', async () => {
    vi.mocked(reverseGeocodeNominatim).mockResolvedValue('Gandhinagar, Gujarat')
    const res = await GET(makeRequest('23.2156', '72.6369'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.address).toBe('Gandhinagar, Gujarat')
  })

  it('returns 404 when no address', async () => {
    vi.mocked(reverseGeocodeNominatim).mockResolvedValue(null)
    const res = await GET(makeRequest('23.2', '72.6'))
    expect(res.status).toBe(404)
  })
})
