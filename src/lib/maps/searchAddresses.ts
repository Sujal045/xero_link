import type { LatLng } from '@/lib/maps/reverseGeocode'
import type { NominatimSearchResult } from '@/lib/maps/nominatim'

export async function searchAddresses(
  query: string,
  near?: LatLng
): Promise<NominatimSearchResult[]> {
  const params = new URLSearchParams({ q: query })
  if (near) {
    params.set('nearLat', String(near.lat))
    params.set('nearLng', String(near.lng))
  }
  const res = await fetch(`/api/geocode/search?${params.toString()}`)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || 'Address search failed.')
  }
  const data = (await res.json()) as { results?: NominatimSearchResult[] }
  return data.results ?? []
}
