import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Delivery partner pushes live GPS coordinates while out for delivery.
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

    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return NextResponse.json({ error: 'Invalid lat/lng.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: authData, error: authError } = await supabase.auth.getUser(token)

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profile?.role !== 'delivery') {
      return NextResponse.json({ error: 'Only delivery partners can update location.' }, { status: 403 })
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, delivery_partner_id')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    if (order.status !== 'out_for_delivery') {
      return NextResponse.json(
        { error: 'Location can only be updated while the order is out for delivery.' },
        { status: 409 }
      )
    }

    if (order.delivery_partner_id !== authData.user.id) {
      return NextResponse.json({ error: 'Not assigned to this order.' }, { status: 403 })
    }

    const updatedAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        courier_lat: lat,
        courier_lng: lng,
        location_updated_at: updatedAt,
      })
      .eq('id', orderId)
      .eq('status', 'out_for_delivery')

    if (updateError) {
      return NextResponse.json(
        {
          error: updateError.message,
          hint: 'Ensure courier_lat / courier_lng columns exist (run location migration).',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, location_updated_at: updatedAt })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
