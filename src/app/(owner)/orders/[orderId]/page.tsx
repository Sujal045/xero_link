'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  FileText, Printer, PackageCheck,
  Loader2, Clock, User, AlertCircle, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge, type OrderStatus } from '@/components/ui/badge'
import { isOrderStatus } from '@/types/order'
import { getOrderAgeLabel } from '@/lib/utils/orderAge'
import { AppShell, AppContainer, PageHeader } from '@/components/layout'

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
  delivery_partner_id: string | null
  users: { name: string; phone: string | null } | null
  delivery_partner: { name: string } | null
  documents: { id: string; file_url: string; file_name: string; page_count: number }[]
}

export default function OwnerOrderDetail() {
  const params = useParams()
  const orderId = params.orderId as string
  const [supabase] = useState(createClient)

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    const withPartner = await supabase
      .from('orders')
      .select('*, users!user_id(name, phone), delivery_partner:users!delivery_partner_id(name), documents(*)')
      .eq('id', orderId)
      .single()

    if (!withPartner.error && withPartner.data) {
      setOrder(withPartner.data as OrderDetail)
      setLoading(false)
      return
    }

    const fallback = await supabase
      .from('orders')
      .select('*, users!user_id(name, phone), documents(*)')
      .eq('id', orderId)
      .single()

    setOrder(
      fallback.data
        ? ({ ...fallback.data, delivery_partner: null } as OrderDetail)
        : null
    )
    setLoading(false)
  }, [orderId, supabase])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchOrder()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchOrder])

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    setError(null)

    if (newStatus === 'ready') {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Your session has expired. Please sign in again.')
        setUpdating(false)
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
        setError(result.error || 'Failed to mark order ready')
        setUpdating(false)
        return
      }

      await fetchOrder()
      setUpdating(false)
      return
    }

    const { error: err } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (err) { setError(err.message); setUpdating(false); return }
    await fetchOrder()
    setUpdating(false)
  }

  if (loading) {
    return (
      <AppShell className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </AppShell>
    )
  }

  if (!order) {
    return (
      <AppShell className="flex items-center justify-center">
        <p className="text-muted-foreground">Order not found.</p>
      </AppShell>
    )
  }

  const status: OrderStatus = isOrderStatus(order.status) ? order.status : 'pending'
  const ageLabel = getOrderAgeLabel(order.created_at)

  return (
    <AppShell className="pb-40">
      <PageHeader
        title="Order Detail"
        subtitle={ageLabel}
        fallbackHref="/dashboard"
        actions={<StatusBadge status={status} />}
      />

      <AppContainer className="py-5 space-y-4 max-w-5xl pb-10">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-danger-soft p-4 text-sm text-danger">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0 text-accent">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{order.users?.name ?? 'Unknown'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{order.users?.phone ?? 'No phone'}</p>
          </div>
          <div className="ml-auto text-right">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {ageLabel}
            </span>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Print Specifications</h2>
          {[
            ['Pages',   order.total_pages],
            ['Type',    order.print_type === 'bw' ? 'Black & White' : 'Color'],
            ['Sides',   order.sides === 'double' ? 'Double-sided' : 'Single-sided'],
            ['Copies',  order.copies],
            ['Amount',  `₹${Number(order.total_price).toFixed(2)}`],
            [
              'Delivery partner',
              order.delivery_partner?.name
                ?? (order.status === 'ready' || order.status === 'out_for_delivery'
                  ? 'Unassigned'
                  : '—'),
            ],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground font-medium">{value}</span>
            </div>
          ))}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</h2>
          {order.documents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No documents attached.</p>
          ) : order.documents.map(doc => (
            <div key={doc.id}>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">{doc.page_count} pages</p>
                </div>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              {doc.file_url.endsWith('.pdf') && (
                <div className="mt-3 h-[70vh] min-h-[34rem] overflow-hidden rounded-xl border border-border bg-surface-muted">
                  <iframe src={doc.file_url} className="w-full h-full" title={doc.file_name} />
                </div>
              )}
            </div>
          ))}
        </Card>
      </AppContainer>

      {(order.status === 'pending' || order.status === 'printing') && (
        <div className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur-xl">
          <AppContainer className="space-y-3 py-4 max-w-5xl">
            {showRejectInput && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Reason for rejection…"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="flex-1 rounded-xl px-4 py-3 bg-surface border border-border text-foreground text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-accent"
                />
                <Button
                  variant="danger"
                  onClick={async () => { await updateStatus('rejected'); setShowRejectInput(false) }}
                >
                  Confirm
                </Button>
              </div>
            )}
            <div className="flex gap-3">
              {order.status === 'pending' && (
                <Button
                  onClick={() => updateStatus('printing')}
                  disabled={updating}
                  className="flex-1 h-12 rounded-2xl text-base"
                >
                  {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Printer className="mr-2 h-5 w-5" />Start Printing</>}
                </Button>
              )}
              {order.status === 'printing' && (
                <Button
                  onClick={() => updateStatus('ready')}
                  disabled={updating}
                  className="flex-1 h-12 rounded-2xl text-base"
                >
                  {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><PackageCheck className="mr-2 h-5 w-5" />Mark as Ready</>}
                </Button>
              )}
              {!showRejectInput && (
                <Button variant="outline" onClick={() => setShowRejectInput(true)} className="text-danger border-red-200 hover:bg-danger-soft">
                  Reject
                </Button>
              )}
            </div>
          </AppContainer>
        </div>
      )}
    </AppShell>
  )
}
