import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { persistDeliveryAssignment } from '@/lib/orders/deliveryAssignment'

/**
 * Delivery partner starts a delivery:
 * ready → out_for_delivery (+ optional claim if still unassigned).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const { orderId, lat, lng } = await req.json()
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: authData, error: authError } = await supabase.auth.getUser(token)

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const partnerId = authData.user.id

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', partnerId)
      .maybeSingle()

    if (profile?.role !== 'delivery') {
      return NextResponse.json({ error: 'Only delivery partners can start a delivery.' }, { status: 403 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, delivery_partner_id')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    // Idempotent: already in transit for this partner
    if (order.status === 'out_for_delivery') {
      if (order.delivery_partner_id && order.delivery_partner_id !== partnerId) {
        return NextResponse.json(
          { error: 'This order is already out for delivery with another partner.' },
          { status: 409 }
        )
      }
      return NextResponse.json({
        success: true,
        alreadyStarted: true,
        order: { id: order.id, status: 'out_for_delivery' },
      })
    }

    if (order.status !== 'ready') {
      return NextResponse.json(
        { error: 'Only ready orders can be started for delivery.' },
        { status: 409 }
      )
    }

    if (order.delivery_partner_id && order.delivery_partner_id !== partnerId) {
      return NextResponse.json(
        { error: 'This order is assigned to another delivery partner.' },
        { status: 403 }
      )
    }

    // Claim if still unassigned
    if (!order.delivery_partner_id) {
      const persist = await persistDeliveryAssignment(supabase, orderId, partnerId)
      if (!persist.ok) {
        return NextResponse.json(
          { error: persist.warning || persist.error || 'Could not claim order before starting.' },
          { status: 500 }
        )
      }
    }

    const startedAt = new Date().toISOString()
    const hasLocation =
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)

    const updatePayload: Record<string, unknown> = {
      status: 'out_for_delivery',
      delivery_started_at: startedAt,
      delivery_partner_id: partnerId,
    }

    if (hasLocation) {
      updatePayload.courier_lat = lat
      updatePayload.courier_lng = lng
      updatePayload.location_updated_at = startedAt
    }

    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .eq('status', 'ready')
      .select('id, status, delivery_started_at, courier_lat, courier_lng')
      .maybeSingle()

    if (updateError) {
      // Retry without location columns if migration not applied
      const msg = updateError.message.toLowerCase()
      if (msg.includes('courier_') || msg.includes('delivery_started') || msg.includes('column')) {
        const retry = await supabase
          .from('orders')
          .update({ status: 'out_for_delivery', delivery_partner_id: partnerId })
          .eq('id', orderId)
          .eq('status', 'ready')
          .select('id, status')
          .maybeSingle()

        if (retry.error || !retry.data) {
          return NextResponse.json(
            { error: retry.error?.message || updateError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          alreadyStarted: false,
          order: retry.data,
          warning:
            'Delivery started. Run the courier location migration to enable live tracking fields.',
        })
      }

      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Order is no longer ready to start delivery.' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      alreadyStarted: false,
      order: updated,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
