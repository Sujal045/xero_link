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
    const { id, name, role, phone } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    if (authData.user.id !== id) {
      return NextResponse.json({ error: 'You can only create your own profile.' }, { status: 403 })
    }

    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const metadataRole = authData.user.user_metadata?.role
    const resolvedRole = existingProfile?.role ?? metadataRole

    if (!resolvedRole || !['student', 'faculty', 'owner', 'delivery'].includes(resolvedRole)) {
      return NextResponse.json({ error: 'Unable to determine a valid role for this user.' }, { status: 400 })
    }

    if (role && role !== resolvedRole) {
      return NextResponse.json({ error: 'Role mismatch for authenticated user.' }, { status: 403 })
    }

    const resolvedName =
      typeof name === 'string' && name.trim()
        ? name.trim()
        : typeof authData.user.user_metadata?.name === 'string' && authData.user.user_metadata.name.trim()
          ? authData.user.user_metadata.name.trim()
          : authData.user.email?.split('@')[0]

    if (!resolvedName) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
    }

    // Using upsert so auto-healing or retries don't fail with a duplicate-key violation
    const { error } = await supabaseAdmin.from('users').upsert(
      {
        id: authData.user.id,
        name: resolvedName,
        role: resolvedRole,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
      },
      { onConflict: 'id' }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
