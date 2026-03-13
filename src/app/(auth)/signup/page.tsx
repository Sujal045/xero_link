'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Printer, Loader2, ArrowRight, User, Building2, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'student' | 'owner' | 'delivery'>('student')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1. Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role, phone }, // store in auth.users metadata too
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('Signup failed. Please try again.')
      setLoading(false)
      return
    }

    // 2. Create user profile via server API route (uses service role key → bypasses RLS)
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: authData.user.id, name, role, phone }),
    })

    const result = await res.json()
    if (!res.ok) {
      setError(result.error || 'Failed to create profile.')
      setLoading(false)
      return
    }

    // 3. Redirect based on role
    if (role === 'student') {
      router.push('/shops')
    } else if (role === 'delivery') {
      router.push('/slot')
    } else {
      router.push('/dashboard')
    }
  }


  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 my-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center space-y-3 mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
            <Printer className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
          <p className="text-sm text-slate-400 text-center">
            Join XeroLink and start connecting
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 backdrop-blur-md transition-all">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={cn(
                "flex flex-col items-center justify-center space-y-2 p-3 rounded-2xl border transition-all duration-300",
                role === 'student' 
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/5" 
                  : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/5 hover:text-slate-300"
              )}
            >
              <User className="h-5 w-5" />
              <span className="text-xs font-medium">Student</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('owner')}
              className={cn(
                "flex flex-col items-center justify-center space-y-2 p-3 rounded-2xl border transition-all duration-300",
                role === 'owner' 
                  ? "border-blue-500/50 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/5" 
                  : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/5 hover:text-slate-300"
              )}
            >
              <Building2 className="h-5 w-5" />
              <span className="text-xs font-medium">Shop Owner</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('delivery')}
              className={cn(
                "flex flex-col items-center justify-center space-y-2 p-3 rounded-2xl border transition-all duration-300",
                role === 'delivery' 
                  ? "border-purple-500/50 bg-purple-500/10 text-purple-400 shadow-lg shadow-purple-500/5" 
                  : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/5 hover:text-slate-300"
              )}
            >
              <Truck className="h-5 w-5" />
              <span className="text-xs font-medium">Delivery</span>
            </button>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">Full Name</label>
            <Input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="bg-black/20 text-white placeholder:text-slate-500 border-white/10 focus-visible:border-emerald-500/50"
            />
          </div>

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
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">Phone Number</label>
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={loading}
              className="bg-black/20 text-white placeholder:text-slate-500 border-white/10 focus-visible:border-emerald-500/50"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">Password</label>
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
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/25 h-12 text-base rounded-xl mt-4 group" 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                Create Account 
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
