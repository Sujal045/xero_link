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

const { POST } = await import('@/app/api/shops/create/route')

function makeRequest(token: string | null, body?: object): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return new NextRequest('http://localhost/api/shops/create', {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  })
}

const validBody = {
  shop_name: 'Quick Print',
  price_bw: 1,
  price_color: 5,
  lat: 23.2156,
  lng: 72.6369,
  address: 'Gandhinagar, Gujarat, India',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/shops/create', () => {
  it('returns 401 without token', async () => {
    const res = await POST(makeRequest(null, validBody))
    expect(res.status).toBe(401)
  })

  it('returns 400 when map pin is missing', async () => {
    const res = await POST(
      makeRequest('tok', {
        shop_name: 'Quick Print',
        price_bw: 1,
        price_color: 5,
      })
    )
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/pin/i)
  })

  it('returns 400 when address is empty', async () => {
    const res = await POST(
      makeRequest('tok', { ...validBody, address: '   ' })
    )
    expect(res.status).toBe(400)
  })

  it('creates shop with location for owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'o1' } }, error: null })

    const insertPayload: Record<string, unknown>[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: 'owner' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'shops') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            insertPayload.push(row)
            return {
              select: () => ({
                single: async () => ({
                  data: { id: 's1', ...row },
                  error: null,
                }),
              }),
            }
          },
        }
      }
      throw new Error(`Unexpected ${table}`)
    })

    const res = await POST(makeRequest('tok', validBody))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(insertPayload[0]).toMatchObject({
      owner_id: 'o1',
      shop_name: 'Quick Print',
      lat: 23.2156,
      lng: 72.6369,
      address: 'Gandhinagar, Gujarat, India',
    })
  })
})
