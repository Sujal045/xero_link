'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { AppShell, AppContainer, PageHeader } from '@/components/layout'
import { fetchShopActiveOrders } from '@/lib/orders/fetchShopOrders'
import { getOrderAgeLabel } from '@/lib/utils/orderAge'
import {
  ToggleLeft, ToggleRight, Clock,
  ShoppingBag, Printer, PackageCheck, Loader2, Store, RefreshCw, UserPlus
} from 'lucide-react'

interface Order {
  id: string
  status: 'pending' | 'printing' | 'ready' | 'out_for_delivery' | 'delivered'| 'rejected'
  total_pages: number
  print_type: 'bw' | 'color'
  sides: 'single' | 'double'
  copies: number
  total_price: number
  created_at: string
  delivery_partner_id: string | null
  users: { name: string } | null
  delivery_partner: { name: string } | null
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

const POLL_INTERVAL_MS = 10 * 60 * 1000

export default function OwnerDashboard() {
  const router = useRouter()
  const [supabase] = useState(createClient)

  const [shop, setShop] = useState<Shop | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
    const { data, error } = await fetchShopActiveOrders(supabase, shopId)
    if (error) {
      setFetchError(error)
      setOrders([])
    } else {
      setFetchError(null)
      setOrders(data as unknown as Order[])
    }
    setLastRefreshed(new Date())
  }, [supabase])

  const startPolling = useCallback((shopId: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      fetchData(shopId)
    }, POLL_INTERVAL_MS)
  }, [fetchData])

  const handleManualRefresh = useCallback(async () => {
    if (!shop) return
    setRefreshing(true)
    await fetchData(shop.id)
    startPolling(shop.id)
    setRefreshing(false)
  }, [shop, fetchData, startPolling])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: shopData } = await supabase
        .from('shops').select('*').eq('owner_id', user.id).maybeSingle()

      if (!shopData) {
        setLoading(false)
        return
      }
      setShop(shopData)
      await fetchData(shopData.id)
      startPolling(shopData.id)

      channel = supabase
        .channel(`owner-orders-${shopData.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `shop_id=eq.${shopData.id}`,
          },
          () => {
            fetchData(shopData.id)
          }
        )
        .subscribe()

      setLoading(false)
    }
    init()

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchData, startPolling, supabase])

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
    if (newStatus === 'ready') {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setFetchError('Your session expired. Please sign in again.')
        return
      }

      const res = await fetch('/api/orders/mark-ready', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId }),
      })

      const result = await res.json()
      if (!res.ok) {
        setFetchError(result.error || 'Failed to mark order ready')
      } else if (result.warning) {
        setFetchError(result.warning)
      } else {
        setFetchError(null)
      }

      if (shop) fetchData(shop.id)
      return
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) {
      setFetchError(error.message)
    }

    if (shop) fetchData(shop.id)
  }

  const assignPartner = async (orderId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setFetchError('Your session expired. Please sign in again.')
      return
    }

    const res = await fetch('/api/orders/assign-partner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ orderId }),
    })

    const result = await res.json()
    if (!res.ok) {
      setFetchError(result.error || 'Failed to assign delivery partner')
    } else {
      setFetchError(null)
    }

    if (shop) fetchData(shop.id)
  }

  const pending  = orders.filter(o => o.status === 'pending').length
  const printing = orders.filter(o => o.status === 'printing').length
  const ready    = orders.filter(o => o.status === 'ready').length
  const todayRevenue = orders.reduce((sum, o) => sum + Number(o.total_price), 0)

  if (loading) {
    return (
      <AppShell className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </AppShell>
    )
  }

  if (!shop) {
    return (
      <AppShell>
        <AppContainer className="py-8 max-w-xl">
          <Card padding="lg" className="shadow-panel">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Store className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Create your first shop</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your owner account is ready. Add your shop details to start receiving orders.
              </p>
            </div>

            <form onSubmit={createShop} className="space-y-4">
              {createError && (
                <div className="rounded-xl border border-red-200 bg-danger-soft p-4 text-sm text-danger">
                  {createError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shop Name</label>
                <Input
                  value={shopForm.shopName}
                  onChange={(e) => updateForm('shopName', e.target.value)}
                  placeholder="Quick Print Hub"
                  required
                  disabled={creatingShop}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">B&W Price</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shopForm.priceBw}
                    onChange={(e) => updateForm('priceBw', e.target.value)}
                    required
                    disabled={creatingShop}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color Price</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shopForm.priceColor}
                    onChange={(e) => updateForm('priceColor', e.target.value)}
                    required
                    disabled={creatingShop}
                  />
                </div>
              </div>

              <Button type="submit" size="lg" disabled={creatingShop} className="w-full">
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
          </Card>
        </AppContainer>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader
        title={shop.shop_name}
        subtitle={
          lastRefreshed
            ? `Owner dashboard · Updated ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Owner dashboard'
        }
        showBack={false}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant={shop.is_open ? 'soft' : 'outline'}
              size="sm"
              onClick={toggleShop}
              disabled={toggling}
              className="gap-2"
            >
              {toggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : shop.is_open ? (
                <ToggleRight className="h-5 w-5" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
              {shop.is_open ? 'Open' : 'Closed'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Pending',  value: pending,  className: 'bg-warning-soft text-warning' },
            { label: 'Printing', value: printing, className: 'bg-accent-soft text-accent' },
            { label: 'Ready',    value: ready,    className: 'bg-[var(--status-ready-soft)] text-[var(--status-ready)]' },
            { label: "Today ₹",  value: `${todayRevenue.toFixed(0)}`, className: 'bg-success-soft text-success' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-2xl px-3 py-3 text-center ${stat.className}`}>
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs opacity-70 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </PageHeader>

      <AppContainer className="py-5 space-y-3 pb-10">
        {fetchError && (
          <div className="rounded-xl border border-red-200 bg-danger-soft p-4 text-sm text-danger">
            Could not load orders: {fetchError}
          </div>
        )}

        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
          Live Queue · {orders.length} active
        </h2>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-surface-muted flex items-center justify-center mb-4">
              <PackageCheck className="h-8 w-8 text-subtle" />
            </div>
            <p className="text-foreground font-semibold">Queue is empty</p>
            <p className="text-muted-foreground text-sm mt-1">New orders will appear here when customers place them</p>
          </div>
        ) : (
          orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={updateStatus}
              onAssignPartner={assignPartner}
            />
          ))
        )}
      </AppContainer>
    </AppShell>
  )
}

function OrderCard({ order, onStatusChange, onAssignPartner }: {
  order: Order
  onStatusChange: (id: string, status: string) => void
  onAssignPartner: (id: string) => Promise<void>
}) {
  const [updating, setUpdating] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [age, setAge] = useState('')

  useEffect(() => {
    const updateAge = () => setAge(getOrderAgeLabel(order.created_at))
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

  const handleAssign = async () => {
    setAssigning(true)
    await onAssignPartner(order.id)
    setAssigning(false)
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-soft flex items-center justify-center shrink-0 text-accent">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{order.users?.name ?? 'User'}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <StatusBadge status={order.status === 'delivered' ? 'delivered' : order.status} />
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {age}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-foreground text-base">₹{Number(order.total_price).toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{order.total_pages} pgs</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          order.print_type === 'bw' ? 'Black & White' : 'Color',
          order.sides === 'double' ? 'Double-sided' : 'Single-sided',
          `${order.copies} ${order.copies > 1 ? 'copies' : 'copy'}`,
          `${order.total_pages} pages`,
        ].map(tag => (
          <span key={tag} className="text-xs bg-surface-muted border border-border rounded-lg px-2.5 py-1 text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href={`/orders/${order.id}`}>
          <Button variant="outline" size="sm">View Doc</Button>
        </Link>

        {order.status === 'pending' && (
          <>
            <Button
              variant="soft"
              className="flex-1"
              onClick={() => handleAction('printing')}
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Printer className="h-4 w-4" /> Start Printing</>}
            </Button>
            <Button variant="danger" size="default" onClick={handleReject} disabled={rejecting}>
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
            </Button>
          </>
        )}

        {order.status === 'printing' && (
          <Button
            variant="soft"
            className="flex-1"
            onClick={() => handleAction('ready')}
            disabled={updating}
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PackageCheck className="h-4 w-4" /> Mark Ready</>}
          </Button>
        )}

        {order.status === 'ready' && (
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl bg-[var(--status-ready-soft)] border border-violet-200 text-[var(--status-ready)]">
              <ShoppingBag className="h-4 w-4" /> Awaiting Delivery
            </div>
            {order.delivery_partner?.name || order.delivery_partner_id ? (
              <p className="text-xs text-center text-muted-foreground">
                Assigned to {order.delivery_partner?.name ?? 'delivery partner'}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-center text-warning">
                  Unassigned — assign a delivery partner so it appears in their queue
                </p>
                <Button
                  variant="soft"
                  className="w-full"
                  onClick={handleAssign}
                  disabled={assigning}
                >
                  {assigning
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><UserPlus className="h-4 w-4" /> Assign Partner</>}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
