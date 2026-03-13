import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { orderId, enteredOtp } = await req.json()
    if (!orderId || !enteredOtp) {
      return NextResponse.json({ error: 'Missing orderId or OTP' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch the order
    const { data: order, error } = await supabase
      .from('orders')
      .select('otp, status, total_price, users(name)')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.otp !== enteredOtp) {
      return NextResponse.json({ success: false, error: 'Incorrect OTP' }, { status: 200 })
    }

    // Mark as delivered
    await supabase
      .from('orders')
      .update({ status: 'delivered', otp_verified: true })
      .eq('id', orderId)

    return NextResponse.json({
      success: true,
      studentName: (order.users as { name: string } | null)?.name ?? 'Student',
      amount: order.total_price,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
