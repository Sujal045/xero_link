export type AppRole = 'student' | 'owner' | 'delivery'

export function getRoleHomePath(role: AppRole | null | undefined) {
  if (role === 'owner') {
    return '/dashboard'
  }

  if (role === 'delivery') {
    return '/slot'
  }

  return '/shops'
}
