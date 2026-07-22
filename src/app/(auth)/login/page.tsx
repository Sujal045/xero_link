'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Printer, Loader2, ArrowRight } from 'lucide-react'
import { getRoleHomePath } from '@/lib/auth/roles'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginField = 'email' | 'password'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LoginField, string[]>>>({})

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const parsed = loginSchema.safeParse({ email, password })
      if (!parsed.success) {
        setFieldErrors(parsed.error.flatten().fieldErrors)
        return
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      const userId = data.user?.id
      if (!userId) {
        setError('Login failed. Please try again.')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      let finalRole = profile?.role

      if (!finalRole) {
        const metadata = data.user?.user_metadata
        const accessToken = data.session?.access_token

        if (metadata && accessToken) {
          const res = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          })
          if (res.ok) {
            finalRole = metadata.role
          }
        }
      }

      router.push(getRoleHomePath(finalRole ?? null))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const emailError = fieldErrors.email?.[0] ?? null
  const passwordError = fieldErrors.password?.[0] ?? null

  return (
    <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
      <Card padding="lg" className="shadow-panel border-border">
        <div className="flex flex-col items-center space-y-3 mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-elevated">
            <Printer className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome Back</h1>
          <p className="text-sm text-muted-foreground text-center">
            Sign in to continue to XeroLink
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          {error && (
            <div className="rounded-xl border border-red-200 bg-danger-soft p-4 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-0.5">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            {emailError && <p className="ml-0.5 text-xs text-danger">{emailError}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-0.5">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {passwordError && <p className="ml-0.5 text-xs text-danger">{passwordError}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full mt-2 group" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-accent hover:text-accent-hover transition-colors">
            Create one
          </Link>
        </div>
      </Card>
    </div>
  )
}
