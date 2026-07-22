'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Printer, Loader2, ArrowRight, User, Building2, Truck, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignupFormValues, signupFormSchema } from '@/lib/validations/auth'

type SignupField = keyof SignupFormValues

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailConfirmRequired, setEmailConfirmRequired] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SignupField, string[]>>>({})

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'user' | 'owner' | 'delivery'>('user')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError(null)
    setFieldErrors({})
    setEmailConfirmRequired(false)

    try {
      const parsedForm = signupFormSchema.safeParse({ name, email, password, phone, role })

      if (!parsedForm.success) {
        setFieldErrors(parsedForm.error.flatten().fieldErrors)
        setError('Please fix the highlighted fields.')
        return
      }

      const formData = parsedForm.data

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            phone: formData.phone,
          },
        },
      })

      if (signUpError) throw signUpError

      if (!data.user) throw new Error('Signup failed. Please try again.')

      const token = data.session?.access_token

      if (!token) {
        setEmailConfirmRequired(true)
        return
      }

      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Profile creation failed')
      }

      const roleRedirects: Record<typeof formData.role, string> = {
        user: '/shops',
        delivery: '/slot',
        owner: '/dashboard',
      }
      router.push(roleRedirects[formData.role])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (emailConfirmRequired) {
    return (
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 my-8">
        <Card padding="lg" className="shadow-panel text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-elevated">
              <Mail className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
          <p className="text-muted-foreground text-sm">
            We sent a confirmation link to{' '}
            <span className="text-foreground font-medium">{email}</span>. Open it to activate your account.
          </p>
          <Link
            href="/login"
            className="inline-block mt-2 text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            Back to Sign In
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 my-8">
      <Card padding="lg" className="shadow-panel">
        <div className="flex flex-col items-center space-y-3 mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-elevated">
            <Printer className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground text-center">
            Join XeroLink and start connecting
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-xl border border-red-200 bg-danger-soft p-4 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-2">
            {([
              { value: 'user', label: 'User', Icon: User },
              { value: 'owner', label: 'Shop Owner', Icon: Building2 },
              { value: 'delivery', label: 'Delivery', Icon: Truck },
            ] as const).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={cn(
                  'flex flex-col items-center justify-center space-y-2 p-3 rounded-2xl border transition-all duration-200',
                  role === value
                    ? 'border-accent-border bg-accent-soft text-accent shadow-soft'
                    : 'border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
          {fieldErrors.role?.[0] && (
            <p className="text-xs text-danger -mt-1">{fieldErrors.role[0]}</p>
          )}

          {([
            { id: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', value: name, onChange: setName, field: 'name' as SignupField, autoComplete: 'name' },
            { id: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', value: email, onChange: setEmail, field: 'email' as SignupField, autoComplete: 'email' },
            { id: 'phone', label: 'Phone Number', type: 'tel', placeholder: '9876543210', value: phone, onChange: setPhone, field: 'phone' as SignupField, autoComplete: 'tel' },
            { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••', value: password, onChange: setPassword, field: 'password' as SignupField, autoComplete: 'new-password' },
          ]).map(({ id, label, type, placeholder, value, onChange, field, autoComplete }) => {
            const fieldError = fieldErrors[field]?.[0] ?? null
            return (
              <div key={id} className="space-y-1.5">
                <label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-0.5">
                  {label}
                </label>
                <Input
                  id={id}
                  type={type}
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={loading}
                  autoComplete={autoComplete}
                />
                {fieldError && (
                  <p className="ml-0.5 text-xs text-danger">{fieldError}</p>
                )}
              </div>
            )
          })}

          <Button type="submit" size="lg" className="w-full mt-4 group" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-accent hover:text-accent-hover transition-colors">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  )
}
