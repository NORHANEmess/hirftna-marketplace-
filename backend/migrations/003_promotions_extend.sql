-- Migration 003: extend promotions table for admin-managed seller promotion flow
-- Run this in Supabase SQL Editor before deploying Phase 17 backend code

-- 1. Add new columns (safe to re-run — IF NOT EXISTS)
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS requested_days   INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Add CHECK on status (drop first if it exists, then re-add)
ALTER TABLE public.promotions
  DROP CONSTRAINT IF EXISTS promotions_status_check;

ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_status_check
    CHECK (status IN ('pending', 'active', 'expired', 'rejected'));

-- 3. Fix placement constraint — the old table used 'homepage'/'featured'/'category_top'.
--    Drop it and add one that accepts 'hero' and 'browse'.
ALTER TABLE public.promotions
  DROP CONSTRAINT IF EXISTS promotions_placement_check;

ALTER TABLE public.promotions
  ALTER COLUMN placement DROP NOT NULL;

-- Allow null placement (seller-level) and both old + new placement values
ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_placement_check
    CHECK (placement IS NULL OR placement IN ('hero', 'browse', 'homepage', 'featured', 'category_top'));

-- 4. Make product_id, starts_at, ends_at nullable — set by admin on activation
ALTER TABLE public.promotions
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.promotions
  ALTER COLUMN starts_at DROP NOT NULL;

ALTER TABLE public.promotions
  ALTER COLUMN ends_at DROP NOT NULL;

-- 5. Make is_active default to false for pending requests
ALTER TABLE public.promotions
  ALTER COLUMN is_active SET DEFAULT false;

-- 6. Indexes for fast filtering
CREATE INDEX IF NOT EXISTS promotions_status_idx    ON public.promotions(status);
CREATE INDEX IF NOT EXISTS promotions_seller_id_idx ON public.promotions(seller_id);
CREATE INDEX IF NOT EXISTS promotions_ends_at_idx   ON public.promotions(ends_at);
