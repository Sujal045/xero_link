'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  ToggleLeft, ToggleRight, Clock,
  ShoppingBag, Printer, PackageCheck, Loader2, Bell, Store
} from 'lucide-react'

interface Order {
  id: string
  status: 'pending' | 'printing' | 'ready' | 'delivered'
  total_pages: number
  print_type: 'bw' | 'color'
  sides: 'single' | 'double'
  copies: number
  total_price: number
  created_at: string
  users: { name: string } | null
}

interface Shop {
  id: string
  shop_name: string
  is_open: boolean
  price_bw: number
  price_color: number
}

interface ShopFormState {
  shopName: string
  lat: string
  lng: string
  priceBw: string
  priceColor: string
}

export default function OwnerDashboard() {
  const router = useRouter()
  const [supabase] = useState(createClient)

  const [shop, setShop] = useState<Shop | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [creatingShop, setCreatingShop] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [shopForm, setShopForm] = useState<ShopFormState>({
    shopName: '',
    lat: '',
    lng: '',
    priceBw: '1',
    priceColor: '5',
  })

  const fetchData = useCallback(async (shopId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*, users(name)')
      .eq('shop_id', shopId)
      .neq('status', 'delivered')
      .order('created_at', { ascending: true })
    setOrders((data as Order[]) || [])
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Check role
      const { data: userData } = await supabase
        .from('users').select('role').eq('id', user.id).maybeSingle()
      if (userData?.role !== 'owner') { router.push('/shops'); return }

      // Get shop owned by this user
      const { data: shopData } = await supabase
        .from('shops').select('*').eq('owner_id', user.id).maybeSingle()

      if (!shopData) {
        setLoading(false)
        return
      }
      setShop(shopData)
      await fetchData(shopData.id)
      setLoading(false)

      // Realtime subscription for new orders
      const channel = supabase.channel('owner-orders')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'orders',
          filter: `shop_id=eq.${shopData.id}`
        }, () => {
          fetchData(shopData.id)
          setNewOrderAlert(true)
          setTimeout(() => setNewOrderAlert(false), 5000)
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'orders',
          filter: `shop_id=eq.${shopData.id}`
        }, () => { fetchData(shopData.id) })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [fetchData, router, supabase])

  const toggleShop = async () => {
    if (!shop) return
    setToggling(true)
    const { data } = await supabase
      .from('shops')
      .update({ is_open: !shop.is_open })
      .eq('id', shop.id)
      .select()
      .single()
    if (data) setShop(data)
    setToggling(false)
  }

  const updateForm = (field: keyof ShopFormState, value: string) => {
    setShopForm(current => ({ ...current, [field]: value }))
  }

  const createShop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreatingShop(true)
    setCreateError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setCreatingShop(false)
      router.push('/login')
      return
    }

    const response = await fetch('/api/shops/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        shop_name: shopForm.shopName,
        lat: Number(shopForm.lat),
        lng: Number(shopForm.lng),
        price_bw: Number(shopForm.priceBw),
        price_color: Number(shopForm.priceColor),
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setCreateError(result.error || 'Failed to create shop.')
      setCreatingShop(false)
      return
    }

    setShop(result.shop)
    setOrders([])
    setCreatingShop(false)
  }

  const updateStatus = async (orderId: string, newStatus: string) => {
    await supabase
      .from('orders')
      .update({
        status: newStatus,
        ...(newStatus === 'ready' ? { printed_at: new Date().toISOString() } : {})
      })
      .eq('id', orderId)
    if (shop) fetchData(shop.id)
  }

  // Stats
  const pending  = orders.filter(o => o.status === 'pending').length
  const printing = orders.filter(o => o.status === 'printing').length
  const ready    = orders.filter(o => o.status === 'ready').length
  const todayRevenue = orders.reduce((sum, o) => sum + Number(o.total_price), 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-slate-950 px-5 py-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15">
              <Store className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Create your first shop</h2>
            <p className="mt-2 text-sm text-slate-400">
              Your owner account is ready. Add your shop details to start receiving orders.
            </p>
          </div>

          <form onSubmit={createShop} className="space-y-4">
            {createError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {createError}
              </div>
            )}

            <div className="space-y-1">
              <label className="ml-1 text-xs font-medium uppercase tracking-wider text-slate-300">Shop Name</label>
              <Input
                value={shopForm.shopName}
                onChange={(e) => updateForm('shopName', e.target.value)}
                placeholder="Campus Print Hub"
                required
                disabled={creatingShop}
                className="bg-black/20 text-white placeholder:text-slate-500 border-white/10 focus-visible:border-emerald-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="ml-1 text-xs font-medium uppercase tracking-wider text-slate-300">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  value={shopForm.lat}
                  onChange={(e) => updateForm('lat', e.target.value)}
                  placeholder="23.2156"
                  required
                  disabled={creatingShop}
                  className="bg-black/20 text-white placeholder:text-slate-500 border-white/10 focus-visible:border-emerald-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="ml-1 text-xs font-medium uppercase tracking-wider text-slate-300">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  value={shopForm.lng}
                  onChange={(e) => updateForm('lng', e.target.value)}
                  placeholder="72.6369"
                  required
                  disabled={creatingShop}
                  className="bg-black/20 text-white placeholder:text-slate-500 border-white/10 focus-visible:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="ml-1 text-xs font-medium uppercase tracking-wider text-slate-300">B&W Price</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shopForm.priceBw}
                  onChange={(e) => updateForm('priceBw', e.target.value)}
                  required
                  disabled={creatingShop}
                  className="bg-black/20 text-white placeholder:text-slate-500 border-white/10 focus-visible:border-emerald-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="ml-1 text-xs font-medium uppercase tracking-wider text-slate-300">Color Price</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shopForm.priceColor}
                  onChange={(e) => updateForm('priceColor', e.target.value)}
                  required
                  disabled={creatingShop}
                  className="bg-black/20 text-white placeholder:text-slate-500 border-white/10 focus-visible:border-emerald-500/50"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={creatingShop}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500"
            >
              {creatingShop ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Shop...
                </>
              ) : (
                'Create Shop'
              )}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* New Order Alert Banner */}
      {newOrderAlert && (
        <div className="fixed top-4 inset-x-4 z-50 flex items-center gap-3 rounded-2xl bg-emerald-500 px-5 py-4 shadow-2xl shadow-emerald-500/30 animate-in slide-in-from-top duration-300">
          <Bell className="h-5 w-5 text-white shrink-0" />
          <p className="text-white font-semibold text-sm">New order received!</p>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 px-5 pt-6 pb-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Owner Dashboard</p>
            <h1 className="text-xl font-bold text-white mt-0.5">{shop.shop_name}</h1>
          </div>

          {/* Open/Close Toggle */}
          <button
            onClick={toggleShop}
            disabled={toggling}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border font-semibold text-sm transition-all duration-300 ${
              shop.is_open
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : shop.is_open ? (
              <ToggleRight className="h-5 w-5" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
            {shop.is_open ? 'Open' : 'Closed'}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'Pending',  value: pending,  color: 'text-amber-400',  bg: 'bg-amber-500/10' },
            { label: 'Printing', value: printing, color: 'text-blue-400',   bg: 'bg-blue-500/10' },
            { label: 'Ready',    value: ready,    color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: "Today ₹",  value: `${todayRevenue.toFixed(0)}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-2xl ${stat.bg} px-3 py-3 text-center`}>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Order Queue */}
      <div className="px-4 py-5 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-1">
          Live Queue · {orders.length} active
        </h2>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageCheck className="h-14 w-14 text-slate-700 mb-4" />
            <p className="text-slate-400 font-semibold">Queue is empty</p>
            <p className="text-slate-600 text-sm mt-1">New orders will appear here in real-time</p>
          </div>
        ) : (
          orders.map(order => <OrderCard key={order.id} order={order} onStatusChange={updateStatus} />)
        )}
      </div>
    </div>
  )
}

