import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fetchShopActiveOrders } from '@/lib/orders/fetchShopOrders'

function makeClient(handlers: {
  first: { data: unknown; error: { message: string } | null }
  second?: { data: unknown; error: { message: string } | null }
  third?: { data: unknown; error: { message: string } | null }
}) {
  let call = 0
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            order: async () => {
              call += 1
              if (call === 1) return handlers.first
              if (call === 2) return handlers.second ?? handlers.first
              return handlers.third ?? handlers.second ?? handlers.first
            },
          }),
        }),
      }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchShopActiveOrders', () => {
  it('returns data from the primary query when it succeeds', async () => {
    const rows = [{ id: 'o1', users: { name: 'A' }, delivery_partner: null }]
    const client = makeClient({ first: { data: rows, error: null } })
    const result = await fetchShopActiveOrders(client as never, 'shop-1')
    expect(result.error).toBeNull()
    expect(result.data).toEqual(rows)
  })

  it('falls back when partner embed fails', async () => {
    const rows = [{ id: 'o1', users: { name: 'A' } }]
    const client = makeClient({
      first: { data: null, error: { message: 'Could not find relationship' } },
      second: { data: rows, error: null },
    })
    const result = await fetchShopActiveOrders(client as never, 'shop-1')
    expect(result.error).toBeNull()
    expect(result.data[0]).toMatchObject({ id: 'o1', delivery_partner: null })
  })

  it('returns error when all queries fail', async () => {
    const client = makeClient({
      first: { data: null, error: { message: 'fail1' } },
      second: { data: null, error: { message: 'fail2' } },
      third: { data: null, error: { message: 'fail3' } },
    })
    const result = await fetchShopActiveOrders(client as never, 'shop-1')
    expect(result.data).toEqual([])
    expect(result.error).toBe('fail3')
  })
})
