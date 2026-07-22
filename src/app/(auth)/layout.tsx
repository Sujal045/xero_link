import React from 'react'
import { redirectAuthenticatedUser } from '@/lib/auth/server'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await redirectAuthenticatedUser()

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-background font-sans">
      {/* Soft light atmosphere */}
      <div className="absolute top-[-20%] left-[-10%] w-[55%] h-[55%] rounded-full bg-accent/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-sky-300/20 blur-[110px] pointer-events-none" />
      <div className="absolute top-[45%] right-[15%] w-[28%] h-[28%] rounded-full bg-blue-200/30 blur-[90px] pointer-events-none" />

      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.035] pointer-events-none" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
        {children}
      </div>
    </div>
  )
}