function getOrderAge(createdAt: string) {
  const created = new Date(createdAt.endsWith("Z") ? createdAt : createdAt + "Z")

  const diffMs = Date.now() - created.getTime()

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? "s" : ""}`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} hr${hours !== 1 ? "s" : ""}`
  }

  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? "s" : ""}`
}

function OrderCard({ order, onStatusChange }: {
  order: Order
  onStatusChange: (id: string, status: string) => void
}) {
  const [updating, setUpdating] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [age, setAge] = useState("")

  useEffect(() => {
    const updateAge = () => setAge(getOrderAge(order.created_at))
    updateAge()

    const intervalId = window.setInterval(updateAge, 60000)
    return () => window.clearInterval(intervalId)
  }, [order.created_at])

  const handleAction = async (newStatus: string) => {
    setUpdating(true)
    await onStatusChange(order.id, newStatus)
    setUpdating(false)
  }

  const handleReject = async () => {
    setRejecting(true)
    await onStatusChange(order.id, 'rejected')
    setRejecting(false)
  }

  const statusColors: Record<string, string> = {
    pending:  'bg-amber-500/15 text-amber-400',
    printing: 'bg-blue-500/15 text-blue-400',
    ready:    'bg-purple-500/15 text-purple-400',
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-4 space-y-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/6 flex items-center justify-center shrink-0">
            <Printer className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-white">{order.users?.name ?? 'Student'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[order.status] ?? 'bg-slate-700 text-slate-400'}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" /> {age}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-white text-base">₹{Number(order.total_price).toFixed(0)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{order.total_pages} pgs</p>
        </div>
      </div>

      {/* Print specs */}
      <div className="flex flex-wrap gap-2">
        {[
          order.print_type === 'bw' ? 'Black & White' : 'Color',
          order.sides === 'double' ? 'Double-sided' : 'Single-sided',
          `${order.copies} ${order.copies > 1 ? 'copies' : 'copy'}`,
          `${order.total_pages} pages`,
        ].map(tag => (
          <span key={tag} className="text-xs bg-white/6 border border-white/8 rounded-lg px-2.5 py-1 text-slate-400">{tag}</span>
        ))}
      </div>

      {/* Action buttons + View Docs link */}
      <div className="flex gap-2 flex-wrap">
        <Link href={`/orders/${order.id}`}
          className="text-xs px-3 py-2 rounded-xl bg-white/6 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
          View Doc
        </Link>

        {order.status === 'pending' && (
          <>
            <button
              onClick={() => handleAction('printing')}
              disabled={updating}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-400 hover:bg-blue-500/25 transition-all disabled:opacity-50"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Printer className="h-4 w-4" /> Start Printing</>}
            </button>
            <button
              onClick={handleReject}
              disabled={rejecting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
            </button>
          </>
        )}

        {order.status === 'printing' && (
          <button
            onClick={() => handleAction('ready')}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all disabled:opacity-50"
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PackageCheck className="h-4 w-4" /> Mark Ready</>}
          </button>
        )}

        {order.status === 'ready' && (
          <div className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <ShoppingBag className="h-4 w-4" /> Awaiting Delivery
          </div>
        )}
      </div>
    </div>
  )
}
