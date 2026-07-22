export type LatLng = { lat: number; lng: number }

/**
 * Reverse-geocode via our Nominatim proxy (Leaflet / OSM stack).
 */
export async function reverseGeocode(position: LatLng): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(position.lat),
    lng: String(position.lng),
  })
  const res = await fetch(`/api/geocode/reverse?${params.toString()}`)
  if (res.status === 404) return null
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || 'Address lookup failed.')
  }
  const data = (await res.json()) as { address?: string }
  return data.address?.trim() || null
}

export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}
