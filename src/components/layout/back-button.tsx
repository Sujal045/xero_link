'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BackButtonProps {
  /** Used when there is no in-app history to go back to */
  fallbackHref?: string
  label?: string
  className?: string
}

export function BackButton({
  fallbackHref = '/',
  label = 'Back',
  className,
}: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const hasReferrer =
        document.referrer.length > 0 &&
        document.referrer.startsWith(window.location.origin)
      if (hasReferrer || window.history.length > 1) {
        router.back()
        return
      }
    }
    router.push(fallbackHref)
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground shadow-soft',
        'transition-all duration-200 hover:bg-surface-muted hover:border-border-strong active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  )
}
