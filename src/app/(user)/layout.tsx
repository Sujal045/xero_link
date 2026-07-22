import React from 'react'
import { requireRole } from '@/lib/auth/server'

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['user'])

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {children}
    </div>
  )
}
