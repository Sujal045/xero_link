import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { orderId, enteredOtp } = await req.json()
    if (!orderId || !enteredOtp) {
      return NextResponse.json({ error: 'Missing orderId or OTP' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch the order — select user name via join
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

    // Supabase join may return array or object — handle both
    const usersField = order.users
    let studentName = 'Student'
    if (Array.isArray(usersField) && usersField.length > 0) {
      studentName = (usersField[0] as { name: string }).name ?? 'Student'
    } else if (usersField && typeof usersField === 'object' && 'name' in usersField) {
      studentName = (usersField as { name: string }).name ?? 'Student'
    }

    return NextResponse.json({
      success: true,
      studentName,
      amount: order.total_price,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
