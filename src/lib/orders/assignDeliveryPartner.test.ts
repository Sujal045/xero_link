import { describe, expect, it } from 'vitest'
import {
  countActiveAssignments,
  pickLeastLoadedPartner,
} from '@/lib/orders/assignDeliveryPartner'

describe('pickLeastLoadedPartner', () => {
  it('returns null when there are no partners', () => {
    expect(pickLeastLoadedPartner([], {})).toBeNull()
  })

  it('picks the only available partner', () => {
    expect(pickLeastLoadedPartner(['d1'], {})).toBe('d1')
  })

  it('picks the partner with the fewest active orders', () => {
    expect(
      pickLeastLoadedPartner(['d1', 'd2', 'd3'], { d1: 3, d2: 1, d3: 2 })
    ).toBe('d2')
  })

  it('tie-breaks by id for stable assignment', () => {
    expect(pickLeastLoadedPartner(['d2', 'd1'], { d1: 1, d2: 1 })).toBe('d1')
  })
})

describe('countActiveAssignments', () => {
  it('counts non-null partner ids', () => {
    expect(
      countActiveAssignments([
        { delivery_partner_id: 'd1' },
        { delivery_partner_id: 'd1' },
        { delivery_partner_id: null },
        { delivery_partner_id: 'd2' },
      ])
    ).toEqual({ d1: 2, d2: 1 })
  })
})
