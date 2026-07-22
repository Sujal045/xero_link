'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcPrice } from '@/lib/utils/calcPrice'
import { getPDFPageCount } from '@/lib/utils/getPageCount'
import { AppShell, AppContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  UploadCloud, FileText, Loader2,
  CheckCircle2, AlertCircle,
} from 'lucide-react'

interface Shop {
  id: string
  shop_name: string
  price_bw: number
  price_color: number
  avg_print_time_sec: number
  rating: number
  is_open: boolean
}

type PrintType = 'bw' | 'color'
type Sides = 'single' | 'double'

export default function OrderPage() {
  const router = useRouter()
  const params = useParams()
  const shopId = params.shopId as string
  const supabase = createClient()

  const [shop, setShop] = useState<Shop | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number>(0)
  const [detecting, setDetecting] = useState(false)
  const [printType, setPrintType] = useState<PrintType>('bw')
  const [sides, setSides] = useState<Sides>('single')
  const [copies, setCopies] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')

  useEffect(() => {
    supabase.from('shops').select('*').eq('id', shopId).single()
      .then(({ data }) => setShop(data))
  }, [shopId, supabase])

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setPageCount(0)
    if (f.type === 'application/pdf') {
      setDetecting(true)
      try {
        const count = await getPDFPageCount(f)
        setPageCount(count)
      } catch (err) {
        console.error('PDF detection error:', err)
        setPageCount(1)
      } finally {
        setDetecting(false)
      }
    } else {
      setPageCount(1)
    }
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  const price = shop
    ? calcPrice({ pages: pageCount, copies, printType, sides, priceBW: shop.price_bw, priceColor: shop.price_color })
    : 0

  const handleSubmit = async () => {
    if (!shop || !file || pageCount === 0 || !deliveryAddress.trim()) return
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in')
      setSubmitting(false)
      return
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const hour = new Date().getHours()
    const slot = hour < 10 ? '12:00 PM' : '05:00 PM'

    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      user_id: user.id,
      shop_id: shop.id,
      status: 'pending',
      total_pages: pageCount,
      print_type: printType,
      sides,
      copies,
      total_price: price,
      otp,
      delivery_slot: slot,
      delivery_address: deliveryAddress.trim(),
    }).select().single()

    if (orderErr || !order) {
      setError(orderErr?.message ?? 'Failed to create order')
      setSubmitting(false)
      return
    }

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${order.id}/file.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(path, file, { upsert: true })

    if (uploadErr) {
      setError('Order created but file upload failed: ' + uploadErr.message)
      setSubmitting(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    await supabase.from('documents').insert({
      order_id: order.id,
      file_url: publicUrl,
      file_name: file.name,
      page_count: pageCount,
      file_size_kb: Math.round(file.size / 1024),
    })

    router.push('/orders')
  }

  if (!shop) {
    return (
      <AppShell className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader
        title={shop.shop_name}
        subtitle={`★ ${shop.rating} · place your print order`}
        fallbackHref="/shops"
        actions={
          <Badge variant={shop.is_open ? 'success' : 'muted'}>
            {shop.is_open ? 'Open' : 'Closed'}
          </Badge>
        }
      />

      <AppContainer className="py-6 space-y-5 max-w-2xl pb-32">
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upload Document</h2>
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => document.getElementById('file-input')?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
              dragOver
                ? 'border-accent bg-accent-soft'
                : file
                ? 'border-accent-border bg-accent-soft/50'
                : 'border-border bg-surface hover:border-border-strong hover:bg-surface-muted'
            }`}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-8 w-8 text-accent" />
                  {detecting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-foreground font-medium truncate max-w-xs mx-auto">{file.name}</p>
                <p className="text-sm text-accent">
                  {detecting ? 'Detecting pages…' : `${pageCount} page${pageCount !== 1 ? 's' : ''} detected`}
                </p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · Tap to change</p>
              </div>
            ) : (
              <div className="space-y-3">
                <UploadCloud className="h-10 w-10 text-subtle mx-auto" />
                <div>
                  <p className="text-foreground font-medium">Drop your file here</p>
                  <p className="text-muted-foreground text-sm mt-1">PDF, DOCX, JPG, PNG · Max 50MB</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Print Options</h2>
          <div className="space-y-3">
            <Card>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Print Type</p>
              <div className="grid grid-cols-2 gap-2">
                {(['bw', 'color'] as PrintType[]).map(pt => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setPrintType(pt)}
                    className={`rounded-xl py-3 text-sm font-semibold transition-all ${
                      printType === pt
                        ? 'bg-accent text-white shadow-soft'
                        : 'bg-surface-muted text-muted-foreground hover:bg-border'
                    }`}
                  >
                    {pt === 'bw' ? `B&W · ₹${shop.price_bw}/pg` : `Color · ₹${shop.price_color}/pg`}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Sides</p>
              <div className="grid grid-cols-2 gap-2">
                {(['single', 'double'] as Sides[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSides(s)}
                    className={`rounded-xl py-3 text-sm font-semibold capitalize transition-all ${
                      sides === s
                        ? 'bg-accent text-white shadow-soft'
                        : 'bg-surface-muted text-muted-foreground hover:bg-border'
                    }`}
                  >
                    {s === 'double' ? 'Double-sided (−10%)' : 'Single-sided'}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Copies</p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setCopies(c => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-full bg-surface-muted hover:bg-border text-foreground text-lg font-bold flex items-center justify-center transition-all"
                  >
                    −
                  </button>
                  <span className="font-bold text-foreground text-lg w-6 text-center">{copies}</span>
                  <button
                    type="button"
                    onClick={() => setCopies(c => Math.min(10, c + 1))}
                    className="w-8 h-8 rounded-full bg-surface-muted hover:bg-border text-foreground text-lg font-bold flex items-center justify-center transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Delivery Address</h2>
          <Card>
            <textarea
              rows={3}
              placeholder="Enter your full delivery address (house no., street, area, city…)"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              className="w-full bg-transparent text-foreground placeholder:text-subtle text-sm resize-none focus:outline-none"
            />
          </Card>
        </div>

        {file && pageCount > 0 && (
          <Card className="border-accent-border bg-accent-soft/40">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Price Breakdown</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{pageCount} pages × ₹{printType === 'bw' ? shop.price_bw : shop.price_color} × {copies} {copies > 1 ? 'copies' : 'copy'}</span>
                <span>₹{(pageCount * (printType === 'bw' ? shop.price_bw : shop.price_color) * copies).toFixed(2)}</span>
              </div>
              {sides === 'double' && (
                <div className="flex justify-between text-accent">
                  <span>Double-sided discount (−10%)</span>
                  <span>−₹{(pageCount * (printType === 'bw' ? shop.price_bw : shop.price_color) * copies * 0.1).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Platform fee</span>
                <span>₹2.00</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground text-base">
                <span>Total (Cash on Delivery)</span>
                <span className="text-accent">₹{price.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-danger-soft p-4 text-sm text-danger">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </AppContainer>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur-xl">
        <AppContainer className="py-4 max-w-2xl">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!file || pageCount === 0 || detecting || submitting || !shop.is_open || !deliveryAddress.trim()}
            className="w-full h-14 text-base rounded-2xl shadow-elevated disabled:opacity-40"
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Placing Order…</>
            ) : !shop.is_open ? (
              'Shop is Closed'
            ) : !file ? (
              'Upload a Document First'
            ) : pageCount === 0 || detecting ? (
              'Detecting Pages…'
            ) : (
              <><CheckCircle2 className="mr-2 h-5 w-5" /> Confirm Order · ₹{price.toFixed(2)}</>
            )}
          </Button>
        </AppContainer>
      </div>
    </AppShell>
  )
}
