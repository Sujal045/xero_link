import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signupProfileSchema } from '@/lib/validations/auth'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      )
    }

    const supabaseAdmin = createAdminClient()

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(token)

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = authData.user
    const parsedProfile = signupProfileSchema.safeParse({
      name: user.user_metadata?.name,
      role: user.user_metadata?.role,
      phone: user.user_metadata?.phone,
    })

    if (!parsedProfile.success) {
      return NextResponse.json(
        {
          error: 'Invalid signup metadata',
          fieldErrors: parsedProfile.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { name, role, phone } = parsedProfile.data

    const { error } = await supabaseAdmin.from('users').insert({
      id: user.id,
      name,
      role,
      phone,
    })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true }, { status: 200 })
      }
      console.error('[users/create] DB insert error:', error.code)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[users/create] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
