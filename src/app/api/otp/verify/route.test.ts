import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

const { POST } = await import('@/app/api/otp/verify/route')

function makeRequest(token: string | null, body?: object): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return new NextRequest('http://localhost/api/otp/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/otp/verify', () => {
  it('verifies OTP and marks delivered when order is ready', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'd1' } }, error: null })

    let usersCalls = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        usersCalls += 1
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () =>
                usersCalls === 1
                  ? { data: { role: 'delivery' }, error: null }
                  : { data: { name: 'Customer' }, error: null },
            }),
          }),
        }
      }

      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'o1',
                  otp: '123456',
                  status: 'ready',
                  otp_verified: false,
                  total_price: 10,
                  user_id: 'u1',
                  users: { name: 'Sujal' },
                },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: { id: 'o1' }, error: null }),
                }),
              }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected ${table}`)
    })

    const res = await POST(makeRequest('tok', { orderId: 'o1', enteredOtp: '123456' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.userName).toBe('Sujal')
  })

  it('does not 404 when ambiguous users join fails — uses fallback select', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'd1' } }, error: null })

    let orderSelectCalls = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: 'delivery', name: 'Dana' }, error: null }),
            }),
          }),
        }
      }

      if (table === 'orders') {
        return {
          select: () => {
            orderSelectCalls += 1
            return {
              eq: () => ({
                maybeSingle: async () => {
                  if (orderSelectCalls === 1) {
                    return {
                      data: null,
                      error: { message: 'Could not embed because more than one relationship was found' },
                    }
                  }
                  return {
                    data: {
                      id: 'o1',
                      otp: '654321',
                      status: 'ready',
                      otp_verified: false,
                      total_price: 7,
                      user_id: 'u1',
                    },
                    error: null,
                  }
                },
              }),
            }
          },
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: { id: 'o1' }, error: null }),
                }),
              }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected ${table}`)
    })

    const res = await POST(makeRequest('tok', { orderId: 'o1', enteredOtp: '654321' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })
})
