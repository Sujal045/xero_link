'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { calcWaitMinutes } from '@/lib/utils/waitTime'
import { Clock, Star, ChevronRight, Search, Wifi, WifiOff, Printer } from 'lucide-react'

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
        .select('name, university_id')
        .eq('id', authUser.id)
        .single()

      setUserName(userData?.name ?? '')

      // Fetch shops filtered by university if available
      const query = supabase.from('shops').select('*')
      // if (userData?.university_id) {
      //   query = query.eq('university_id', userData.university_id)
      // }
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

        // Sort: open shops first, then by rating
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
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header */}
      <header className="z-10 px-5 pt-6 pb-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Welcome back</p>
            <h1 className="text-xl font-bold text-white">{userName || 'Student'}</h1>
          </div>
          <Link href="/orders">
            <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 border border-white/10 hover:bg-white/10 transition-colors">
              <Printer className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-white font-medium">My Orders</span>
            </div>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search nearby shops…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm text-white placeholder:text-slate-500 bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
      </header>

      {/* Shop List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Stats row */}
        {!loading && shops.length > 0 && (
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs text-slate-400">{openCount} open</span>
            </div>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-500">{filtered.length} shops nearby</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Printer className="h-14 w-14 text-slate-700 mb-4" />
            <p className="text-slate-300 font-semibold text-lg">No shops found</p>
            <p className="text-slate-500 text-sm mt-1">
              {searchQuery ? 'Try a different search term' : 'No shops near your university yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(shop => {
              const waitMin = calcWaitMinutes(shop.pendingPages ?? 0, shop.avg_print_time_sec)
              return (
                <Link key={shop.id} href={`/order/${shop.id}`}>
                  <div className="group relative rounded-2xl border border-white/8 bg-white/4 hover:bg-white/8 hover:border-blue-500/20 p-4 transition-all duration-200 cursor-pointer active:scale-[0.98]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Icon */}
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${shop.is_open ? 'bg-blue-500/15' : 'bg-slate-800'}`}>
                          {shop.is_open
                            ? <Wifi className="h-5 w-5 text-blue-400" />
                            : <WifiOff className="h-5 w-5 text-slate-600" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white truncate">{shop.shop_name}</h3>
                            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${shop.is_open ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                              {shop.is_open ? 'Open' : 'Closed'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="h-3 w-3 shrink-0" />
                              {waitMin === 0 ? 'No queue' : `~${waitMin} min wait`}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                              {Number(shop.rating).toFixed(1)}
                            </span>
                          </div>

                          {/* Pricing pills */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-white/5 border border-white/8 rounded-lg px-2 py-1 text-slate-400">
                              B&W ₹{shop.price_bw}/pg
                            </span>
                            <span className="text-xs bg-white/5 border border-white/8 rounded-lg px-2 py-1 text-slate-400">
                              Color ₹{shop.price_color}/pg
                            </span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-slate-700 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
