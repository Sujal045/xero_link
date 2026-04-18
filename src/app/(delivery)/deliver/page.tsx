'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, MapPin, User, Phone,
  CheckCircle2, Loader2, AlertCircle, IndianRupee
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Suspense } from 'react'

interface Order {
  id: string
  status: string
  total_pages: number
  print_type: string
  copies: number
  total_price: number
  delivery_address: string
  delivery_slot: string
  otp_verified: boolean
  users: { name: string; phone: string | null } | null
  shops: { shop_name: string } | null
}

function DeliverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [supabase] = useState(createClient)

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        router.push('/slot')
        return
      }

      const { data } = await supabase
        .from('orders')
        .select('*, users(name, phone), shops(shop_name)')
        .eq('id', orderId)
        .single()

      setOrder(data as Order)
      if ((data as Order)?.otp_verified) setVerified(true)
      setLoading(false)
    }

    loadOrder()
  }, [orderId, router, supabase])

  const handleVerify = async () => {
    if (otp.length < 4 || !orderId) return
    setVerifying(true)
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      setError('Your session has expired. Please sign in again.')
      setVerifying(false)
      router.push('/login')
      return
    }

    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ orderId, enteredOtp: otp }),
    })

    const result = await res.json()

    if (!result.success) {
      setError(result.error || 'Incorrect OTP. Please try again.')
      setVerifying(false)
      return
    }

    setVerified(true)
    setVerifying(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-500">Order not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-10">
      <header className="sticky top-0 z-10 px-5 pt-6 pb-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white mb-3 transition-colors">
          <ArrowLeft className="h-4 w-4" /> <span className="text-sm">Back to Slot</span>
        </button>
        <h1 className="text-xl font-bold">Deliver &amp; Verify</h1>
      </header>

      <div className="px-5 py-6 space-y-4 max-w-md mx-auto">
        {/* Success state */}
        {verified ? (
          <div className="flex flex-col items-center text-center py-12 space-y-4">
            <div className="h-20 w-20 rounded-full bg-blue-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Delivered! 🎉</h2>
              <p className="text-slate-400 mt-1">OTP verified successfully</p>
            </div>
            <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 px-8 py-5 w-full">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Collect from student</p>
              <p className="text-3xl font-bold text-blue-400">₹{Number(order.total_price).toFixed(2)}</p>
            </div>
            <Button onClick={() => router.push('/slot')}
              className="w-full h-12 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-base">
              Back to Slot
            </Button>
          </div>
        ) : (
          <>
            {/* Student Info */}
            <div className="rounded-2xl bg-white/4 border border-white/8 p-4 space-y-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student</h2>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">{order.users?.name}</p>
                  {order.users?.phone && (
                    <a href={`tel:${order.users.phone}`} className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 hover:text-blue-400 transition-colors">
                      <Phone className="h-3 w-3" /> {order.users.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="rounded-2xl bg-white/4 border border-white/8 p-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Deliver To</h2>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-blue-400 shirnk-0 mt-0.5" />
                <p className="text-sm text-white leading-relaxed">{order.delivery_address || 'No address specified'}</p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="rounded-2xl bg-white/4 border border-white/8 p-4 space-y-2">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Order Summary</h2>
              {[
                ['Shop',    order.shops?.shop_name ?? '—'],
                ['Pages',   order.total_pages],
                ['Type',    order.print_type === 'bw' ? 'Black & White' : 'Color'],
                ['Copies',  order.copies],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-white">{value}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 flex justify-between font-bold">
                <span className="flex items-center gap-1 text-slate-400"><IndianRupee className="h-4 w-4" />Collect Cash</span>
                <span className="text-blue-400 text-lg">₹{Number(order.total_price).toFixed(2)}</span>
              </div>
            </div>

            {/* OTP Input */}
            <div className="rounded-2xl bg-white/4 border border-white/8 p-5">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Verify OTP from Student</h2>
              <div className="flex gap-2 mb-2">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} className={`flex-1 h-12 rounded-xl flex items-center justify-center text-xl font-bold border transition-all ${
                    otp[i] ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-white/10 bg-black/20 text-slate-700'
                  }`}>
                    {otp[i] ?? '·'}
                  </div>
                ))}
              </div>
              <input
                type="number"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value.slice(0, 6))}
                className="w-full mt-3 px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-blue-500/50 placeholder:text-slate-700 placeholder:text-sm placeholder:tracking-normal"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <Button
              onClick={handleVerify}
              disabled={otp.length < 6 || verifying}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold text-base shadow-xl shadow-blue-500/20 disabled:opacity-40"
            >
              {verifying
                ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying…</>
                : <><CheckCircle2 className="mr-2 h-5 w-5" /> Verify &amp; Mark Delivered</>
              }
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function DeliverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <DeliverContent />
    </Suspense>
  )
}
