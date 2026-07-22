import type { LatLng } from '@/lib/maps/reverseGeocode'

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
/** Public Nominatim asks for ≤ 1 request/second. */
const MIN_INTERVAL_MS = 1100

const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT?.trim() ||
  'XeroLink/1.0 (campus print delivery; contact via app support)'

let lastRequestAt = 0
let queue: Promise<unknown> = Promise.resolve()

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function throttledNominatim<T>(run: () => Promise<T>): Promise<T> {
  const result = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()
    return run()
  })
  queue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

async function nominatimFetch(url: URL): Promise<Response> {
  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    cache: 'no-store',
  })

  if (res.status === 429) {
    throw new Error('Address lookup is rate-limited. Wait a moment and try again.')
  }

  if (!res.ok) {
    throw new Error(`Nominatim error (${res.status})`)
  }

  return res
}

type NominatimReverseResponse = {
  display_name?: string
  error?: string
}

type NominatimSearchItem = {
  lat?: string
  lon?: string
  display_name?: string
}

export type NominatimSearchResult = {
  lat: number
  lng: number
  display_name: string
}

/**
 * Reverse-geocode via public Nominatim, serialized + throttled for fair use.
 */
export async function reverseGeocodeNominatim(position: LatLng): Promise<string | null> {
  return throttledNominatim(async () => {
    const url = new URL(NOMINATIM_REVERSE_URL)
    url.searchParams.set('lat', String(position.lat))
    url.searchParams.set('lon', String(position.lng))
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('addressdetails', '0')

    const res = await nominatimFetch(url)
    const data = (await res.json()) as NominatimReverseResponse
    if (data.error) return null
    return data.display_name?.trim() || null
  })
}

/**
 * Forward search (Places-like) via Nominatim.
 */
export async function searchGeocodeNominatim(
  query: string,
  options?: { limit?: number; near?: LatLng }
): Promise<NominatimSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  return throttledNominatim(async () => {
    const url = new URL(NOMINATIM_SEARCH_URL)
    url.searchParams.set('q', trimmed)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('addressdetails', '0')
    url.searchParams.set('limit', String(options?.limit ?? 5))
    url.searchParams.set('countrycodes', 'in')

    if (options?.near) {
      const { lat, lng } = options.near
      const delta = 0.35
      // viewbox: left, top, right, bottom
      url.searchParams.set(
        'viewbox',
        `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`
      )
      url.searchParams.set('bounded', '0')
    }

    const res = await nominatimFetch(url)
    const data = (await res.json()) as NominatimSearchItem[]
    if (!Array.isArray(data)) return []

    return data
      .map((item) => {
        const lat = Number(item.lat)
        const lng = Number(item.lon)
        const display_name = item.display_name?.trim() ?? ''
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !display_name) {
          return null
        }
        return { lat, lng, display_name }
      })
      .filter((item): item is NominatimSearchResult => item !== null)
  })
}
