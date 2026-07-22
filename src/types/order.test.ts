import { describe, expect, it } from 'vitest'
import {
  DELIVERABLE_STATUSES,
  DELIVERY_PROGRESS_STEPS,
  getProgressStepIndex,
  isDeliverableStatus,
  isOrderStatus,
  ORDER_STATUSES,
  STATUS_LABELS,
} from '@/types/order'

describe('order status domain', () => {
  it('includes out_for_delivery in the canonical status list', () => {
    expect(ORDER_STATUSES).toContain('out_for_delivery')
  })

  it('places out_for_delivery between ready and delivered in progress steps', () => {
    expect(DELIVERY_PROGRESS_STEPS).toEqual([
      'pending',
      'printing',
      'ready',
      'out_for_delivery',
      'delivered',
    ])
  })

  it('labels Ready for Pickup and Out for Delivery correctly', () => {
    expect(STATUS_LABELS.ready).toBe('Ready for Pickup')
    expect(STATUS_LABELS.out_for_delivery).toBe('Out for Delivery')
  })

  it('treats ready and out_for_delivery as deliverable for OTP', () => {
    expect(DELIVERABLE_STATUSES).toEqual(['ready', 'out_for_delivery'])
    expect(isDeliverableStatus('ready')).toBe(true)
    expect(isDeliverableStatus('out_for_delivery')).toBe(true)
    expect(isDeliverableStatus('printing')).toBe(false)
  })

  it('computes progress step index', () => {
    expect(getProgressStepIndex('ready')).toBe(2)
    expect(getProgressStepIndex('out_for_delivery')).toBe(3)
    expect(getProgressStepIndex('delivered')).toBe(4)
    expect(getProgressStepIndex('rejected')).toBe(-1)
  })

  it('validates status strings', () => {
    expect(isOrderStatus('out_for_delivery')).toBe(true)
    expect(isOrderStatus('not-a-status')).toBe(false)
  })
})
