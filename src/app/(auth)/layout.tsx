import React from 'react'
import { redirectAuthenticatedUser } from '@/lib/auth/server'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await redirectAuthenticatedUser()

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-slate-950 font-sans selection:bg-blue-500/30">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Noise overlay for texture */}
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}
