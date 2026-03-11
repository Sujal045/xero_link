'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Printer, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Role-based redirect
    const userId = data.user?.id
    if (userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (userData?.role === 'student' || userData?.role === 'faculty') {
        router.push('/shops')
      } else if (userData?.role === 'owner') {
        router.push('/dashboard')
      } else if (userData?.role === 'delivery') {
        router.push('/slot')
      } else {
        router.push('/')
      }
    }
  }

  return (
    <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center space-y-3 mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
            <Printer className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h1>
          <p className="text-sm text-slate-400 text-center">
            Sign in to continue to XeroLink
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 backdrop-blur-md transition-all">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">Email</label>
            <Input
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-black/20 text-white placeholder:text-slate-500 border-white/10 focus-visible:border-emerald-500/50"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Password</label>
              <Link href="#" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Forgot?</Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="bg-black/20 text-white placeholder:text-slate-500 border-white/10 focus-visible:border-emerald-500/50"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/25 h-12 text-base rounded-xl mt-2 group" 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <Link href="/signup" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
            Create one
          </Link>
        </div>
      </div>
    </div>
  )
}
