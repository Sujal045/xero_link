import type { SupabaseClient } from '@supabase/supabase-js'

/** Active shop queue statuses (exclude completed). */
const ACTIVE_FILTER = 'delivered'

type OrderRow = Record<string, unknown> & {
  users?: { name: string } | null
  delivery_partner?: { name: string } | null
}

/**
 * Fetch active orders for a shop.
 * Uses explicit FK hints so PostgREST does not fail when orders has both
 * user_id and delivery_partner_id pointing at users.
 * Falls back if delivery_partner_id is not migrated yet.
 */
export async function fetchShopActiveOrders(
  supabase: SupabaseClient,
  shopId: string
): Promise<{ data: OrderRow[]; error: string | null }> {
  const withPartner = await supabase
    .from('orders')
    .select('*, users!user_id(name), delivery_partner:users!delivery_partner_id(name)')
    .eq('shop_id', shopId)
    .neq('status', ACTIVE_FILTER)
    .order('created_at', { ascending: true })

  if (!withPartner.error) {
    return { data: (withPartner.data as OrderRow[]) ?? [], error: null }
  }

  // Column / FK missing, or other embed issue — fall back without partner join
  const fallback = await supabase
    .from('orders')
    .select('*, users!user_id(name)')
    .eq('shop_id', shopId)
    .neq('status', ACTIVE_FILTER)
    .order('created_at', { ascending: true })

  if (fallback.error) {
    // Last resort: no embeds (still shows queue; names may be missing)
    const bare = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .neq('status', ACTIVE_FILTER)
      .order('created_at', { ascending: true })

    if (bare.error) {
      return { data: [], error: bare.error.message }
    }

    return {
      data: ((bare.data as OrderRow[]) ?? []).map((row) => ({
        ...row,
        users: null,
        delivery_partner: null,
      })),
      error: null,
    }
  }

  return {
    data: ((fallback.data as OrderRow[]) ?? []).map((row) => ({
      ...row,
      delivery_partner: null,
    })),
    error: null,
  }
}
