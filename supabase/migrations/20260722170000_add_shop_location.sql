-- Shop map pin + reverse-geocoded address (Task 2.4a)
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS address text;

COMMENT ON COLUMN public.shops.lat IS
  'Shop latitude from owner map pin';
COMMENT ON COLUMN public.shops.lng IS
  'Shop longitude from owner map pin';
COMMENT ON COLUMN public.shops.address IS
  'Human-readable address reverse-geocoded from shop pin';
