-- Migration: OTP sessions and password reset tokens
-- Run this in the Supabase SQL Editor BEFORE deploying the backend.
-- Required by auth.service.js (BUG-C3 fix — replaced in-memory Maps with DB persistence).

-- OTP sessions: stores pending 2FA verification sessions
CREATE TABLE IF NOT EXISTS public.otp_sessions (
  token         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_data     JSONB       NOT NULL,
  auth_token    TEXT,
  refresh_token TEXT,
  otp_hash      TEXT        NOT NULL,
  attempts      INTEGER     NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-delete expired sessions (Supabase pg_cron or manual cleanup via service)
CREATE INDEX IF NOT EXISTS idx_otp_sessions_expires_at ON public.otp_sessions (expires_at);

-- Password reset tokens: stores one-time reset links
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  token      TEXT        PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_expires_at  ON public.password_reset_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_prt_user_id     ON public.password_reset_tokens (user_id);

-- Row Level Security: backend uses service role key — no RLS needed.
-- These tables are never accessed from the frontend.
ALTER TABLE public.otp_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
