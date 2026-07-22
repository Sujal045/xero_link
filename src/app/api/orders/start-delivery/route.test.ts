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

const { POST } = await import('@/app/api/orders/start-delivery/route')

function makeRequest(token: string | null, body?: object): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return new NextRequest('http://localhost/api/orders/start-delivery', {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/orders/start-delivery', () => {
  it('returns 401 without token', async () => {
    const res = await POST(makeRequest(null, { orderId: 'o1' }))
    expect(res.status).toBe(401)
  })

  it('moves ready → out_for_delivery for assigned partner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'd1' } }, error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: 'delivery' }, error: null }),
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
                  status: 'ready',
                  delivery_partner_id: 'd1',
                },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'o1',
                      status: 'out_for_delivery',
                      delivery_started_at: '2026-07-22T12:00:00.000Z',
                      courier_lat: 23.2,
                      courier_lng: 72.6,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected ${table}`)
    })

    const res = await POST(
      makeRequest('tok', { orderId: 'o1', lat: 23.2, lng: 72.6 })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.order.status).toBe('out_for_delivery')
  })

  it('is idempotent when already out_for_delivery', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'd1' } }, error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: 'delivery' }, error: null }),
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
                  status: 'out_for_delivery',
                  delivery_partner_id: 'd1',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected ${table}`)
    })

    const res = await POST(makeRequest('tok', { orderId: 'o1' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.alreadyStarted).toBe(true)
  })
})
