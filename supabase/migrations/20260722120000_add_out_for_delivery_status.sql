-- Phase 2: add out_for_delivery to orders.status
-- Apply in Supabase SQL Editor (or via supabase CLI) before relying on the new status in production.
--
-- If `orders.status` is a CHECK constraint, drop/recreate it.
-- If it is a Postgres ENUM, use ALTER TYPE instead (see commented block).

-- === Option A: CHECK constraint (common with text columns) ===
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'pending'::text,
        'printing'::text,
        'ready'::text,
        'out_for_delivery'::text,
        'delivered'::text,
        'rejected'::text
      ]
    )
  );

-- === Option B: Postgres ENUM (uncomment if your column uses an enum type) ===
-- ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery' AFTER 'delivered';

-- Optional: index for delivery partner live queue
CREATE INDEX IF NOT EXISTS orders_status_delivery_idx
  ON public.orders (status)
  WHERE status IN ('ready', 'out_for_delivery');
