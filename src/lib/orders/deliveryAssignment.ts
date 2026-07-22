import type { SupabaseClient } from '@supabase/supabase-js'
import {
  countActiveAssignments,
  pickLeastLoadedPartner,
} from '@/lib/orders/assignDeliveryPartner'

export type DeliveryPartnerRow = { id: string; name: string | null }

export async function listDeliveryPartners(
  supabase: SupabaseClient
): Promise<{ partners: DeliveryPartnerRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('role', 'delivery')

  if (error) return { partners: [], error: error.message }

  return {
    partners: (data ?? []).map((p) => ({ id: p.id, name: p.name ?? null })),
    error: null,
  }
}

export async function chooseDeliveryPartnerId(
  supabase: SupabaseClient
): Promise<{ partnerId: string | null; partners: DeliveryPartnerRow[]; error: string | null }> {
  const { partners, error } = await listDeliveryPartners(supabase)
  if (error) return { partnerId: null, partners: [], error }

  const { data: activeOrders, error: activeError } = await supabase
    .from('orders')
    .select('delivery_partner_id')
    .in('status', ['ready', 'out_for_delivery'])
    .not('delivery_partner_id', 'is', null)

  // If assignment column is missing, still return a partner id for the caller to try
  const counts = activeError
    ? {}
    : countActiveAssignments(activeOrders ?? [])

  return {
    partnerId: pickLeastLoadedPartner(
      partners.map((p) => p.id),
      counts
    ),
    partners,
    error: null,
  }
}

/**
 * Persist assignment. Returns a soft warning if the DB column is not migrated yet.
 */
export async function persistDeliveryAssignment(
  supabase: SupabaseClient,
  orderId: string,
  partnerId: string
): Promise<{ ok: boolean; warning: string | null; error: string | null }> {
  const assignedAt = new Date().toISOString()
  const { error } = await supabase
    .from('orders')
    .update({
      delivery_partner_id: partnerId,
      assigned_at: assignedAt,
    })
    .eq('id', orderId)

  if (!error) return { ok: true, warning: null, error: null }

  const msg = error.message || ''
  if (
    msg.toLowerCase().includes('delivery_partner_id') ||
    msg.toLowerCase().includes('column') ||
    error.code === 'PGRST204' ||
    error.code === '42703'
  ) {
    return {
      ok: false,
      warning:
        'Order is ready, but delivery_partner_id is missing in the database. Run the assignment migration in Supabase.',
      error: null,
    }
  }

  return { ok: false, warning: null, error: msg }
}
