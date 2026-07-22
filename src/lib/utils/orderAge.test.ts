import { describe, expect, it } from 'vitest'
import { getOrderAgeLabel } from '@/lib/utils/orderAge'

describe('getOrderAgeLabel', () => {
  it('handles ISO timestamps with timezone offset (no NaN)', () => {
    const past = new Date(Date.now() - 5 * 60 * 1000).toISOString().replace('Z', '+00:00')
    const label = getOrderAgeLabel(past)
    expect(label).not.toContain('NaN')
    expect(label).toMatch(/min/)
  })

  it('handles plain Z timestamps', () => {
    const past = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(getOrderAgeLabel(past)).toMatch(/hr/)
  })

  it('returns dash for invalid input', () => {
    expect(getOrderAgeLabel('not-a-date')).toBe('—')
  })

  it('returns just now for missing values', () => {
    expect(getOrderAgeLabel(null)).toBe('just now')
    expect(getOrderAgeLabel(undefined)).toBe('just now')
  })
})
