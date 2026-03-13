'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Package, Clock, MapPin, ChevronRight,
  Truck, Loader2, RefreshCw, Printer
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
  created_at: string
  users: { name: string; phone: string | null } | null
  shops: { shop_name: string } | null
}

export default function SlotPage() {
  const router = useRouter()
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // For now show all 'ready' orders across all shops
    const { data } = await supabase
      .from('orders')
      .select('*, users(name, phone), shops(shop_name)')
      .eq('status', 'ready')
      .order('delivery_slot', { ascending: true })
      .order('created_at', { ascending: true })

    setOrders((data as Order[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    const channel = supabase.channel('delivery-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Group orders by delivery slot
  const slots = orders.reduce<Record<string, Order[]>>((acc, o) => {
    const slot = o.delivery_slot ?? 'Unscheduled'
    if (!acc[slot]) acc[slot] = []
    acc[slot].push(o)
    return acc
  }, {})

  const totalCash = orders.reduce((s, o) => s + Number(o.total_price), 0)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 px-5 pt-6 pb-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Delivery Portal</p>
            <h1 className="text-xl font-bold text-white mt-0.5">Ready Orders</h1>
          </div>
          <button onClick={fetchOrders} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <RefreshCw className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Summary strip */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 rounded-2xl bg-emerald-500/10 px-4 py-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{orders.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">To Deliver</p>
          </div>
          <div className="flex-1 rounded-2xl bg-blue-500/10 px-4 py-3 text-center">
            <p className="text-lg font-bold text-blue-400">₹{totalCash.toFixed(0)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Cash to Collect</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-5 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package className="h-14 w-14 text-slate-700 mb-4" />
            <p className="text-slate-300 font-semibold text-lg">No orders ready for delivery</p>
            <p className="text-slate-500 text-sm mt-1">Check back soon — orders appear when shops mark them ready</p>
          </div>
        ) : (
          Object.entries(slots).map(([slot, slotOrders]) => (
            <section key={slot}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">{slot} Slot</h2>
                <span className="text-xs text-slate-600">· {slotOrders.length} orders</span>
              </div>

              <div className="space-y-3">
                {slotOrders.map(order => (
                  <Link key={order.id} href={`/deliver?orderId=${order.id}`}>
                    <div className="group rounded-2xl border border-white/8 bg-white/4 hover:bg-white/8 hover:border-emerald-500/20 p-4 transition-all duration-200 cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-11 w-11 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                            <Truck className="h-5 w-5 text-purple-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{order.users?.name ?? 'Student'}</p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              From: {order.shops?.shop_name ?? 'Shop'}
                            </p>
                            {order.delivery_address && (
                              <p className="flex items-start gap-1 text-xs text-slate-400 mt-1">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-slate-500" />
                                <span className="truncate">{order.delivery_address}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-emerald-400">₹{Number(order.total_price).toFixed(0)}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{order.total_pages} pgs</p>
                          <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-400 ml-auto mt-1 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
