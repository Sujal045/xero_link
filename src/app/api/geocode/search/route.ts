import { NextRequest, NextResponse } from 'next/server'
import { isValidLatLng } from '@/lib/maps/reverseGeocode'
import { searchGeocodeNominatim } from '@/lib/maps/nominatim'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (q.length < 3) {
      return NextResponse.json({ results: [] })
    }

    const nearLat = req.nextUrl.searchParams.get('nearLat')
    const nearLng = req.nextUrl.searchParams.get('nearLng')
    let near: { lat: number; lng: number } | undefined
    if (nearLat != null && nearLng != null) {
      const lat = Number(nearLat)
      const lng = Number(nearLng)
      if (isValidLatLng(lat, lng)) {
        near = { lat, lng }
      }
    }

    const results = await searchGeocodeNominatim(q, { limit: 5, near })
    return NextResponse.json({ results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Address search failed.'
    const status = /rate-limited/i.test(message) ? 429 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
