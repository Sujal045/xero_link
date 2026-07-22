/**
 * Human-readable age for an order timestamp.
 * Handles Postgres timestamptz strings (with or without Z / offset).
 */
export function getOrderAgeLabel(createdAt: string | null | undefined): string {
  if (!createdAt) return 'just now'

  // Avoid appending "Z" — timestamps with +00:00 become invalid if you do.
  const normalized = createdAt.includes('T')
    ? createdAt
    : createdAt.replace(' ', 'T')

  const created = new Date(normalized)
  if (Number.isNaN(created.getTime())) return '—'

  const diffMs = Date.now() - created.getTime()
  if (diffMs < 0) return 'just now'

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'}`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'}`

  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}
