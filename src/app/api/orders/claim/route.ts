import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { persistDeliveryAssignment } from '@/lib/orders/deliveryAssignment'

/**
 * Delivery partner claims an unassigned ready order.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const { orderId } = await req.json()
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: authData, error: authError } = await supabase.auth.getUser(token)

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profile?.role !== 'delivery') {
      return NextResponse.json({ error: 'Only delivery partners can claim orders.' }, { status: 403 })
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, delivery_partner_id')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    if (order.status !== 'ready') {
      return NextResponse.json({ error: 'Only ready orders can be claimed.' }, { status: 409 })
    }

    if (order.delivery_partner_id && order.delivery_partner_id !== authData.user.id) {
      return NextResponse.json({ error: 'Order already assigned to another partner.' }, { status: 409 })
    }

    if (order.delivery_partner_id === authData.user.id) {
      return NextResponse.json({
        success: true,
        alreadyAssigned: true,
        deliveryPartner: { id: authData.user.id, name: profile.name },
      })
    }

    const persist = await persistDeliveryAssignment(supabase, orderId, authData.user.id)
    if (!persist.ok) {
      return NextResponse.json(
        { error: persist.warning || persist.error || 'Claim failed.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      alreadyAssigned: false,
      deliveryPartner: { id: authData.user.id, name: profile.name },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
