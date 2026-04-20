import { describe, it, expect } from 'vitest'
import { getRoleHomePath } from '@/lib/auth/roles'

describe('getRoleHomePath', () => {
  it('returns /shops for student', () => {
    expect(getRoleHomePath('student')).toBe('/shops')
  })

  it('returns /dashboard for owner', () => {
    expect(getRoleHomePath('owner')).toBe('/dashboard')
  })

  it('returns /slot for delivery', () => {
    expect(getRoleHomePath('delivery')).toBe('/slot')
  })

  it('returns /shops for null (unauthenticated / unknown)', () => {
    expect(getRoleHomePath(null)).toBe('/shops')
  })

  it('returns /shops for undefined', () => {
    expect(getRoleHomePath(undefined)).toBe('/shops')
  })
})
