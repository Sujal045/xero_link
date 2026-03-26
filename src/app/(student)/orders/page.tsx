'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Clock, CheckCircle2, Printer, Package, MapPin, RefreshCw,
  XCircle
} from 'lucide-react'

interface Order {
  id: string
  status: 'pending' | 'printing' | 'ready' | 'delivered'
  total_pages: number
  print_type: string
  copies: number
  total_price: number
  otp: string
  otp_verified: boolean
  delivery_slot: string
  created_at: string
  shops: { shop_name: string } | null
}

const STATUS_STEPS = ['pending', 'printing', 'ready', 'delivered'] as const

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending:   { label: 'Pending',          icon: Clock,         color: 'text-amber-400' },
  printing:  { label: 'Printing',         icon: Printer,       color: 'text-blue-400' },
  ready:     { label: 'Ready for Pickup', icon: Package,       color: 'text-purple-400' },
  delivered: { label: 'Delivered',        icon: CheckCircle2,  color: 'text-blue-400' },
  rejected: { label: 'Rejected',        icon: XCircle,  color: 'text-blue-400' },
}

export default function OrdersPage() {
  const router = useRouter()
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

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

    // Realtime subscription
    const channel = supabase
      .channel('order-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const activeOrders = orders.filter(o => o.status !== 'delivered')
  const pastOrders = orders.filter(o => o.status === 'delivered')

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="px-5 pt-6 pb-4 border-b border-white/5 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">My Orders</h1>
            <p className="text-xs text-slate-500 mt-0.5">{orders.length} total orders</p>
          </div>
          <button onClick={fetchOrders} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <RefreshCw className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </header>

      <div className="px-4 py-5 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Printer className="h-14 w-14 text-slate-700 mb-4" />
            <p className="text-slate-300 font-semibold text-lg">No orders yet</p>
            <p className="text-slate-500 text-sm mt-1">Find a shop and place your first order</p>
            <button onClick={() => router.push('/shops')}
              className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
              Browse Shops
            </button>
          </div>
        ) : (
          <>
            {activeOrders.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">Active</h2>
                <div className="space-y-3">
                  {activeOrders.map(order => <OrderCard key={order.id} order={order} onSelect={setSelectedOrder} />)}
                </div>
              </section>
            )}
            {pastOrders.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">Completed</h2>
                <div className="space-y-3">
                  {pastOrders.map(order => <OrderCard key={order.id} order={order} onSelect={setSelectedOrder} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedOrder(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full bg-slate-900 rounded-t-3xl border-t border-white/10 p-6 pb-10 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />

            <div className="text-center mb-6">
              <p className="text-xs text-slate-500 mb-1">{selectedOrder.shops?.shop_name}</p>
              <h2 className="text-2xl font-bold">{selectedOrder.status !== 'delivered' ? 'Your OTP' : '✓ Delivered'}</h2>
              {selectedOrder.status !== 'delivered' && (
                <div className="mt-3 inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-2xl px-6 py-3">
                  <span className="text-4xl font-mono font-extrabold tracking-widest text-blue-400">
                    {selectedOrder.otp}
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">
                {selectedOrder.status !== 'delivered'
                  ? 'Show this OTP to the delivery boy when collecting your order'
                  : 'Order successfully completed'}
              </p>
            </div>

            {/* Status Stepper */}
            <div className="mb-6">
              <div className="flex items-center relative">
                {STATUS_STEPS.map((step, i) => {
                  const stepIdx = STATUS_STEPS.indexOf(selectedOrder.status)
                  const done = i <= stepIdx
                  const meta = STATUS_META[step]
                  const Icon = meta.icon
                  return (
                    <div key={step} className="flex-1 flex flex-col items-center relative">
                      {i < STATUS_STEPS.length - 1 && (
                        <div
                          className={`absolute top-5 left-1/2 w-full h-0.5 transition-all ${
                            done && i < stepIdx ? "bg-blue-500" : "bg-white/10"
                          }`}
                        />
                      )}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${done ? 'bg-blue-500 shadow-lg shadow-blue-500/30' : 'bg-white/8 border border-white/10'}`}>
                        <Icon className={`h-4 w-4 ${done ? 'text-white' : 'text-slate-600'}`} />
                      </div>
                      <p className={`text-xs mt-2 text-center font-medium ${done ? 'text-slate-300' : 'text-slate-600'}`}>
                        {meta.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Order Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-500">Pages</span>
                <span className="text-white">{selectedOrder.total_pages}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-500">Type</span>
                <span className="text-white capitalize">{selectedOrder.print_type === 'bw' ? 'B&W' : 'Color'} · {selectedOrder.copies} copies</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5 items-center">
                <span className="text-slate-500 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Delivery Slot</span>
                <span className="text-white">{selectedOrder.delivery_slot}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5 items-center">
                <span className="text-slate-500 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Pickup</span>
                <span className="text-white">Campus Pickup Spot</span>
              </div>
              <div className="flex justify-between pt-3">
                <span className="text-slate-500">Amount to pay (Cash)</span>
                <span className="text-blue-400 font-bold text-base">₹{Number(selectedOrder.total_price).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, onSelect }: { order: Order; onSelect: (o: Order) => void }) {
  const meta = STATUS_META[order.status]
  const Icon = meta.icon

  return (
    <div onClick={() => onSelect(order)}
      className="group rounded-2xl border border-white/8 bg-white/4 hover:bg-white/7 hover:border-white/15 p-4 cursor-pointer transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-white/5`}>
            <Icon className={`h-5 w-5 ${meta.color}`} />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{order.shops?.shop_name ?? 'Shop'}</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {order.total_pages} pages · {order.print_type === 'bw' ? 'B&W' : 'Color'} · {order.copies} {order.copies > 1 ? 'copies' : 'copy'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            order.status === 'delivered' ? 'bg-blue-500/15 text-blue-400' :
            order.status === 'ready' ? 'bg-purple-500/15 text-purple-400' :
            order.status === 'printing' ? 'bg-blue-500/15 text-blue-400' :
            'bg-amber-500/15 text-amber-400'
          }`}>{meta.label}</span>
          <p className="text-slate-500 text-xs mt-1.5">₹{Number(order.total_price).toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
