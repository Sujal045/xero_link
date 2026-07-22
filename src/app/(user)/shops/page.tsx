'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcWaitMinutes } from '@/lib/utils/waitTime'
import { hasCoordinates } from '@/lib/maps/coordinates'
import { AppShell, AppContainer, PageHeader } from '@/components/layout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Star, ChevronRight, Search, Wifi, WifiOff, Printer, Package,
  MapPin, Loader2, List, Map as MapIcon,
} from 'lucide-react'

const ShopsMap = dynamic(() => import('@/components/map/ShopsMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading map…
    </div>
  ),
})

interface Shop {
  id: string
  shop_name: string
  lat: number | null
  lng: number | null
  address?: string | null
  is_open: boolean
  price_bw: number
  price_color: number
  avg_print_time_sec: number
  rating: number
  pendingPages?: number
}

export default function ShopsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [userName, setUserName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map')

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setLoading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', authUser.id)
        .single()

      setUserName(userData?.name ?? '')

      const { data: shopsData } = await supabase.from('shops').select('*')

      if (shopsData && shopsData.length > 0) {
        const shopIds = shopsData.map((s: Shop) => s.id)
        const { data: snapshots } = await supabase
          .from('queue_snapshots')
          .select('shop_id, pending_pages')
          .in('shop_id', shopIds)
          .order('recorded_at', { ascending: false })

        const snapshotMap: Record<string, number> = {}
        snapshots?.forEach((s: { shop_id: string; pending_pages: number }) => {
          if (!snapshotMap[s.shop_id]) snapshotMap[s.shop_id] = s.pending_pages
        })

        const enriched = shopsData.map((shop: Shop) => ({
          ...shop,
          pendingPages: snapshotMap[shop.id] || 0,
        })).sort((a: Shop, b: Shop) => {
          if (a.is_open !== b.is_open) return a.is_open ? -1 : 1
          return b.rating - a.rating
        })

        setShops(enriched)
      }
      setLoading(false)
    }
    init()
  }, [supabase])

  const filtered = useMemo(
    () =>
      shops.filter((s) =>
        s.shop_name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [shops, searchQuery]
  )

  const mappableShops = useMemo(
    () =>
      filtered
        .filter((s) => hasCoordinates(s.lat, s.lng))
        .map((s) => ({
          id: s.id,
          shop_name: s.shop_name,
          lat: Number(s.lat),
          lng: Number(s.lng),
          is_open: s.is_open,
        })),
    [filtered]
  )

  const selectedShop = selectedId
    ? filtered.find((s) => s.id === selectedId) ?? null
    : null

  useEffect(() => {
    if (selectedId && !filtered.some((s) => s.id === selectedId)) {
      setSelectedId(null)
    }
  }, [filtered, selectedId])

  const openCount = filtered.filter((s) => s.is_open).length

  const handleMarkerClick = (shopId: string) => {
    setSelectedId(shopId)
    setMobileView('map')
  }

  const handleListSelect = (shopId: string) => {
    setSelectedId(shopId)
  }

  return (
    <AppShell className="flex flex-col">
      <PageHeader
        title={userName || 'Browse Shops'}
        subtitle="Welcome back — pick a shop on the map or from the list"
        fallbackHref="/"
        actions={
          <Link href="/orders">
            <Button variant="outline" size="sm" className="gap-2">
              <Package className="h-4 w-4 text-accent" />
              My Orders
            </Button>
          </Link>
        }
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
            <Input
              type="search"
              placeholder="Search shops…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex shrink-0 rounded-xl border border-border bg-surface p-0.5 sm:hidden">
            <Button
              type="button"
              variant={mobileView === 'map' ? 'soft' : 'ghost'}
              size="sm"
              className="px-2.5"
              onClick={() => setMobileView('map')}
              aria-label="Map view"
            >
              <MapIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={mobileView === 'list' ? 'soft' : 'ghost'}
              size="sm"
              className="px-2.5"
              onClick={() => setMobileView('list')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PageHeader>

      <AppContainer className="flex-1 py-5 pb-10">
        {!loading && shops.length > 0 && (
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground">{openCount} open</span>
            </div>
            <span className="text-border-strong">·</span>
            <span className="text-xs text-muted-foreground">
              {mappableShops.length} on map
              {filtered.length !== mappableShops.length
                ? ` · ${filtered.length - mappableShops.length} without pin`
                : ''}
            </span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="h-64 rounded-2xl bg-surface-muted animate-pulse" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-surface-muted flex items-center justify-center mb-4">
              <Printer className="h-8 w-8 text-subtle" />
            </div>
            <p className="text-foreground font-semibold text-lg">No shops found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {searchQuery ? 'Try a different search term' : 'No shops near you yet'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div
              className={`space-y-3 ${
                mobileView === 'list' ? 'hidden sm:block' : 'block'
              }`}
            >
              <div className="overflow-hidden rounded-2xl border border-border h-64 sm:h-80 shadow-soft relative">
                {mappableShops.length > 0 ? (
                  <ShopsMap
                    shops={mappableShops}
                    selectedId={selectedId}
                    onShopClick={handleMarkerClick}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center bg-surface-muted">
                    <MapPin className="h-8 w-8 text-subtle" />
                    <p className="text-sm font-medium text-foreground">No pinned shops yet</p>
                    <p className="text-xs text-muted-foreground">
                      Shops appear here after the owner pins a location when creating the shop.
                    </p>
                  </div>
                )}
              </div>

              {selectedShop && (
                <Card padding="md" className="border-accent-border bg-accent-soft/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">
                          {selectedShop.shop_name}
                        </h3>
                        <Badge variant={selectedShop.is_open ? 'success' : 'muted'}>
                          {selectedShop.is_open ? 'Open' : 'Closed'}
                        </Badge>
                      </div>
                      {selectedShop.address && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {selectedShop.address}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-surface border border-border rounded-lg px-2 py-1 text-muted-foreground">
                          B&W ₹{selectedShop.price_bw}/pg
                        </span>
                        <span className="text-xs bg-surface border border-border rounded-lg px-2 py-1 text-muted-foreground">
                          Color ₹{selectedShop.price_color}/pg
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-3"
                    onClick={() => router.push(`/order/${selectedShop.id}`)}
                  >
                    Order from this shop
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Card>
              )}
            </div>

            <div
              className={`space-y-3 ${
                mobileView === 'map' ? 'hidden sm:block' : 'block'
              }`}
            >
              {filtered.map((shop) => {
                void calcWaitMinutes(shop.pendingPages ?? 0, shop.avg_print_time_sec)
                const selected = shop.id === selectedId
                const onMap = hasCoordinates(shop.lat, shop.lng)

                return (
                  <Card
                    key={shop.id}
                    interactive
                    className={`group mb-0 ${
                      selected ? 'ring-2 ring-accent border-accent-border' : ''
                    }`}
                    onClick={() => {
                      handleListSelect(shop.id)
                      if (onMap) setMobileView('map')
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            shop.is_open
                              ? 'bg-accent-soft text-accent'
                              : 'bg-surface-muted text-subtle'
                          }`}
                        >
                          {shop.is_open ? (
                            <Wifi className="h-5 w-5" />
                          ) : (
                            <WifiOff className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">
                              {shop.shop_name}
                            </h3>
                            <Badge variant={shop.is_open ? 'success' : 'muted'}>
                              {shop.is_open ? 'Open' : 'Closed'}
                            </Badge>
                            {!onMap && (
                              <Badge variant="warning">No map pin</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                              {Number(shop.rating).toFixed(1)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-surface-muted border border-border rounded-lg px-2 py-1 text-muted-foreground">
                              B&W ₹{shop.price_bw}/pg
                            </span>
                            <span className="text-xs bg-surface-muted border border-border rounded-lg px-2 py-1 text-muted-foreground">
                              Color ₹{shop.price_color}/pg
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/order/${shop.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 ml-2"
                        aria-label={`Order from ${shop.shop_name}`}
                      >
                        <ChevronRight className="h-5 w-5 text-subtle group-hover:text-accent transition-colors" />
                      </Link>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </AppContainer>
    </AppShell>
  )
}
