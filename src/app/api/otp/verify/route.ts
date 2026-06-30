import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { data: authData, error: authError } = await supabase.auth.getUser(token)

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (profile?.role !== 'delivery') {
      return NextResponse.json({ error: 'Only delivery users can verify OTPs.' }, { status: 403 })
    }

    const { orderId, enteredOtp } = await req.json()
    if (!orderId || !enteredOtp) {
      return NextResponse.json({ error: 'Missing orderId or OTP' }, { status: 400 })
    }

    // Fetch the order — select user name via join
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, otp, status, otp_verified, total_price, users(name)')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'ready') {
      return NextResponse.json({ error: 'Only ready orders can be marked as delivered.' }, { status: 409 })
    }

    if (order.otp_verified) {
      return NextResponse.json({ error: 'This order has already been verified.' }, { status: 409 })
    }

    if (order.otp !== enteredOtp) {
      return NextResponse.json({ success: false, error: 'Incorrect OTP' }, { status: 200 })
    }

    // Mark as delivered
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'delivered', otp_verified: true })
      .eq('id', orderId)
      .eq('status', 'ready')
      .select('id')
      .maybeSingle()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order is no longer ready for delivery.' }, { status: 409 })
    }

    // Supabase join may return array or object — handle both
    const usersField = order.users
    let userName = 'User'
    if (Array.isArray(usersField) && usersField.length > 0) {
      userName = (usersField[0] as { name: string }).name ?? 'User'
    } else if (usersField && typeof usersField === 'object' && 'name' in usersField) {
      userName = (usersField as { name: string }).name ?? 'User'
    }

    return NextResponse.json({
      success: true,
      userName,
      amount: order.total_price,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
