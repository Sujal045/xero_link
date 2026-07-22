export function hasCoordinates(lat: unknown, lng: unknown): boolean {
  if (lat == null || lng == null || lat === '' || lng === '') return false
  const nLat = typeof lat === 'number' ? lat : Number(lat)
  const nLng = typeof lng === 'number' ? lng : Number(lng)
  return (
    Number.isFinite(nLat) &&
    Number.isFinite(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180
  )
}
