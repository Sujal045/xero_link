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

const { POST } = await import('@/app/api/orders/mark-ready/route')

function makeRequest(token: string | null, body?: object): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return new NextRequest('http://localhost/api/orders/mark-ready', {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/orders/mark-ready', () => {
  it('returns 401 without a token', async () => {
    const res = await POST(makeRequest(null, { orderId: 'o1' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-owner roles', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
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
      throw new Error(`Unexpected table ${table}`)
    })

    const res = await POST(makeRequest('tok', { orderId: 'o1' }))
    expect(res.status).toBe(403)
  })

  it('marks ready and assigns least-loaded partner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null })

    let usersCalls = 0
    let ordersSelectCalls = 0
    let ordersUpdateCalls = 0

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        usersCalls += 1
        if (usersCalls === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'owner' }, error: null }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: async () => ({
              data: [
                { id: 'd1', name: 'Dana', role: 'delivery' },
                { id: 'd2', name: 'Dev', role: 'delivery' },
              ],
              error: null,
            }),
          }),
        }
      }

      if (table === 'shops') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: 'shop-1' }, error: null }),
            }),
          }),
        }
      }

      if (table === 'orders') {
        return {
          select: () => {
            ordersSelectCalls += 1
            if (ordersSelectCalls === 1) {
              return {
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'o1',
                      status: 'printing',
                      shop_id: 'shop-1',
                      delivery_partner_id: null,
                    },
                    error: null,
                  }),
                }),
              }
            }
            // active assignments for chooseDeliveryPartnerId
            return {
              in: () => ({
                not: async () => ({
                  data: [{ delivery_partner_id: 'd1' }, { delivery_partner_id: 'd1' }],
                  error: null,
                }),
              }),
            }
          },
          update: () => {
            ordersUpdateCalls += 1
            if (ordersUpdateCalls === 1) {
              // phase 1 mark ready
              return {
                eq: () => ({
                  eq: () => ({
                    select: () => ({
                      maybeSingle: async () => ({
                        data: {
                          id: 'o1',
                          status: 'ready',
                          printed_at: '2026-07-22T10:00:00.000Z',
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }
            }
            // phase 2 assign
            return {
              eq: async () => ({ error: null }),
            }
          },
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    const res = await POST(makeRequest('tok', { orderId: 'o1' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.assigned).toBe(true)
    expect(body.deliveryPartner.id).toBe('d2')
  })

  it('marks ready with warning when no partners exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null })

    let usersCalls = 0
    let ordersSelectCalls = 0

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        usersCalls += 1
        if (usersCalls === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'owner' }, error: null }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        }
      }

      if (table === 'shops') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: 'shop-1' }, error: null }),
            }),
          }),
        }
      }

      if (table === 'orders') {
        return {
          select: () => {
            ordersSelectCalls += 1
            if (ordersSelectCalls === 1) {
              return {
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'o1',
                      status: 'printing',
                      shop_id: 'shop-1',
                      delivery_partner_id: null,
                    },
                    error: null,
                  }),
                }),
              }
            }
            return {
              in: () => ({
                not: async () => ({ data: [], error: null }),
              }),
            }
          },
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'o1',
                      status: 'ready',
                      printed_at: '2026-07-22T10:00:00.000Z',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    const res = await POST(makeRequest('tok', { orderId: 'o1' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.assigned).toBe(false)
    expect(body.warning).toMatch(/No delivery partners/)
  })
})
