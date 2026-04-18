import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppRole, getRoleHomePath } from '@/lib/auth/roles'

type GuardedRole = AppRole | readonly AppRole[]

function normalizeRoles(roles: GuardedRole) {
  return Array.isArray(roles) ? [...roles] : [roles]
}

export async function getCurrentUserRole() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData.user) {
    return { user: null, role: null as AppRole | null }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()

  return {
    user: authData.user,
    role: (profile?.role ?? authData.user.user_metadata?.role ?? null) as AppRole | null,
  }
}

export async function requireRole(roles: GuardedRole) {
  const allowedRoles = normalizeRoles(roles)
  const { user, role } = await getCurrentUserRole()

  if (!user) {
    redirect('/login')
  }

  if (!role || !allowedRoles.includes(role)) {
    redirect(getRoleHomePath(role))
  }

  return { user, role }
}

export async function redirectAuthenticatedUser() {
  const { user, role } = await getCurrentUserRole()

  if (user) {
    redirect(getRoleHomePath(role))
  }
}
