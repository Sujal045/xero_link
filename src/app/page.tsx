'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppShell, AppContainer } from '@/components/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Printer, ShoppingBag, Truck, Building2,
  ArrowRight, Zap, Shield, Clock, Star,
  ChevronRight, LogOut, Package, FileText,
  CheckCircle2, IndianRupee, Bell, BarChart3,
  Upload, MapPin, Phone, Users, TrendingUp
} from 'lucide-react'

type Role = 'user' | 'owner' | 'delivery' | null
interface UserState { name: string; role: Role }

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">
      {children}
    </h3>
  )
}

function UserDashboard({ name }: { name: string }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card
        padding="lg"
        className="border-accent-border bg-gradient-to-br from-accent-soft via-surface to-surface shadow-elevated"
      >
        <p className="text-accent text-sm font-medium">Good to see you,</p>
        <h2 className="text-3xl font-extrabold text-foreground mt-1">{name}</h2>
        <p className="text-muted-foreground text-sm mt-2">Ready to place your next print order?</p>
        <Link href="/shops" className="mt-4 inline-flex">
          <Button size="default" className="gap-2">
            Browse Shops <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </Card>

      <div>
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/shops', icon: ShoppingBag, label: 'Browse Shops', sub: 'Find available printers', accent: true },
            { href: '/orders', icon: Package, label: 'My Orders', sub: 'Track your jobs', accent: false },
          ].map((a) => {
            const Icon = a.icon
            return (
              <Link key={a.href} href={a.href}>
                <Card
                  interactive
                  className={a.accent ? 'border-accent-border bg-accent-soft/60 h-full' : 'h-full'}
                >
                  <Icon className={`h-6 w-6 ${a.accent ? 'text-accent' : 'text-muted-foreground'}`} />
                  <p className="font-semibold text-foreground mt-3 text-sm">{a.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.sub}</p>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      <div>
        <SectionLabel>How It Works</SectionLabel>
        <div className="space-y-2">
          {[
            { step: '01', icon: ShoppingBag, title: 'Pick a print shop', desc: 'Browse open shops and compare pricing' },
            { step: '02', icon: Upload, title: 'Upload your document', desc: 'PDF, DOCX, JPG — we handle all formats' },
            { step: '03', icon: FileText, title: 'Configure your print', desc: 'Choose B&W or colour, single or double sided' },
            { step: '04', icon: MapPin, title: 'Enter delivery address', desc: 'We deliver straight to your door' },
            { step: '05', icon: CheckCircle2, title: 'Verify & collect', desc: 'Use your 6-digit OTP to confirm receipt' },
          ].map((s) => {
            const Icon = s.icon
            return (
              <Card key={s.step} className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-xl bg-accent-soft flex items-center justify-center shrink-0 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-accent">{s.step}</span>
                    <p className="font-semibold text-foreground text-sm">{s.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Why XeroLink?</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Zap, title: 'Fast', desc: 'Most orders printed within the hour' },
            { icon: Shield, title: 'Secure', desc: 'OTP ensures only you collect your prints' },
            { icon: IndianRupee, title: 'Affordable', desc: 'Transparent pricing, cash on delivery' },
            { icon: Clock, title: 'Real-time', desc: 'Live status from print to delivery' },
          ].map((f) => {
            const Icon = f.icon
            return (
              <Card key={f.title}>
                <div className="h-9 w-9 rounded-xl bg-accent-soft flex items-center justify-center mb-3 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-foreground text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function OwnerDashboard({ name }: { name: string }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card
        padding="lg"
        className="border-accent-border bg-gradient-to-br from-accent-soft via-surface to-surface shadow-elevated"
      >
        <p className="text-accent text-sm font-medium">Shop Owner,</p>
        <h2 className="text-3xl font-extrabold text-foreground mt-1">{name}</h2>
        <p className="text-muted-foreground text-sm mt-2">Manage orders, track revenue, keep printing.</p>
        <Link href="/dashboard" className="mt-4 inline-flex">
          <Button className="gap-2">
            Open Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </Card>

      <div>
        <SectionLabel>Quick Links</SectionLabel>
        <Link href="/dashboard">
          <Card interactive className="flex items-center justify-between border-accent-border bg-accent-soft/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Live Order Queue</p>
                <p className="text-xs text-muted-foreground">Real-time incoming print jobs</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-subtle" />
          </Card>
        </Link>
      </div>

      <div>
        <SectionLabel>What You Can Do</SectionLabel>
        <div className="space-y-2">
          {[
            { icon: Zap, title: 'Instant Notifications', desc: 'Get alerted the moment a user places an order' },
            { icon: FileText, title: 'Document Preview', desc: 'View uploaded PDFs before printing them' },
            { icon: CheckCircle2, title: 'Status Control', desc: 'Move orders: Pending → Printing → Ready with one tap' },
            { icon: BarChart3, title: 'Revenue Tracking', desc: "See today's earnings on your dashboard" },
            { icon: Shield, title: 'Shop Visibility', desc: "Toggle open/closed so users only see you when you're ready" },
          ].map((f) => {
            const Icon = f.icon
            return (
              <Card key={f.title} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-accent-soft flex items-center justify-center shrink-0 mt-0.5 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <Card padding="lg" className="space-y-3 bg-surface-muted/60">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pro Tips</h3>
        {[
          'Set your shop as Closed during breaks to pause new orders',
          'Tap "View Doc" on any order card to preview before printing',
          'Mark orders Ready as soon as printed — delivery is waiting!',
          'Reject orders politely with a reason so users can resubmit',
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Star className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{tip}</p>
          </div>
        ))}
      </Card>
    </div>
  )
}

function DeliveryDashboard({ name }: { name: string }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card
        padding="lg"
        className="border-accent-border bg-gradient-to-br from-accent-soft via-surface to-surface shadow-elevated"
      >
        <p className="text-accent text-sm font-medium">Delivery Partner,</p>
        <h2 className="text-3xl font-extrabold text-foreground mt-1">{name}</h2>
        <p className="text-muted-foreground text-sm mt-2">Check your slot and start delivering.</p>
        <Link href="/slot" className="mt-4 inline-flex">
          <Button className="gap-2">
            View Slot Orders <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </Card>

      <div>
        <SectionLabel>Quick Links</SectionLabel>
        <div className="space-y-2">
          {[
            { href: '/slot', icon: Truck, label: 'Slot Orders', sub: 'All orders ready for pickup & delivery' },
            { href: '/deliver', icon: CheckCircle2, label: 'Verify Delivery', sub: 'Enter user OTP to confirm handoff' },
          ].map((a) => {
            const Icon = a.icon
            return (
              <Link key={a.href} href={a.href}>
                <Card interactive className="flex items-center justify-between border-accent-border bg-accent-soft/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{a.sub}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-subtle" />
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Your Delivery Flow</SectionLabel>
        <div className="space-y-2">
          {[
            { step: '01', icon: Clock, title: 'Check Slot Orders', desc: 'See all orders grouped by time slot (12 PM / 5 PM)' },
            { step: '02', icon: ShoppingBag, title: 'Pick Up from Shop', desc: 'Collect printed documents from the listed shop' },
            { step: '03', icon: MapPin, title: 'Navigate to User', desc: 'Use the delivery address shown on each order card' },
            { step: '04', icon: Phone, title: 'Contact if Needed', desc: 'User phone number is shown — call when nearby' },
            { step: '05', icon: Shield, title: 'Verify OTP', desc: 'Ask the user for their 6-digit OTP to confirm handoff' },
            { step: '06', icon: IndianRupee, title: 'Collect Cash', desc: 'Collect the order amount shown on the screen' },
          ].map((s) => {
            const Icon = s.icon
            return (
              <Card key={s.step} className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-xl bg-accent-soft flex items-center justify-center shrink-0 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-accent">{s.step}</span>
                    <p className="font-semibold text-foreground text-sm">{s.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <Card padding="lg" className="space-y-3 bg-surface-muted/60">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery Tips</h3>
        {[
          'Check the slot list at 11:30 AM and 4:30 PM for fresh orders',
          'Collect all orders for a slot before starting deliveries',
          'OTP must be entered correctly — this protects the user',
          'Cash is collected on delivery — no prepayment needed',
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Star className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{tip}</p>
          </div>
        ))}
      </Card>
    </div>
  )
}

function GuestLanding() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-5 pt-6 md:pt-12 md:max-w-2xl md:mx-auto">
        <div className="relative inline-block">
          <div className="absolute inset-0 rounded-3xl bg-accent/20 blur-2xl" />
          <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-400 to-blue-700 shadow-panel mx-auto">
            <Printer className="h-10 w-10 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-5xl font-black text-foreground tracking-tight">XeroLink</h1>
          <p className="text-accent font-semibold mt-1 text-sm tracking-wide uppercase">Print · Deliver · Done</p>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed max-w-xs mx-auto">
            The easiest way to get your documents printed and delivered right to your doorstep.
          </p>
        </div>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link href="/signup">
            <Button size="lg" className="w-full gap-2 shadow-elevated">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="w-full">
              Already have an account? Sign in
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { value: '60s', label: 'To place an order' },
          { value: '₹1/pg', label: 'Starting price' },
          { value: '100%', label: 'Secure delivery' },
        ].map((s) => (
          <Card key={s.label} className="text-center border-accent-border bg-accent-soft/50">
            <p className="text-xl font-black text-accent">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Built for everyone</h2>
        <p className="text-sm text-muted-foreground mb-4">One platform, three roles — everything connected.</p>
        <div className="space-y-3 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
          {[
            {
              icon: ShoppingBag,
              role: 'Users',
              desc: 'Upload documents, place orders, and get prints delivered to your address. Track status live and use your OTP for secure handoff.',
              cta: 'Sign up as user', href: '/signup',
            },
            {
              icon: Building2,
              role: 'Shop Owners',
              desc: 'Receive orders in real-time, preview documents before printing, and manage your queue with a tap. Toggle availability anytime.',
              cta: 'Register your shop', href: '/signup',
            },
            {
              icon: Truck,
              role: 'Delivery Boys',
              desc: 'View slot-grouped orders, get user addresses, verify OTPs and collect cash at the door. Simple, fast, no paperwork.',
              cta: 'Join as delivery partner', href: '/signup',
            },
          ].map((r) => {
            const Icon = r.icon
            return (
              <Card key={r.role} padding="lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-11 w-11 rounded-xl bg-accent-soft flex items-center justify-center shrink-0 text-accent">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">{r.role}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{r.desc}</p>
                <Link href={r.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover transition-colors">
                  {r.cta} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Card>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Everything you need</h2>
        <p className="text-sm text-muted-foreground mb-4">Powerful features, beautifully simple to use.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Upload, title: 'Easy Upload', desc: 'Drag & drop PDFs, DOCX or images' },
            { icon: IndianRupee, title: 'Live Pricing', desc: 'See your total before you confirm' },
            { icon: Bell, title: 'Realtime Alerts', desc: 'Owners notified instantly on new orders' },
            { icon: Shield, title: 'OTP Security', desc: 'Only you can claim your order' },
            { icon: Clock, title: 'Status Tracking', desc: 'Pending → Printing → Ready → Delivered' },
            { icon: MapPin, title: 'Home Delivery', desc: 'Delivered to your exact address' },
            { icon: FileText, title: 'Doc Preview', desc: 'Owners preview before printing' },
            { icon: TrendingUp, title: 'Revenue Stats', desc: "Owners track today's earnings live" },
          ].map((f) => {
            const Icon = f.icon
            return (
              <Card key={f.title}>
                <div className="h-9 w-9 rounded-xl bg-accent-soft flex items-center justify-center mb-3 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-foreground text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
              </Card>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">How it works</h2>
        <p className="text-sm text-muted-foreground mb-4">From upload to delivery in 4 simple steps.</p>
        <div className="relative">
          <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-accent to-transparent" />
          <div className="space-y-4 pl-10">
            {[
              { n: 1, title: 'Sign up & choose a shop', desc: 'Create your account as a user, then browse nearby open print shops' },
              { n: 2, title: 'Upload & configure', desc: 'Drop in your file, pick B&W or colour, single or double sided, and set your copy count' },
              { n: 3, title: 'Add your delivery address', desc: 'Enter where you want your prints delivered — anywhere works' },
              { n: 4, title: 'Track, receive & pay', desc: 'Watch your job go from printed → delivered. Verify with your OTP and pay cash on delivery' },
            ].map((s) => (
              <div key={s.n} className="relative">
                <div className="absolute -left-10 h-7 w-7 rounded-full bg-accent flex items-center justify-center text-xs font-black text-white shadow-elevated">
                  {s.n}
                </div>
                <Card>
                  <p className="font-semibold text-foreground text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Card
        padding="lg"
        className="text-center space-y-4 border-accent-border bg-gradient-to-br from-accent-soft to-surface shadow-elevated"
      >
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
            <Users className="h-7 w-7" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Join XeroLink today</h2>
          <p className="text-muted-foreground text-sm mt-1">Free to sign up. No hidden charges. Pay only for what you print.</p>
        </div>
        <Link href="/signup" className="inline-flex">
          <Button className="gap-2 px-8">
            Create Free Account <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </Card>
    </div>
  )
}

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
        role: (authUser.user_metadata?.role ?? 'user') as Role,
      })
      setChecked(true)
    }
    init()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  return (
    <AppShell>
      <nav className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-xl">
        <AppContainer className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-soft">
              <Printer className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-foreground tracking-tight">XeroLink</span>
          </div>
          {checked && (
            user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-danger transition-colors px-3 py-1.5 rounded-lg hover:bg-danger-soft"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            ) : (
              <Link href="/login">
                <Button variant="soft" size="sm">Sign In</Button>
              </Link>
            )
          )}
        </AppContainer>
      </nav>

      <AppContainer className="py-6 pb-16">
        {!checked ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : user ? (
          <>
            {user.role === 'owner' && <OwnerDashboard name={user.name} />}
            {user.role === 'delivery' && <DeliveryDashboard name={user.name} />}
            {(user.role === 'user' || !user.role) && <UserDashboard name={user.name} />}
          </>
        ) : (
          <GuestLanding />
        )}
      </AppContainer>
    </AppShell>
  )
}
