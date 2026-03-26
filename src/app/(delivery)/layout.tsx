import React from 'react'

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {children}
    </div>
  )
}
