'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcPrice } from '@/lib/utils/calcPrice'
import { getPDFPageCount } from '@/lib/utils/getPageCount'
import { Button } from '@/components/ui/button'
import {
  UploadCloud, FileText, Loader2, ArrowLeft,
  CheckCircle2, Star, Clock, AlertCircle
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
  }, [shopId])

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setPageCount(0)
    if (f.type === 'application/pdf') {
      setDetecting(true)
      try {
        const count = await getPDFPageCount(f)
        setPageCount(count)
      } catch (err) {
        console.error("PDF detection error:", err)
        setPageCount(1)
      } finally {
        setDetecting(false)
      }
    } else {
      setPageCount(1) // for images/docx
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
    if (!file || !shop || pageCount === 0 || !deliveryAddress.trim()) return
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Determine delivery slot (basic logic: noon or 5pm)
    const now = new Date()
    const cutoffNoon = new Date(); cutoffNoon.setHours(10, 0, 0, 0)
    const slot = now < cutoffNoon ? '12:00 PM' : '05:00 PM'

    // 1. Create order
    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      user_id: user.id,
      shop_id: shopId,
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

    // 2. Upload file to Supabase Storage
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

    // 3. Save document record
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 border-b border-white/5 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-10">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{shop.shop_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {shop.rating}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shop.is_open ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-700 text-slate-500'}`}>
                {shop.is_open ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-5 py-6 space-y-5 max-w-2xl mx-auto pb-32">
        {/* File Upload */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Upload Document</h2>
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => document.getElementById('file-input')?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
              dragOver
                ? 'border-blue-400/60 bg-blue-500/10'
                : file
                ? 'border-blue-500/40 bg-blue-500/5'
                : 'border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/6'
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
                  <FileText className="h-8 w-8 text-blue-400" />
                  {detecting && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                </div>
                <p className="text-white font-medium truncate max-w-xs mx-auto">{file.name}</p>
                <p className="text-sm text-blue-400">
                  {detecting ? 'Detecting pages…' : `${pageCount} page${pageCount !== 1 ? 's' : ''} detected`}
                </p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB · Tap to change</p>
              </div>
            ) : (
              <div className="space-y-3">
                <UploadCloud className="h-10 w-10 text-slate-500 mx-auto" />
                <div>
                  <p className="text-slate-300 font-medium">Drop your file here</p>
                  <p className="text-slate-500 text-sm mt-1">PDF, DOCX, JPG, PNG · Max 50MB</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Print Options */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Print Options</h2>
          <div className="space-y-3">
            {/* Color */}
            <div className="rounded-2xl bg-white/4 border border-white/8 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Print Type</p>
              <div className="grid grid-cols-2 gap-2">
                {(['bw', 'color'] as PrintType[]).map(pt => (
                  <button key={pt} onClick={() => setPrintType(pt)}
                    className={`rounded-xl py-3 text-sm font-semibold transition-all ${printType === pt ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                    {pt === 'bw' ? `B&W · ₹${shop.price_bw}/pg` : `Color · ₹${shop.price_color}/pg`}
                  </button>
                ))}
              </div>
            </div>

            {/* Sides */}
            <div className="rounded-2xl bg-white/4 border border-white/8 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Sides</p>
              <div className="grid grid-cols-2 gap-2">
                {(['single', 'double'] as Sides[]).map(s => (
                  <button key={s} onClick={() => setSides(s)}
                    className={`rounded-xl py-3 text-sm font-semibold capitalize transition-all ${sides === s ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                    {s === 'double' ? 'Double-sided (−10%)' : 'Single-sided'}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies */}
            <div className="rounded-2xl bg-white/4 border border-white/8 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Copies</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => setCopies(c => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/16 text-white text-lg font-bold flex items-center justify-center transition-all">−</button>
                  <span className="font-bold text-white text-lg w-6 text-center">{copies}</span>
                  <button onClick={() => setCopies(c => Math.min(10, c + 1))}
                    className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/16 text-white text-lg font-bold flex items-center justify-center transition-all">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Delivery Address</h2>
          <div className="rounded-2xl bg-white/4 border border-white/8 p-4">
            <textarea
              rows={3}
              placeholder="Enter your full delivery address (house no., street, area, city…)"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              className="w-full bg-transparent text-white placeholder:text-slate-500 text-sm resize-none focus:outline-none"
            />
          </div>
        </div>

        {/* Price Breakdown */}
        {file && pageCount > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-blue-900/30 to-slate-900/50 border border-blue-500/20 p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Price Breakdown</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>{pageCount} pages × ₹{printType === 'bw' ? shop.price_bw : shop.price_color} × {copies} {copies > 1 ? 'copies' : 'copy'}</span>
                <span>₹{(pageCount * (printType === 'bw' ? shop.price_bw : shop.price_color) * copies).toFixed(2)}</span>
              </div>
              {sides === 'double' && (
                <div className="flex justify-between text-blue-400">
                  <span>Double-sided discount (−10%)</span>
                  <span>−₹{(pageCount * (printType === 'bw' ? shop.price_bw : shop.price_color) * copies * 0.1).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Platform fee</span>
                <span>₹2.00</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-white text-base">
                <span>Total (Cash on Delivery)</span>
                <span className="text-blue-400">₹{price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Sticky Footer CTA */}
      <div className="fixed bottom-0 inset-x-0 p-5 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
        <Button
          onClick={handleSubmit}
          disabled={!file || pageCount === 0 || detecting || submitting || !shop.is_open || !deliveryAddress.trim()}
          className="w-full h-14 text-base font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 rounded-2xl shadow-xl shadow-blue-500/20 disabled:opacity-40"
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
      </div>
    </div>
  )
}
