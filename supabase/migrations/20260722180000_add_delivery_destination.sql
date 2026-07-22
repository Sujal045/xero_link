-- Customer delivery destination coords (Task 2.4c)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_lat double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng double precision;

COMMENT ON COLUMN public.orders.delivery_lat IS
  'Delivery destination latitude from customer map pin / search';
COMMENT ON COLUMN public.orders.delivery_lng IS
  'Delivery destination longitude from customer map pin / search';
