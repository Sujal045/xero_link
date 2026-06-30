import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({ insert: mockInsert }))
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

const { POST } = await import('@/app/api/users/create/route')

function makeRequest(token: string | null, body?: object): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return new NextRequest('http://localhost/api/users/create', {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

const VALID_USER = {
  id: 'user-123',
  user_metadata: {
    name: 'Jane Doe',
    role: 'user',
    phone: '+91 98765 43210',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/users/create', () => {
  describe('authorization', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const req = makeRequest(null)
      const res = await POST(req)
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Missing authorization token')
    })

    it('returns 401 when the token is invalid', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid token') })
      const req = makeRequest('bad-token')
      const res = await POST(req)
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('profile creation', () => {
    it('inserts a user profile and returns 201 on success', async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
      mockInsert.mockResolvedValue({ error: null })

      const req = makeRequest('valid-token')
      const res = await POST(req)

      expect(res.status).toBe(201)
      expect(await res.json()).toEqual({ success: true })
      expect(mockFrom).toHaveBeenCalledWith('users')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-123', name: 'Jane Doe', role: 'user' })
      )
    })

    it('returns 200 (not an error) when the profile already exists (duplicate key)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
      mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } })

      const req = makeRequest('valid-token')
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true })
    })

    it('returns 500 on a non-duplicate database error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
      mockInsert.mockResolvedValue({ error: { code: 'PGRST301', message: 'db error' } })

      const req = makeRequest('valid-token')
      const res = await POST(req)

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBe('Database error')
    })
  })

  describe('metadata validation', () => {
    it('returns 400 when user_metadata is missing required fields', async () => {
      const userWithBadMeta = {
        id: 'user-456',
        user_metadata: { name: '', role: 'alien', phone: null },
      }
      mockGetUser.mockResolvedValue({ data: { user: userWithBadMeta }, error: null })

      const req = makeRequest('valid-token')
      const res = await POST(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid signup metadata')
      expect(body.fieldErrors).toBeDefined()
    })

    it('does not touch the database when metadata validation fails', async () => {
      const userWithBadMeta = {
        id: 'user-789',
        user_metadata: { name: '1', role: 'ghost', phone: 'abc' },
      }
      mockGetUser.mockResolvedValue({ data: { user: userWithBadMeta }, error: null })

      const req = makeRequest('valid-token')
      await POST(req)

      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('unexpected errors', () => {
    it('returns 500 when an unexpected exception is thrown', async () => {
      mockGetUser.mockRejectedValue(new Error('Network failure'))

      const req = makeRequest('valid-token')
      const res = await POST(req)

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBe('Internal server error')
    })
  })
})
