-- Migration 002: Add admin_override column to sellers table
-- Run this in Supabase SQL Editor before deploying verification.service.js

-- admin_override controls whether auto-verification can change is_verified:
--   NULL  → auto-verification applies normally
--   TRUE  → admin locked as verified; auto-revocation is suppressed
--   FALSE → admin locked as unverified; auto-promotion is suppressed
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS admin_override boolean DEFAULT NULL;

-- Optional index for queries that filter on override status
CREATE INDEX IF NOT EXISTS sellers_admin_override_idx ON sellers (admin_override);
