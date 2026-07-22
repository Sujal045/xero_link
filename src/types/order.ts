/**
 * Shared order domain types for XeroLink.
 *
 * Lifecycle:
 *   pending → printing → ready → out_for_delivery → delivered
 *                 ↘ rejected
 */

export const ORDER_STATUSES = [
  'pending',
  'printing',
  'ready',
  'out_for_delivery',
  'delivered',
  'rejected',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Customer-facing progress (excludes rejected). */
export const DELIVERY_PROGRESS_STEPS = [
  'pending',
  'printing',
  'ready',
  'out_for_delivery',
  'delivered',
] as const

export type DeliveryProgressStep = (typeof DELIVERY_PROGRESS_STEPS)[number]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  printing: 'Printing',
  ready: 'Ready for Pickup',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  rejected: 'Rejected',
}

/** Statuses from which OTP delivery handoff is allowed.
 * Prefer out_for_delivery; ready kept for backward compatibility. */
export const DELIVERABLE_STATUSES: readonly OrderStatus[] = [
  'out_for_delivery',
  'ready',
] as const

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value)
}

export function isDeliverableStatus(status: string): boolean {
  return (DELIVERABLE_STATUSES as readonly string[]).includes(status)
}

/** Index in the customer progress stepper (-1 if rejected / unknown). */
export function getProgressStepIndex(status: string): number {
  if (status === 'rejected') return -1
  return (DELIVERY_PROGRESS_STEPS as readonly string[]).indexOf(status)
}
