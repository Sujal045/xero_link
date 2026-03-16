import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, role, phone } = body

    if (!id || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, role' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // Using upsert so auto-healing or retries don't fail with a duplicate-key violation
    const { error } = await supabaseAdmin.from('users').upsert(
      { id, name, role, phone: phone || null },
      { onConflict: 'id' }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
