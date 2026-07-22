-- Phase 2.2: assign a delivery partner when an order becomes ready
-- Apply in Supabase SQL Editor (or via supabase CLI) before using assignment in production.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_partner_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_delivery_partner_status_idx
  ON public.orders (delivery_partner_id, status)
  WHERE delivery_partner_id IS NOT NULL;

COMMENT ON COLUMN public.orders.delivery_partner_id IS
  'Delivery user assigned when the shop marks the order Ready for Pickup';
COMMENT ON COLUMN public.orders.assigned_at IS
  'Timestamp when delivery_partner_id was set';
