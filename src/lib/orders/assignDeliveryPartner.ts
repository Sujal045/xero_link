/**
 * Picks the delivery partner with the fewest active deliveries.
 * Tie-break: stable sort by user id.
 */
export function pickLeastLoadedPartner(
  partnerIds: string[],
  activeCounts: Record<string, number>
): string | null {
  if (partnerIds.length === 0) return null

  const ranked = [...partnerIds].sort((a, b) => {
    const diff = (activeCounts[a] ?? 0) - (activeCounts[b] ?? 0)
    if (diff !== 0) return diff
    return a.localeCompare(b)
  })

  return ranked[0] ?? null
}

export function countActiveAssignments(
  rows: Array<{ delivery_partner_id: string | null }>
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    const id = row.delivery_partner_id
    if (!id) continue
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}
