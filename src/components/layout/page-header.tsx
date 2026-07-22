import * as React from 'react'
import { cn } from '@/lib/utils'
import { AppContainer } from '@/components/layout/app-shell'
import { BackButton } from '@/components/layout/back-button'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Show back control; defaults to true when fallbackHref is set */
  showBack?: boolean
  fallbackHref?: string
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  showBack,
  fallbackHref = '/',
  actions,
  className,
  children,
}: PageHeaderProps) {
  const shouldShowBack = showBack ?? Boolean(fallbackHref)

  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-xl',
        className
      )}
    >
      <AppContainer className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {shouldShowBack && (
              <BackButton fallbackHref={fallbackHref} className="mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
                {title}
              </h1>
              {subtitle ? (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          ) : null}
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </AppContainer>
    </header>
  )
}
