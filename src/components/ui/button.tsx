import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'soft' | 'danger' | 'glass'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          {
            'bg-accent text-accent-foreground shadow-soft hover:bg-accent-hover':
              variant === 'default',
            'border border-border-strong bg-surface text-foreground hover:bg-surface-muted hover:border-border-strong':
              variant === 'outline',
            'text-muted-foreground hover:bg-surface-muted hover:text-foreground':
              variant === 'ghost',
            'bg-accent-soft text-accent border border-accent-border hover:bg-accent hover:text-accent-foreground':
              variant === 'soft',
            'bg-danger text-white shadow-soft hover:bg-red-700':
              variant === 'danger',
            /* Legacy glass — light frosted surface for transitional screens */
            'bg-white/80 backdrop-blur-md border border-border text-foreground shadow-elevated hover:bg-white':
              variant === 'glass',
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-lg px-3 text-xs': size === 'sm',
            'h-12 rounded-xl px-8 text-base': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
