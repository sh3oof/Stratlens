-- ─── Migration 002: Subscription plan support ────────────────────────────────
-- Run in Supabase Dashboard → SQL Editor after 001_initial_schema.sql

-- ── 1. Add plan columns to profiles ──────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan             TEXT        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at  TIMESTAMPTZ;

-- Constrain to known plan ids so the DB rejects bad values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'essential', 'professional', 'intelligence', 'enterprise'));

-- ── 2. Subscriptions table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                  TEXT        NOT NULL DEFAULT 'free',
  status                TEXT        NOT NULL DEFAULT 'active',
  stripe_subscription_id   TEXT,
  apple_transaction_id     TEXT,
  google_purchase_token    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT subscriptions_plan_check
    CHECK (plan IN ('free', 'essential', 'professional', 'intelligence', 'enterprise')),
  CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active', 'cancelled', 'expired', 'pending'))
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx  ON public.subscriptions(status);

-- ── 3. Row-level security ─────────────────────────────────────────────────────

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (backend) bypasses RLS for all operations — no INSERT/UPDATE
-- policies needed for client access.

-- ── 4. Auto-update updated_at ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
