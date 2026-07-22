import { describe, expect, it } from 'vitest'
import { STATUS_LABELS, type OrderStatus } from '@/components/ui/badge'
import { ORDER_STATUSES } from '@/types/order'

describe('design system status labels', () => {
  it('covers every order status used by the app', () => {
    for (const status of ORDER_STATUSES) {
      expect(STATUS_LABELS[status as OrderStatus]).toBeTruthy()
    }
  })

  it('uses the customer-facing Ready for Pickup label', () => {
    expect(STATUS_LABELS.ready).toBe('Ready for Pickup')
  })

  it('uses Out for Delivery for the in-transit status', () => {
    expect(STATUS_LABELS.out_for_delivery).toBe('Out for Delivery')
  })
})
