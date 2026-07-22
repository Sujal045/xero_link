import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  chooseDeliveryPartnerId,
  persistDeliveryAssignment,
} from '@/lib/orders/deliveryAssignment'

/**
 * Owner marks an order Ready for Pickup and we auto-assign a delivery partner.
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

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Only shop owners can mark orders ready.' }, { status: 403 })
    }

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', authData.user.id)
      .maybeSingle()

    if (shopError) {
      return NextResponse.json({ error: shopError.message }, { status: 500 })
    }

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found for this owner.' }, { status: 404 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, shop_id, delivery_partner_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    if (order.shop_id !== shop.id) {
      return NextResponse.json({ error: 'Order does not belong to your shop.' }, { status: 403 })
    }

    if (order.status !== 'printing') {
      return NextResponse.json(
        { error: 'Only printing orders can be marked ready for pickup.' },
        { status: 409 }
      )
    }

    const printedAt = new Date().toISOString()

    // Phase 1: mark ready (does not require delivery_partner_id column)
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'ready',
        printed_at: printedAt,
      })
      .eq('id', orderId)
      .eq('status', 'printing')
      .select('id, status, printed_at')
      .maybeSingle()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Order is no longer in printing status.' },
        { status: 409 }
      )
    }

    // Phase 2: assign partner (optional if migration not applied / no partners)
    const {
      partnerId,
      partners,
      error: chooseError,
    } = await chooseDeliveryPartnerId(supabase)

    if (chooseError) {
      return NextResponse.json({
        success: true,
        order: { ...updated, delivery_partner_id: null, assigned_at: null },
        assigned: false,
        deliveryPartner: null,
        warning: `Ready, but could not load delivery partners: ${chooseError}`,
        partnerCount: 0,
      })
    }

    if (!partnerId) {
      return NextResponse.json({
        success: true,
        order: { ...updated, delivery_partner_id: null, assigned_at: null },
        assigned: false,
        deliveryPartner: null,
        warning:
          'No delivery partners found in the users table (role = delivery). Create a delivery account, then use Assign Partner.',
        partnerCount: 0,
      })
    }

    const persist = await persistDeliveryAssignment(supabase, orderId, partnerId)
    const partnerName = partners.find((p) => p.id === partnerId)?.name ?? null

    if (!persist.ok) {
      return NextResponse.json({
        success: true,
        order: { ...updated, delivery_partner_id: null, assigned_at: null },
        assigned: false,
        deliveryPartner: null,
        warning: persist.warning || persist.error,
        partnerCount: partners.length,
      })
    }

    return NextResponse.json({
      success: true,
      order: {
        ...updated,
        delivery_partner_id: partnerId,
        assigned_at: new Date().toISOString(),
      },
      assigned: true,
      deliveryPartner: { id: partnerId, name: partnerName },
      warning: null,
      partnerCount: partners.length,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
