-- Migration 004: ensure notifications table has type and meta columns
-- Run in Supabase SQL Editor before deploying the notification-fix backend code.
-- Safe to re-run — all statements use IF NOT EXISTS.

-- 1. Add type column (stores the notification kind: 'new_order', 'order_accepted', etc.)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type TEXT;

-- 2. Add meta JSONB column (stores dynamic interpolation data, e.g. { "clientName": "Sara" })
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT NULL;

-- 3. Index on type for fast filtering
CREATE INDEX IF NOT EXISTS notifications_type_idx
  ON public.notifications (type);

-- 4. Composite index for fast unread-count queries per user
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, is_read);
