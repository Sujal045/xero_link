import * as React from 'react'
import { cn } from '@/lib/utils'

/** Full-page light shell shared across portals */
export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'min-h-screen bg-background text-foreground font-sans',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Centered content column — keeps consistent side gaps on all pages
 * (matches the home page max-w-5xl rhythm).
 */
export function AppContainer({
  children,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'main' | 'section'
}) {
  return (
    <Tag
      className={cn('mx-auto w-full max-w-5xl px-4 sm:px-6', className)}
    >
      {children}
    </Tag>
  )
}
