'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppShell, AppContainer, PageHeader } from '@/components/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package, Clock, MapPin, ChevronRight,
  Truck, RefreshCw, Loader2
} from 'lucide-react'

interface Order {
  id: string
  status: string
  total_pages: number
  print_type: string
  copies: number
  total_price: number
  delivery_slot: string
  delivery_address: string
  delivery_partner_id: string | null
  created_at: string
  users: { name: string; phone: string | null } | null
  shops: { shop_name: string } | null
}

export default function SlotPage() {
  const router = useRouter()
  const [supabase] = useState(createClient)

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setOrders([])
      setUserId(null)
      setLoading(false)
      return
    }

    setUserId(user.id)

    // Assigned to me OR unassigned ready (available to claim)
    const { data, error } = await supabase
      .from('orders')
      .select('*, users!user_id(name, phone), shops(shop_name)')
      .in('status', ['ready', 'out_for_delivery'])
      .or(`delivery_partner_id.eq.${user.id},delivery_partner_id.is.null`)
      .order('delivery_slot', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      // Fallback if delivery_partner_id column missing: show all ready
      const fallback = await supabase
        .from('orders')
        .select('*, users!user_id(name, phone), shops(shop_name)')
        .eq('status', 'ready')
        .order('delivery_slot', { ascending: true })
        .order('created_at', { ascending: true })

      if (fallback.error) {
        setListError(fallback.error.message)
        setOrders([])
      } else {
        setListError(
          'Showing all ready orders. Run the delivery_partner_id migration for proper assignment.'
        )
        setOrders((fallback.data as Order[]) || [])
      }
    } else {
      setListError(null)
      // Keep out_for_delivery only if assigned to me; keep ready if assigned to me or unassigned
      const filtered = ((data as Order[]) || []).filter((o) => {
        if (o.status === 'out_for_delivery') return o.delivery_partner_id === user.id
        if (o.status === 'ready') {
          return !o.delivery_partner_id || o.delivery_partner_id === user.id
        }
        return false
      })
      setOrders(filtered)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    const channel = supabase.channel('delivery-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const openOrder = async (order: Order) => {
    const needsClaim =
      order.status === 'ready' &&
      (!order.delivery_partner_id || order.delivery_partner_id !== userId)

    if (needsClaim && !order.delivery_partner_id) {
      setClaimingId(order.id)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setListError('Session expired. Please sign in again.')
        setClaimingId(null)
        return
      }

      const res = await fetch('/api/orders/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      })

      const result = await res.json()
      setClaimingId(null)

      if (!res.ok) {
        setListError(result.error || 'Could not claim this order')
        await fetchOrders()
        return
      }
    }

    router.push(`/deliver?orderId=${order.id}`)
  }

  const slots = orders.reduce<Record<string, Order[]>>((acc, o) => {
    const slot = o.delivery_slot ?? 'Unscheduled'
    if (!acc[slot]) acc[slot] = []
    acc[slot].push(o)
    return acc
  }, {})

  const totalCash = orders.reduce((s, o) => s + Number(o.total_price), 0)
  const readyCount = orders.filter(o => o.status === 'ready').length
  const unassignedCount = orders.filter(
    o => o.status === 'ready' && !o.delivery_partner_id
  ).length

  return (
    <AppShell>
      <PageHeader
        title="My Deliveries"
        subtitle="Assigned to you and available ready orders"
        showBack={false}
        actions={
          <Button variant="outline" size="icon" onClick={fetchOrders} aria-label="Refresh orders">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
        }
      >
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl bg-accent-soft px-4 py-3 text-center">
            <p className="text-lg font-bold text-accent">{orders.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">In queue</p>
          </div>
          <div className="flex-1 rounded-2xl bg-[var(--status-ready-soft)] px-4 py-3 text-center">
            <p className="text-lg font-bold text-[var(--status-ready)]">{readyCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ready</p>
          </div>
          <div className="flex-1 rounded-2xl bg-success-soft px-4 py-3 text-center">
            <p className="text-lg font-bold text-success">₹{totalCash.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Cash</p>
          </div>
        </div>
        {unassignedCount > 0 && (
          <p className="text-xs text-muted-foreground mt-3 px-1">
            {unassignedCount} unassigned — tap to claim and deliver
          </p>
        )}
      </PageHeader>

      <AppContainer className="py-5 space-y-6 pb-10">
        {listError && (
          <div className="rounded-xl border border-amber-200 bg-warning-soft p-4 text-sm text-warning">
            {listError}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-surface-muted animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-surface-muted flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-subtle" />
            </div>
            <p className="text-foreground font-semibold text-lg">No deliveries yet</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              Ready orders appear here when a shop marks them Ready for Pickup. If they stay unassigned, ask the owner to tap Assign Partner.
            </p>
          </div>
        ) : (
          Object.entries(slots).map(([slot, slotOrders]) => (
            <section key={slot}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
                <h2 className="text-xs font-semibold text-accent uppercase tracking-widest">{slot} Slot</h2>
                <span className="text-xs text-muted-foreground">· {slotOrders.length} orders</span>
              </div>

              <div className="space-y-3">
                {slotOrders.map(order => {
                  const unassigned = !order.delivery_partner_id
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => openOrder(order)}
                      disabled={claimingId === order.id}
                      className="w-full text-left"
                    >
                      <Card interactive className="group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-11 w-11 rounded-xl bg-[var(--status-ready-soft)] flex items-center justify-center shrink-0 text-[var(--status-ready)]">
                              {claimingId === order.id
                                ? <Loader2 className="h-5 w-5 animate-spin" />
                                : <Truck className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground truncate">
                                  {order.users?.name ?? 'User'}
                                </p>
                                {unassigned && (
                                  <Badge variant="warning">Unassigned</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                From: {order.shops?.shop_name ?? 'Shop'}
                              </p>
                              {order.delivery_address && (
                                <p className="flex items-start gap-1 text-xs text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                  <span className="truncate">{order.delivery_address}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-accent">₹{Number(order.total_price).toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{order.total_pages} pgs</p>
                            <ChevronRight className="h-4 w-4 text-subtle group-hover:text-accent ml-auto mt-1 transition-colors" />
                          </div>
                        </div>
                      </Card>
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </AppContainer>
    </AppShell>
  )
}
