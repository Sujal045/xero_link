import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  STATUS_LABELS,
  type OrderStatus,
} from '@/types/order'

export type { OrderStatus }
export { STATUS_LABELS }

export type BadgeVariant =
  | 'default'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | OrderStatus

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-muted text-foreground border-border',
  accent: 'bg-accent-soft text-accent border-accent-border',
  success: 'bg-success-soft text-success border-emerald-200',
  warning: 'bg-warning-soft text-warning border-amber-200',
  danger: 'bg-danger-soft text-danger border-red-200',
  info: 'bg-info-soft text-info border-sky-200',
  muted: 'bg-surface-muted text-muted-foreground border-border',
  pending: 'bg-[var(--status-pending-soft)] text-[var(--status-pending)] border-amber-200',
  printing: 'bg-[var(--status-printing-soft)] text-[var(--status-printing)] border-blue-200',
  ready: 'bg-[var(--status-ready-soft)] text-[var(--status-ready)] border-violet-200',
  out_for_delivery:
    'bg-[var(--status-out-for-delivery-soft)] text-[var(--status-out-for-delivery)] border-sky-200',
  delivered: 'bg-[var(--status-delivered-soft)] text-[var(--status-delivered)] border-emerald-200',
  rejected: 'bg-[var(--status-rejected-soft)] text-[var(--status-rejected)] border-red-200',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide',
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'

export interface StatusBadgeProps
  extends Omit<BadgeProps, 'variant' | 'children'> {
  status: OrderStatus
  label?: string
}

function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  return (
    <Badge variant={status} className={className} {...props}>
      <span
        className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
        aria-hidden
      />
      {label ?? STATUS_LABELS[status]}
    </Badge>
  )
}

export { Badge, StatusBadge }
