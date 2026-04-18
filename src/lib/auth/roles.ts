export type AppRole = 'student' | 'faculty' | 'owner' | 'delivery'

export function getRoleHomePath(role: AppRole | null | undefined) {
  if (role === 'owner') {
    return '/dashboard'
  }

  if (role === 'delivery') {
    return '/slot'
  }

  return '/shops'
}
