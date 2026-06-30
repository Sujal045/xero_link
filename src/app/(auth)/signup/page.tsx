'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30">
              <Mail className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Check your email</h2>
          <p className="text-slate-400 text-sm">
            We sent a confirmation link to <span className="text-white font-medium">{email}</span>. Open it to activate your account.
          </p>
          <Link href="/login" className="inline-block mt-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 my-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center space-y-3 mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30">
            <Printer className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
          <p className="text-sm text-slate-400 text-center">
            Join XeroLink and start connecting
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 backdrop-blur-md">
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
                  'flex flex-col items-center justify-center space-y-2 p-3 rounded-2xl border transition-all duration-300',
                  role === value
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/5'
                    : 'border-white/10 bg-black/20 text-slate-400 hover:bg-white/5 hover:text-slate-300'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          {([
            { id: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', value: name, onChange: setName, field: 'name' as SignupField },
            { id: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', value: email, onChange: setEmail, field: 'email' as SignupField },
            { id: 'phone', label: 'Phone Number', type: 'tel', placeholder: '9876543210', value: phone, onChange: setPhone, field: 'phone' as SignupField },
            { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••', value: password, onChange: setPassword, field: 'password' as SignupField },
          ]).map(({ id, label, type, placeholder, value, onChange, field }) => {
            const fieldError = fieldErrors[field]?.[0] ?? null
            return (
              <div key={id} className="space-y-1">
                <label htmlFor={id} className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">
                  {label}
                </label>
                <Input
                  id={id}
                  type={type}
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={loading}
                  className="bg-black/20 text-white placeholder:text-slate-500 border-white/10 focus-visible:border-blue-500/50"
                />
                {fieldError && (
                  <p className="ml-1 text-xs text-red-400">{fieldError}</p>
                )}
              </div>
            )
          })}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-blue-500/25 h-12 text-base rounded-xl mt-4 group"
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
          <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
