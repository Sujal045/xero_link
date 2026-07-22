'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { calcWaitMinutes } from '@/lib/utils/waitTime'
import { AppShell, AppContainer, PageHeader } from '@/components/layout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Star, ChevronRight, Search, Wifi, WifiOff, Printer, Package,
} from 'lucide-react'

interface Shop {
  id: string
  shop_name: string
  lat: number
  lng: number
  is_open: boolean
  price_bw: number
  price_color: number
  avg_print_time_sec: number
  rating: number
  pendingPages?: number
}

export default function ShopsPage() {
  const supabase = createClient()

  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [userName, setUserName] = useState('')

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

      const query = supabase.from('shops').select('*')
      const { data: shopsData } = await query

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

  const filtered = shops.filter(s =>
    s.shop_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openCount = filtered.filter(s => s.is_open).length

  return (
    <AppShell className="flex flex-col">
      <PageHeader
        title={userName || 'Browse Shops'}
        subtitle="Welcome back — find a print shop nearby"
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
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
          <Input
            type="search"
            placeholder="Search nearby shops…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
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
            <span className="text-xs text-muted-foreground">{filtered.length} shops nearby</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
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
          <div className="space-y-3">
            {filtered.map(shop => {
              // Keep wait helper wired for future ETA UI
              void calcWaitMinutes(shop.pendingPages ?? 0, shop.avg_print_time_sec)
              return (
                <Link key={shop.id} href={`/order/${shop.id}`}>
                  <Card interactive className="group mb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            shop.is_open ? 'bg-accent-soft text-accent' : 'bg-surface-muted text-subtle'
                          }`}
                        >
                          {shop.is_open
                            ? <Wifi className="h-5 w-5" />
                            : <WifiOff className="h-5 w-5" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">{shop.shop_name}</h3>
                            <Badge variant={shop.is_open ? 'success' : 'muted'}>
                              {shop.is_open ? 'Open' : 'Closed'}
                            </Badge>
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

                      <ChevronRight className="h-5 w-5 text-subtle group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </AppContainer>
    </AppShell>
  )
}
