import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  chooseDeliveryPartnerId,
  persistDeliveryAssignment,
} from '@/lib/orders/deliveryAssignment'

/**
 * Owner assigns (or re-assigns) a delivery partner to a ready order.
 * Body: { orderId: string, partnerId?: string } — partnerId optional (auto pick).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const body = await req.json()
    const orderId = body.orderId as string | undefined
    const requestedPartnerId = body.partnerId as string | undefined

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
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

    if (profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Only shop owners can assign partners.' }, { status: 403 })
    }

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', authData.user.id)
      .maybeSingle()

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, shop_id')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    if (order.shop_id !== shop.id) {
      return NextResponse.json({ error: 'Order does not belong to your shop.' }, { status: 403 })
    }

    if (order.status !== 'ready' && order.status !== 'out_for_delivery') {
      return NextResponse.json(
        { error: 'Only ready / out-for-delivery orders can be assigned.' },
        { status: 409 }
      )
    }

    const { partnerId: autoId, partners, error: chooseError } =
      await chooseDeliveryPartnerId(supabase)

    if (chooseError) {
      return NextResponse.json({ error: chooseError }, { status: 500 })
    }

    if (partners.length === 0) {
      return NextResponse.json(
        {
          error:
            'No delivery partners found. Sign up a user with role “delivery” first.',
        },
        { status: 404 }
      )
    }

    const partnerId =
      requestedPartnerId && partners.some((p) => p.id === requestedPartnerId)
        ? requestedPartnerId
        : autoId

    if (!partnerId) {
      return NextResponse.json({ error: 'Could not choose a delivery partner.' }, { status: 500 })
    }

    const persist = await persistDeliveryAssignment(supabase, orderId, partnerId)
    if (!persist.ok) {
      return NextResponse.json(
        { error: persist.warning || persist.error || 'Assignment failed.' },
        { status: 500 }
      )
    }

    const partner = partners.find((p) => p.id === partnerId) ?? null

    return NextResponse.json({
      success: true,
      deliveryPartner: partner ? { id: partner.id, name: partner.name } : { id: partnerId, name: null },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
