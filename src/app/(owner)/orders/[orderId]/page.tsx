'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, FileText, Printer, PackageCheck,
  Loader2, Clock, User, AlertCircle, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrderDetail {
  id: string
  status: string
  total_pages: number
  print_type: string
  sides: string
  copies: number
  total_price: number
  created_at: string
  otp: string
  delivery_slot: string
  users: { name: string; phone: string | null } | null
  documents: { id: string; file_url: string; file_name: string; page_count: number }[]
}

export default function OwnerOrderDetail() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string
  const supabase = createClient()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, users(name, phone), documents(*)')
      .eq('id', orderId)
      .single()
    setOrder(data as OrderDetail)
    setLoading(false)
  }

  useEffect(() => { fetchOrder() }, [orderId])

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    setError(null)
    const { error: err } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        ...(newStatus === 'ready' ? { printed_at: new Date().toISOString() } : {}),
      })
      .eq('id', orderId)

    if (err) { setError(err.message); setUpdating(false); return }
    await fetchOrder()
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-500">Order not found.</p>
      </div>
    )
  }

  const age = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      <header className="sticky top-0 z-10 px-5 pt-6 pb-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white mb-3 transition-colors">
          <ArrowLeft className="h-4 w-4" /> <span className="text-sm">Dashboard</span>
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Order Detail</h1>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
            order.status === 'ready'     ? 'bg-purple-500/15 text-purple-400' :
            order.status === 'printing'  ? 'bg-blue-500/15 text-blue-400' :
            order.status === 'delivered' ? 'bg-emerald-500/15 text-emerald-400' :
            'bg-amber-500/15 text-amber-400'
          }`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
      </header>

      <div className="px-5 py-5 space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* Student Info */}
        <div className="rounded-2xl bg-white/4 border border-white/8 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <User className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-white">{order.users?.name ?? 'Unknown'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{order.users?.phone ?? 'No phone'}</p>
          </div>
          <div className="ml-auto text-right">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" /> {age}m ago
            </span>
            <p className="text-xs text-slate-500 mt-1">Slot: {order.delivery_slot}</p>
          </div>
        </div>

        {/* Print Specs */}
        <div className="rounded-2xl bg-white/4 border border-white/8 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Print Specifications</h2>
          {[
            ['Pages',   order.total_pages],
            ['Type',    order.print_type === 'bw' ? 'Black & White' : 'Color'],
            ['Sides',   order.sides === 'double' ? 'Double-sided' : 'Single-sided'],
            ['Copies',  order.copies],
            ['Amount',  `₹${Number(order.total_price).toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between text-sm">
              <span className="text-slate-500">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* Documents */}
        <div className="rounded-2xl bg-white/4 border border-white/8 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Documents</h2>
          {order.documents.length === 0 ? (
            <p className="text-slate-600 text-sm">No documents attached.</p>
          ) : order.documents.map(doc => (
            <div key={doc.id}>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{doc.file_name}</p>
                  <p className="text-xs text-slate-500">{doc.page_count} pages</p>
                </div>
                <a href={doc.file_url} target="_blank" rel="noreferrer"
                  className="shrink-0 flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              {doc.file_url.endsWith('.pdf') && (
                <div className="mt-3 rounded-xl overflow-hidden border border-white/8 bg-black/30 h-72">
                  <iframe src={doc.file_url} className="w-full h-full" title={doc.file_name} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Action Footer */}
      {(order.status === 'pending' || order.status === 'printing') && (
        <div className="fixed bottom-0 inset-x-0 p-5 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent space-y-3">
          {showRejectInput && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Reason for rejection…"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="flex-1 rounded-xl px-4 py-3 bg-white/6 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-red-500/50"
              />
              <button
                onClick={async () => { await updateStatus('rejected'); setShowRejectInput(false) }}
                className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-all"
              >
                Confirm
              </button>
            </div>
          )}
          <div className="flex gap-3">
            {order.status === 'pending' && (
              <Button onClick={() => updateStatus('printing')} disabled={updating}
                className="flex-1 h-13 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl text-base font-semibold">
                {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Printer className="mr-2 h-5 w-5" />Start Printing</>}
              </Button>
            )}
            {order.status === 'printing' && (
              <Button onClick={() => updateStatus('ready')} disabled={updating}
                className="flex-1 h-13 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-base font-semibold">
                {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><PackageCheck className="mr-2 h-5 w-5" />Mark as Ready</>}
              </Button>
            )}
            {!showRejectInput && (
              <button onClick={() => setShowRejectInput(true)}
                className="px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold hover:bg-red-500/20 transition-all">
                Reject
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
