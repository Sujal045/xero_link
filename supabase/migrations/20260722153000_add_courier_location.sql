-- Phase 2.3: live courier location while out for delivery
-- Apply in Supabase SQL Editor (or via supabase CLI).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS courier_lat double precision,
  ADD COLUMN IF NOT EXISTS courier_lng double precision,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

COMMENT ON COLUMN public.orders.delivery_started_at IS
  'When the delivery partner tapped Start Delivery (status → out_for_delivery)';
COMMENT ON COLUMN public.orders.courier_lat IS
  'Latest courier latitude while out for delivery';
COMMENT ON COLUMN public.orders.courier_lng IS
  'Latest courier longitude while out for delivery';
COMMENT ON COLUMN public.orders.location_updated_at IS
  'When courier_lat/lng were last written';

CREATE INDEX IF NOT EXISTS orders_out_for_delivery_location_idx
  ON public.orders (status, location_updated_at DESC)
  WHERE status = 'out_for_delivery';
