import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDeliverableStatus } from '@/types/order'

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

    // Explicit FK: orders has both user_id and delivery_partner_id → users
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, otp, status, otp_verified, total_price, user_id, users!user_id(name)')
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      // Fallback without embed if relationship hint fails in some projects
      const fallback = await supabase
        .from('orders')
        .select('id, otp, status, otp_verified, total_price, user_id')
        .eq('id', orderId)
        .maybeSingle()

      if (fallback.error || !fallback.data) {
        return NextResponse.json(
          { success: false, error: fallback.error?.message || error.message || 'Order not found' },
          { status: 404 }
        )
      }

      return await completeDelivery(supabase, fallback.data, enteredOtp, null)
    }

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    const usersField = order.users
    let userName: string | null = null
    if (Array.isArray(usersField) && usersField.length > 0) {
      userName = (usersField[0] as { name: string }).name ?? null
    } else if (usersField && typeof usersField === 'object' && 'name' in usersField) {
      userName = (usersField as { name: string }).name ?? null
    }

    return await completeDelivery(supabase, order, enteredOtp, userName)
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

async function completeDelivery(
  supabase: ReturnType<typeof createAdminClient>,
  order: {
    id: string
    otp: string
    status: string
    otp_verified: boolean
    total_price: number
    user_id?: string
  },
  enteredOtp: string,
  userName: string | null
) {
  if (!isDeliverableStatus(order.status)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Only orders that are ready or out for delivery can be marked as delivered.',
      },
      { status: 409 }
    )
  }

  if (order.otp_verified) {
    return NextResponse.json(
      { success: false, error: 'This order has already been verified.' },
      { status: 409 }
    )
  }

  if (String(order.otp) !== String(enteredOtp).trim()) {
    return NextResponse.json({ success: false, error: 'Incorrect OTP' }, { status: 200 })
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'delivered', otp_verified: true })
    .eq('id', order.id)
    .eq('status', order.status)
    .select('id')
    .maybeSingle()

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
  }

  if (!updatedOrder) {
    return NextResponse.json(
      { success: false, error: 'Order is no longer available for delivery.' },
      { status: 409 }
    )
  }

  let resolvedName = userName
  if (!resolvedName && order.user_id) {
    const { data: customer } = await supabase
      .from('users')
      .select('name')
      .eq('id', order.user_id)
      .maybeSingle()
    resolvedName = customer?.name ?? null
  }

  return NextResponse.json({
    success: true,
    userName: resolvedName ?? 'User',
    amount: order.total_price,
  })
}
