'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  MapPin, User, Phone, Truck,
  CheckCircle2, Loader2, AlertCircle, IndianRupee, Navigation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppShell, AppContainer, PageHeader } from '@/components/layout'
import {
  getCurrentPosition,
  useCourierLocationSharing,
} from '@/hooks/useCourierLocationSharing'

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
  delivery_partner_id?: string | null
  users: { name: string; phone: string | null } | null
  shops: { shop_name: string } | null
}

async function loadDeliveryOrder(
  supabase: ReturnType<typeof createClient>,
  orderId: string
): Promise<{ order: Order | null; error: string | null }> {
  const primary = await supabase
    .from('orders')
    .select('*, users!user_id(name, phone), shops(shop_name)')
    .eq('id', orderId)
    .maybeSingle()

  if (!primary.error && primary.data) {
    return { order: primary.data as Order, error: null }
  }

  const fallback = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (fallback.error) {
    return { order: null, error: fallback.error.message }
  }

  if (!fallback.data) {
    return {
      order: null,
      error: primary.error?.message || 'Order not found.',
    }
  }

  return {
    order: {
      ...(fallback.data as Order),
      users: null,
      shops: null,
    },
    error: null,
  }
}

function DeliverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [supabase] = useState(createClient)

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inTransit = order?.status === 'out_for_delivery'
  const {
    sharing,
    lastUpdate,
    error: locationError,
  } = useCourierLocationSharing(orderId, Boolean(inTransit && !verified))

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        router.push('/slot')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { order: loaded, error: loadError } = await loadDeliveryOrder(supabase, orderId)

      if (!loaded) {
        setError(loadError || 'Order not found.')
        setOrder(null)
        setLoading(false)
        return
      }

      if (
        loaded.delivery_partner_id &&
        loaded.delivery_partner_id !== user.id
      ) {
        setError('This order is assigned to another delivery partner.')
        setOrder(null)
        setLoading(false)
        return
      }

      setOrder(loaded)
      setError(null)
      if (loaded.otp_verified || loaded.status === 'delivered') setVerified(true)
      setLoading(false)
    }

    loadOrder()
  }, [orderId, router, supabase])

  const handleStartDelivery = async () => {
    if (!orderId) return
    setStarting(true)
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setError('Your session has expired. Please sign in again.')
      setStarting(false)
      router.push('/login')
      return
    }

    const coords = await getCurrentPosition()

    const res = await fetch('/api/orders/start-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        orderId,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      }),
    })

    const result = await res.json()
    if (!res.ok || !result.success) {
      setError(result.error || 'Could not start delivery.')
      setStarting(false)
      return
    }

    setOrder((prev) =>
      prev
        ? { ...prev, status: 'out_for_delivery', delivery_partner_id: prev.delivery_partner_id }
        : prev
    )
    if (result.warning) setError(result.warning)
    setStarting(false)
  }

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

    if (!res.ok || !result.success) {
      setError(result.error || 'Could not verify OTP. Please try again.')
      setVerifying(false)
      return
    }

    setVerified(true)
    setOrder((prev) => (prev ? { ...prev, status: 'delivered', otp_verified: true } : prev))
    setVerifying(false)
  }

  if (loading) {
    return (
      <AppShell className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </AppShell>
    )
  }

  if (!order) {
    return (
      <AppShell className="flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-muted-foreground">{error ?? 'Order not found.'}</p>
        <Button variant="outline" onClick={() => router.push('/slot')}>
          Back to deliveries
        </Button>
      </AppShell>
    )
  }

  const needsStart = order.status === 'ready'

  return (
    <AppShell className="pb-10">
      <PageHeader
        title="Deliver & Verify"
        subtitle={order.shops?.shop_name ?? 'Delivery handoff'}
        fallbackHref="/slot"
        actions={
          inTransit ? (
            <Badge variant="info">Out for Delivery</Badge>
          ) : needsStart ? (
            <Badge variant="ready">Ready for Pickup</Badge>
          ) : null
        }
      />

      <AppContainer className="py-6 space-y-4 max-w-md pb-10">
        {verified ? (
          <div className="flex flex-col items-center text-center py-12 space-y-4">
            <div className="h-20 w-20 rounded-full bg-success-soft flex items-center justify-center text-success">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Delivered!</h2>
              <p className="text-muted-foreground mt-1">OTP verified successfully</p>
            </div>
            <Card className="border-accent-border bg-accent-soft/50 px-8 py-5 w-full text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Collect from user</p>
              <p className="text-3xl font-bold text-accent">₹{Number(order.total_price).toFixed(2)}</p>
            </Card>
            <Button onClick={() => router.push('/slot')} size="lg" className="w-full rounded-2xl">
              Back to Slot
            </Button>
          </div>
        ) : (
          <>
            <Card className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</h2>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-accent-soft flex items-center justify-center shrink-0 text-accent">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{order.users?.name ?? 'Customer'}</p>
                  {order.users?.phone && (
                    <a
                      href={`tel:${order.users.phone}`}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 hover:text-accent transition-colors"
                    >
                      <Phone className="h-3 w-3" /> {order.users.phone}
                    </a>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deliver To</h2>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">
                  {order.delivery_address || 'No address specified'}
                </p>
              </div>
            </Card>

            <Card className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Order Summary</h2>
              {[
                ['Shop',    order.shops?.shop_name ?? '—'],
                ['Pages',   order.total_pages],
                ['Type',    order.print_type === 'bw' ? 'Black & White' : 'Color'],
                ['Copies',  order.copies],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground">{value}</span>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex justify-between font-bold">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <IndianRupee className="h-4 w-4" />Collect Cash
                </span>
                <span className="text-accent text-lg">₹{Number(order.total_price).toFixed(2)}</span>
              </div>
            </Card>

            {needsStart && (
              <Card className="border-accent-border bg-accent-soft/40 space-y-3" padding="lg">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Start delivery</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tap when you pick up the order from the shop. Status becomes Out for Delivery and live location sharing begins.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleStartDelivery}
                  disabled={starting}
                  size="lg"
                  className="w-full h-12 rounded-2xl"
                >
                  {starting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting…</>
                  ) : (
                    <><Navigation className="mr-2 h-5 w-5" /> Start Delivery</>
                  )}
                </Button>
              </Card>
            )}

            {inTransit && (
              <>
                <Card className="border-sky-200 bg-info-soft/60 space-y-2">
                  <div className="flex items-center gap-2 text-info font-semibold text-sm">
                    <span className="h-2 w-2 rounded-full bg-info animate-pulse" />
                    {sharing ? 'Live location sharing on' : 'Waiting for location…'}
                  </div>
                  {lastUpdate && (
                    <p className="text-xs text-muted-foreground">
                      Last update {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  )}
                  {(locationError || error) && (
                    <p className="text-xs text-warning">{locationError || error}</p>
                  )}
                </Card>

                <Card padding="lg">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Verify OTP from User
                  </h2>
                  <div className="flex gap-2 mb-2">
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`flex-1 h-12 rounded-xl flex items-center justify-center text-xl font-bold border transition-all ${
                          otp[i]
                            ? 'border-accent-border bg-accent-soft text-accent'
                            : 'border-border bg-surface-muted text-subtle'
                        }`}
                      >
                        {otp[i] ?? '·'}
                      </div>
                    ))}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full mt-3 px-4 py-3 rounded-xl bg-surface border border-border text-foreground text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-accent placeholder:text-subtle placeholder:text-sm placeholder:tracking-normal"
                  />
                </Card>

                {error && !locationError && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-danger-soft p-4 text-sm text-danger">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
                  </div>
                )}

                <Button
                  onClick={handleVerify}
                  disabled={otp.length < 6 || verifying}
                  size="lg"
                  className="w-full h-14 rounded-2xl text-base disabled:opacity-40"
                >
                  {verifying
                    ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying…</>
                    : <><CheckCircle2 className="mr-2 h-5 w-5" /> Verify &amp; Mark Delivered</>
                  }
                </Button>
              </>
            )}

            {needsStart && error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-danger-soft p-4 text-sm text-danger">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
          </>
        )}
      </AppContainer>
    </AppShell>
  )
}

export default function DeliverPage() {
  return (
    <Suspense fallback={
      <AppShell className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </AppShell>
    }>
      <DeliverContent />
    </Suspense>
  )
}
