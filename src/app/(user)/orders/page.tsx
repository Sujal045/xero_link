'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppShell, AppContainer, PageHeader } from '@/components/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import {
  DELIVERY_PROGRESS_STEPS,
  STATUS_LABELS,
  getProgressStepIndex,
  type OrderStatus,
} from '@/types/order'
import {
  Clock, CheckCircle2, Printer, Package, MapPin, RefreshCw, XCircle, Truck,
} from 'lucide-react'

interface Order {
  id: string
  status: OrderStatus
  total_pages: number
  print_type: string
  copies: number
  total_price: number
  otp: string
  otp_verified: boolean
  delivery_slot: string
  delivery_address: string | null
  created_at: string
  shops: { shop_name: string } | null
}

const STATUS_META: Record<OrderStatus, { label: string; icon: React.ElementType }> = {
  pending:           { label: STATUS_LABELS.pending,           icon: Clock },
  printing:          { label: STATUS_LABELS.printing,          icon: Printer },
  ready:             { label: STATUS_LABELS.ready,             icon: Package },
  out_for_delivery:  { label: STATUS_LABELS.out_for_delivery,  icon: Truck },
  delivered:         { label: STATUS_LABELS.delivered,         icon: CheckCircle2 },
  rejected:          { label: STATUS_LABELS.rejected,          icon: XCircle },
}

export default function OrdersPage() {
  const router = useRouter()
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('orders')
      .select('*, shops(shop_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setOrders((data as Order[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('order-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'rejected')
  const pastOrders = orders.filter(o => o.status === 'delivered' || o.status === 'rejected')

  return (
    <AppShell>
      <PageHeader
        title="My Orders"
        subtitle={`${orders.length} total orders`}
        fallbackHref="/shops"
        actions={
          <Button variant="outline" size="icon" onClick={fetchOrders} aria-label="Refresh orders">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
        }
      />

      <AppContainer className="py-5 space-y-6 pb-10">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-surface-muted animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-surface-muted flex items-center justify-center mb-4">
              <Printer className="h-8 w-8 text-subtle" />
            </div>
            <p className="text-foreground font-semibold text-lg">No orders yet</p>
            <p className="text-muted-foreground text-sm mt-1">Find a shop and place your first order</p>
            <Button className="mt-5" onClick={() => router.push('/shops')}>
              Browse Shops
            </Button>
          </div>
        ) : (
          <>
            {activeOrders.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">Active</h2>
                <div className="space-y-3">
                  {activeOrders.map(order => <OrderCard key={order.id} order={order} onSelect={setSelectedOrder} />)}
                </div>
              </section>
            )}
            {pastOrders.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">Completed</h2>
                <div className="space-y-3">
                  {pastOrders.map(order => <OrderCard key={order.id} order={order} onSelect={setSelectedOrder} />)}
                </div>
              </section>
            )}
          </>
        )}
      </AppContainer>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSelectedOrder(null)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-5xl bg-surface rounded-t-3xl border-t border-border shadow-panel p-6 pb-10 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full bg-border-strong mx-auto mb-6" />

            <div className="text-center mb-6">
              <p className="text-xs text-muted-foreground mb-1">{selectedOrder.shops?.shop_name}</p>
              <h2 className="text-2xl font-bold text-foreground">
                {selectedOrder.status !== 'delivered' ? 'Your OTP' : 'Delivered'}
              </h2>
              {selectedOrder.status !== 'delivered' && (
                <div className="mt-3 inline-flex items-center gap-2 bg-accent-soft border border-accent-border rounded-2xl px-6 py-3">
                  <span className="text-4xl font-mono font-extrabold tracking-widest text-accent">
                    {selectedOrder.otp}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {selectedOrder.status !== 'delivered'
                  ? 'Show this OTP to the delivery partner when collecting your order'
                  : 'Order successfully completed'}
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-start relative">
                {DELIVERY_PROGRESS_STEPS.map((step, i) => {
                  const stepIdx = getProgressStepIndex(selectedOrder.status)
                  const done = stepIdx >= 0 && i <= stepIdx
                  const meta = STATUS_META[step]
                  const Icon = meta.icon
                  return (
                    <div key={step} className="flex-1 flex flex-col items-center relative min-w-0">
                      {i < DELIVERY_PROGRESS_STEPS.length - 1 && (
                        <div
                          className={`absolute top-5 left-1/2 w-full h-0.5 transition-all ${
                            done && i < stepIdx ? 'bg-accent' : 'bg-border'
                          }`}
                        />
                      )}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${
                          done
                            ? 'bg-accent text-white shadow-soft'
                            : 'bg-surface-muted border border-border text-subtle'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className={`text-[10px] sm:text-xs mt-2 text-center font-medium leading-tight px-0.5 ${done ? 'text-foreground' : 'text-subtle'}`}>
                        {meta.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Pages</span>
                <span className="text-foreground">{selectedOrder.total_pages}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground capitalize">
                  {selectedOrder.print_type === 'bw' ? 'B&W' : 'Color'} · {selectedOrder.copies} copies
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Delivery Slot
                </span>
                <span className="text-foreground">{selectedOrder.delivery_slot}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border items-center gap-4">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <MapPin className="h-3.5 w-3.5" /> Delivery Address
                </span>
                <span className="text-foreground text-right">
                  {selectedOrder.delivery_address || 'Address not provided'}
                </span>
              </div>
              <div className="flex justify-between pt-3">
                <span className="text-muted-foreground">Amount to pay (Cash)</span>
                <span className="text-accent font-bold text-base">
                  ₹{Number(selectedOrder.total_price).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function OrderCard({ order, onSelect }: { order: Order; onSelect: (o: Order) => void }) {
  const meta = STATUS_META[order.status]
  const Icon = meta.icon

  return (
    <Card interactive onClick={() => onSelect(order)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-accent-soft text-accent shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-foreground font-semibold text-sm truncate">
              {order.shops?.shop_name ?? 'Shop'}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {order.total_pages} pages · {order.print_type === 'bw' ? 'B&W' : 'Color'} · {order.copies}{' '}
              {order.copies > 1 ? 'copies' : 'copy'}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <StatusBadge status={order.status} />
          <p className="text-muted-foreground text-xs mt-1.5">
            ₹{Number(order.total_price).toFixed(2)}
          </p>
        </div>
      </div>
    </Card>
  )
}
