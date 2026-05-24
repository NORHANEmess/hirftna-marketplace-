-- Migration 005: expand notifications type check constraint
-- The original constraint only allowed a narrow set of types.
-- Drop and re-add it to include all types used by the application.
-- Safe to re-run.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'new_order',
      'order_accepted',
      'order_rejected',
      'order_ready',
      'order_completed',
      'promotion_activated',
      'promotion_rejected',
      'seller_verified',
      'new_review',
      'system'
    ));
