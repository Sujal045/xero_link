import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const body = await req.json()
    const { shop_name, price_bw, price_color } = body

    if (!shop_name) {
      return NextResponse.json(
        { error: 'Missing required fields: Shop Name' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(price_bw) || price_bw < 0 || !Number.isFinite(price_color) || price_color < 0) {
      return NextResponse.json(
        { error: 'Price values must be valid non-negative numbers.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Owner profile not found.' }, { status: 404 })
    }

    if (userData.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can create shops.' }, { status: 403 })
    }

    const { data: existingShop, error: existingShopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('owner_id', authData.user.id)
      .maybeSingle()

    if (existingShopError) {
      return NextResponse.json({ error: existingShopError.message }, { status: 500 })
    }

    if (existingShop) {
      return NextResponse.json({ error: 'This owner already has a shop.' }, { status: 409 })
    }

    const { data: shop, error: insertError } = await supabaseAdmin
      .from('shops')
      .insert({
        owner_id: authData.user.id,
        shop_name: shop_name.trim(),
        price_bw,
        price_color,
      })
      .select('*')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, shop }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
