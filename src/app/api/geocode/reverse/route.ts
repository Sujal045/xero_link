import { NextRequest, NextResponse } from 'next/server'
import { isValidLatLng } from '@/lib/maps/reverseGeocode'
import { reverseGeocodeNominatim } from '@/lib/maps/nominatim'

export async function GET(req: NextRequest) {
  try {
    const lat = Number(req.nextUrl.searchParams.get('lat'))
    const lng = Number(req.nextUrl.searchParams.get('lng'))

    if (!isValidLatLng(lat, lng)) {
      return NextResponse.json({ error: 'Invalid lat/lng.' }, { status: 400 })
    }

    const address = await reverseGeocodeNominatim({ lat, lng })
    if (!address) {
      return NextResponse.json(
        { error: 'Could not resolve an address for this pin.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ address, lat, lng })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Address lookup failed.'
    const status = /rate-limited/i.test(message) ? 429 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
