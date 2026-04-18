import React from 'react'
import { requireRole } from '@/lib/auth/server'

export default async function DeliveryLayout({ children }: { children: React.ReactNode }) {
  await requireRole('delivery')

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {children}
    </div>
  )
}
