'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Printer, ShoppingBag, Truck, Building2,
  ArrowRight, Zap, Shield, Clock, Star,
  ChevronRight, LogOut, Package, FileText,
  CheckCircle2, IndianRupee, Bell, BarChart3,
  Upload, MapPin, Phone, Users, TrendingUp
} from 'lucide-react'

type Role = 'student' | 'owner' | 'delivery' | null
interface UserState { name: string; role: Role }

// ─── Student Dashboard ────────────────────────────────────────────────────

function StudentDashboard({ name }: { name: string }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Greeting */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-600/30 to-blue-900/20 border border-blue-500/20 p-6">
        <p className="text-blue-300 text-sm font-medium">Good to see you,</p>
        <h2 className="text-3xl font-extrabold text-white mt-1">{name} 👋</h2>
        <p className="text-slate-400 text-sm mt-2">Ready to place your next print order?</p>
        <Link href="/shops"
          className="mt-4 inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
          Browse Shops <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/shops', icon: <ShoppingBag className="h-6 w-6 text-blue-400" />, label: 'Browse Shops', sub: 'Find available printers', bg: 'bg-blue-500/10 border-blue-500/20' },
            { href: '/orders', icon: <Package className="h-6 w-6 text-slate-400" />, label: 'My Orders', sub: 'Track your jobs', bg: 'bg-white/4 border-white/8' },
          ].map(a => (
            <Link key={a.href} href={a.href} className={`rounded-2xl border ${a.bg} p-4 hover:scale-[1.02] transition-transform`}>
              {a.icon}
              <p className="font-semibold text-white mt-3 text-sm">{a.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{a.sub}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">How It Works</h3>
        <div className="space-y-2">
          {[
            { step: '01', icon: <ShoppingBag className="h-4 w-4" />, title: 'Pick a print shop', desc: 'Browse open shops and compare pricing' },
            { step: '02', icon: <Upload className="h-4 w-4" />, title: 'Upload your document', desc: 'PDF, DOCX, JPG — we handle all formats' },
            { step: '03', icon: <FileText className="h-4 w-4" />, title: 'Configure your print', desc: 'Choose B&W or colour, single or double sided' },
            { step: '04', icon: <MapPin className="h-4 w-4" />, title: 'Enter delivery address', desc: 'We deliver straight to your door' },
            { step: '05', icon: <CheckCircle2 className="h-4 w-4" />, title: 'Verify & collect', desc: 'Use your 6-digit OTP to confirm receipt' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-4 rounded-2xl border border-white/6 bg-white/3 p-4">
              <div className="h-9 w-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 text-blue-400">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-500">{s.step}</span>
                  <p className="font-semibold text-white text-sm">{s.title}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why XeroLink */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">Why XeroLink?</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Zap className="h-5 w-5 text-blue-400" />, title: 'Fast', desc: 'Most orders printed within the hour' },
            { icon: <Shield className="h-5 w-5 text-blue-400" />, title: 'Secure', desc: 'OTP ensures only you collect your prints' },
            { icon: <IndianRupee className="h-5 w-5 text-blue-400" />, title: 'Affordable', desc: 'Transparent pricing, cash on delivery' },
            { icon: <Clock className="h-5 w-5 text-blue-400" />, title: 'Real-time', desc: 'Live status from print to delivery' },
          ].map(f => (
            <div key={f.title} className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">{f.icon}</div>
              <p className="font-semibold text-white text-sm">{f.title}</p>
              <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Owner Dashboard ──────────────────────────────────────────────────────

function OwnerDashboard({ name }: { name: string }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Greeting */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-600/30 to-blue-900/20 border border-blue-500/20 p-6">
        <p className="text-blue-300 text-sm font-medium">Shop Owner,</p>
        <h2 className="text-3xl font-extrabold text-white mt-1">{name} 👋</h2>
        <p className="text-slate-400 text-sm mt-2">Manage orders, track revenue, keep printing.</p>
        <Link href="/dashboard"
          className="mt-4 inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
          Open Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Quick links */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">Quick Links</h3>
        <div className="space-y-2">
          {[
            { href: '/dashboard', icon: <Bell className="h-5 w-5 text-blue-400" />, label: 'Live Order Queue', sub: 'Real-time incoming print jobs' },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="flex items-center justify-between rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 hover:bg-blue-500/20 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">{a.icon}</div>
                <div>
                  <p className="font-semibold text-white text-sm">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.sub}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </Link>
          ))}
        </div>
      </div>

      {/* Feature overview */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">What You Can Do</h3>
        <div className="space-y-2">
          {[
            { icon: <Zap className="h-4 w-4 text-blue-400" />, title: 'Instant Notifications', desc: 'Get alerted the moment a student places an order' },
            { icon: <FileText className="h-4 w-4 text-blue-400" />, title: 'Document Preview', desc: 'View uploaded PDFs before printing them' },
            { icon: <CheckCircle2 className="h-4 w-4 text-blue-400" />, title: 'Status Control', desc: 'Move orders: Pending → Printing → Ready with one tap' },
            { icon: <BarChart3 className="h-4 w-4 text-blue-400" />, title: 'Revenue Tracking', desc: "See today's earnings on your dashboard" },
            { icon: <Shield className="h-4 w-4 text-blue-400" />, title: 'Shop Visibility', desc: 'Toggle open/closed so students only see you when you\'re ready' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/3 p-4">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">{f.icon}</div>
              <div>
                <p className="font-semibold text-white text-sm">{f.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pro Tips</h3>
        {[
          'Set your shop as Closed during breaks to pause new orders',
          'Tap "View Doc" on any order card to preview before printing',
          'Mark orders Ready as soon as printed — delivery is waiting!',
          'Reject orders politely with a reason so students can resubmit',
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Star className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-400">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Delivery Dashboard ───────────────────────────────────────────────────

function DeliveryDashboard({ name }: { name: string }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Greeting */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-600/30 to-blue-900/20 border border-blue-500/20 p-6">
        <p className="text-blue-300 text-sm font-medium">Delivery Partner,</p>
        <h2 className="text-3xl font-extrabold text-white mt-1">{name} 👋</h2>
        <p className="text-slate-400 text-sm mt-2">Check your slot and start delivering.</p>
        <Link href="/slot"
          className="mt-4 inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
          View Slot Orders <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Quick links */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">Quick Links</h3>
        <div className="space-y-2">
          {[
            { href: '/slot', icon: <Truck className="h-5 w-5 text-blue-400" />, label: 'Slot Orders', sub: 'All orders ready for pickup & delivery' },
            { href: '/deliver', icon: <CheckCircle2 className="h-5 w-5 text-blue-400" />, label: 'Verify Delivery', sub: 'Enter student OTP to confirm handoff' },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="flex items-center justify-between rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 hover:bg-blue-500/20 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">{a.icon}</div>
                <div>
                  <p className="font-semibold text-white text-sm">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.sub}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </Link>
          ))}
        </div>
      </div>

      {/* Delivery flow */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">Your Delivery Flow</h3>
        <div className="space-y-2">
          {[
            { step: '01', icon: <Clock className="h-4 w-4" />, title: 'Check Slot Orders', desc: 'See all orders grouped by time slot (12 PM / 5 PM)' },
            { step: '02', icon: <ShoppingBag className="h-4 w-4" />, title: 'Pick Up from Shop', desc: 'Collect printed documents from the listed shop' },
            { step: '03', icon: <MapPin className="h-4 w-4" />, title: 'Navigate to Student', desc: 'Use the delivery address shown on each order card' },
            { step: '04', icon: <Phone className="h-4 w-4" />, title: 'Contact if Needed', desc: 'Student phone number is shown — call when nearby' },
            { step: '05', icon: <Shield className="h-4 w-4" />, title: 'Verify OTP', desc: 'Ask the student for their 6-digit OTP to confirm handoff' },
            { step: '06', icon: <IndianRupee className="h-4 w-4" />, title: 'Collect Cash', desc: 'Collect the order amount shown on the screen' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-4 rounded-2xl border border-white/6 bg-white/3 p-4">
              <div className="h-9 w-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 text-blue-400">
                {s.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-500">{s.step}</span>
                  <p className="font-semibold text-white text-sm">{s.title}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Delivery Tips</h3>
        {[
          'Check the slot list at 11:30 AM and 4:30 PM for fresh orders',
          'Collect all orders for a slot before starting deliveries',
          'OTP must be entered correctly — this protects the student',
          'Cash is collected on delivery — no prepayment needed',
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Star className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-400">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Guest Landing ────────────────────────────────────────────────────────

function GuestLanding() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero */}
      <div className="text-center space-y-5 pt-6 md:pt-12 md:max-w-2xl md:mx-auto">
        <div className="relative inline-block">
          <div className="absolute inset-0 rounded-3xl bg-blue-500/30 blur-2xl" />
          <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-400 to-blue-700 shadow-2xl shadow-blue-500/40 mx-auto">
            <Printer className="h-10 w-10 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-5xl font-black text-white tracking-tight">XeroLink</h1>
          <p className="text-blue-400 font-semibold mt-1 text-sm tracking-wide uppercase">Print · Deliver · Done</p>
          <p className="text-slate-400 mt-3 text-base leading-relaxed max-w-xs mx-auto">
            The easiest way to get your documents printed and delivered right to your doorstep.
          </p>
        </div>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link href="/signup"
            className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-base shadow-xl shadow-blue-500/25 hover:from-blue-400 hover:to-blue-500 transition-all">
            Get Started Free <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/login"
            className="flex items-center justify-center h-12 rounded-2xl border border-white/10 bg-white/4 text-slate-300 font-medium hover:bg-white/8 transition-all">
            Already have an account? Sign in
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
        {[
          { value: '60s', label: 'To place an order' },
          { value: '₹1/pg', label: 'Starting price' },
          { value: '100%', label: 'Secure delivery' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4 text-center">
            <p className="text-xl font-black text-blue-400">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* For everyone */}
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Built for everyone</h2>
        <p className="text-sm text-slate-500 mb-4">One platform, three roles — everything connected.</p>
        <div className="space-y-3 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
          {[
            {
              icon: <ShoppingBag className="h-6 w-6 text-blue-400" />,
              role: 'Students',
              desc: 'Upload documents, place orders, and get prints delivered to your address. Track status live and use your OTP for secure handoff.',
              cta: 'Sign up as student', href: '/signup',
            },
            {
              icon: <Building2 className="h-6 w-6 text-blue-400" />,
              role: 'Shop Owners',
              desc: 'Receive orders in real-time, preview documents before printing, and manage your queue with a tap. Toggle availability anytime.',
              cta: 'Register your shop', href: '/signup',
            },
            {
              icon: <Truck className="h-6 w-6 text-blue-400" />,
              role: 'Delivery Boys',
              desc: 'View slot-grouped orders, get student addresses, verify OTPs and collect cash at the door. Simple, fast, no paperwork.',
              cta: 'Join as delivery partner', href: '/signup',
            },
          ].map(r => (
            <div key={r.role} className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-11 w-11 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">{r.icon}</div>
                <h3 className="font-bold text-white text-base">{r.role}</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{r.desc}</p>
              <Link href={r.href}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                {r.cta} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Features deep dive */}
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Everything you need</h2>
        <p className="text-sm text-slate-500 mb-4">Powerful features, beautifully simple to use.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <Upload className="h-5 w-5 text-blue-400" />, title: 'Easy Upload', desc: 'Drag & drop PDFs, DOCX or images' },
            { icon: <IndianRupee className="h-5 w-5 text-blue-400" />, title: 'Live Pricing', desc: 'See your total before you confirm' },
            { icon: <Bell className="h-5 w-5 text-blue-400" />, title: 'Realtime Alerts', desc: 'Owners notified instantly on new orders' },
            { icon: <Shield className="h-5 w-5 text-blue-400" />, title: 'OTP Security', desc: 'Only you can claim your order' },
            { icon: <Clock className="h-5 w-5 text-blue-400" />, title: 'Status Tracking', desc: 'Pending → Printing → Ready → Delivered' },
            { icon: <MapPin className="h-5 w-5 text-blue-400" />, title: 'Home Delivery', desc: 'Delivered to your exact address' },
            { icon: <FileText className="h-5 w-5 text-blue-400" />, title: 'Doc Preview', desc: 'Owners preview before printing' },
            { icon: <TrendingUp className="h-5 w-5 text-blue-400" />, title: 'Revenue Stats', desc: 'Owners track today\'s earnings live' },
          ].map(f => (
            <div key={f.title} className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">{f.icon}</div>
              <p className="font-semibold text-white text-sm">{f.title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-lg font-bold text-white mb-1">How it works</h2>
        <p className="text-sm text-slate-500 mb-4">From upload to delivery in 4 simple steps.</p>
        <div className="relative">
          <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-blue-500 to-transparent" />
          <div className="space-y-4 pl-10">
            {[
              { n: 1, title: 'Sign up & choose a shop', desc: 'Create your account as a student, then browse nearby open print shops' },
              { n: 2, title: 'Upload & configure', desc: 'Drop in your file, pick B&W or colour, single or double sided, and set your copy count' },
              { n: 3, title: 'Add your delivery address', desc: 'Enter where you want your prints delivered — anywhere works' },
              { n: 4, title: 'Track, receive & pay', desc: 'Watch your job go from printed → delivered. Verify with your OTP and pay cash on delivery' },
            ].map(s => (
              <div key={s.n} className="relative">
                <div className="absolute -left-10 h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-blue-500/30">
                  {s.n}
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
                  <p className="font-semibold text-white text-sm">{s.title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-600/25 to-blue-900/20 border border-blue-500/20 p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
            <Users className="h-7 w-7 text-blue-400" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Join XeroLink today</h2>
          <p className="text-slate-400 text-sm mt-1">Free to sign up. No hidden charges. Pay only for what you print.</p>
        </div>
        <Link href="/signup"
          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-3 rounded-2xl transition-all shadow-xl shadow-blue-500/20 text-sm">
          Create Free Account <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<UserState | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setChecked(true); return }
      setUser({
        name: authUser.user_metadata?.name ?? 'there',
        role: (authUser.user_metadata?.role ?? 'student') as Role,
      })
      setChecked(true)
    }
    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 px-6 py-4 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Printer className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-white tracking-tight">XeroLink</span>
          </div>
          {checked && (
            user ? (
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/5">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            ) : (
              <Link href="/login"
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20">
                Sign In
              </Link>
            )
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="px-5 py-6 max-w-5xl mx-auto pb-16">
        {!checked ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : user ? (
          <>
            {user.role === 'owner' && <OwnerDashboard name={user.name} />}
            {user.role === 'delivery' && <DeliveryDashboard name={user.name} />}
            {(user.role === 'student' || !user.role) && <StudentDashboard name={user.name} />}
          </>
        ) : (
          <GuestLanding />
        )}
      </div>
    </div>
  )
}
