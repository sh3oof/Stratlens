-- StratLens Initial Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Or via: supabase db push (if using Supabase CLI)

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- Profiles: one row per auth.users row, auto-created via trigger below
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'analyst'
                  CHECK (role IN ('analyst', 'editor', 'admin')),
  organization  TEXT,
  country       CHAR(2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events: geopolitical events ingested by the backend pipeline
CREATE TABLE IF NOT EXISTS public.events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  body          TEXT,
  tier          TEXT NOT NULL
                  CHECK (tier IN ('critical','high','medium','low','info')),
  topic         TEXT NOT NULL
                  CHECK (topic IN ('conflict','diplomacy','economy','elections',
                                   'sanctions','terrorism','humanitarian',
                                   'energy','cyber','other')),
  country_code  CHAR(2),
  source_name   TEXT NOT NULL,
  source_url    TEXT,
  confidence    SMALLINT NOT NULL DEFAULT 85
                  CHECK (confidence BETWEEN 0 AND 100),
  type          TEXT NOT NULL DEFAULT 'report'
                  CHECK (type IN ('breaking','report','analysis','brief')),
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Regions: per-country risk scores (0–100 each; higher = more risk)
CREATE TABLE IF NOT EXISTS public.regions (
  country_code  CHAR(2)  PRIMARY KEY,
  country_name  TEXT     NOT NULL,
  flag          TEXT,                          -- emoji flag, e.g. '🇦🇪'
  political     SMALLINT NOT NULL DEFAULT 0   CHECK (political  BETWEEN 0 AND 100),
  security      SMALLINT NOT NULL DEFAULT 0   CHECK (security   BETWEEN 0 AND 100),
  financial     SMALLINT NOT NULL DEFAULT 0   CHECK (financial  BETWEEN 0 AND 100),
  sanctions     SMALLINT NOT NULL DEFAULT 0   CHECK (sanctions  BETWEEN 0 AND 100),
  market        SMALLINT NOT NULL DEFAULT 0   CHECK (market     BETWEEN 0 AND 100),
  aggregate     SMALLINT NOT NULL DEFAULT 0   CHECK (aggregate  BETWEEN 0 AND 100),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alerts: push notifications sent to a specific user about an event
CREATE TABLE IF NOT EXISTS public.alerts (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id  UUID          REFERENCES public.events(id) ON DELETE SET NULL,
  tier      TEXT NOT NULL CHECK (tier IN ('critical','high','medium','low','info')),
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at   TIMESTAMPTZ,               -- NULL until the user opens the alert
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved events: user bookmarks
CREATE TABLE IF NOT EXISTS public.saved_events (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id  UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id)
);

-- Event–Region join: one event can affect many countries
CREATE TABLE IF NOT EXISTS public.event_regions (
  event_id      UUID   NOT NULL REFERENCES public.events(id)  ON DELETE CASCADE,
  country_code  CHAR(2) NOT NULL REFERENCES public.regions(country_code) ON DELETE CASCADE,
  PRIMARY KEY (event_id, country_code)
);

-- Market data: commodity / equity / FX snapshot (refreshed by a cron job)
CREATE TABLE IF NOT EXISTS public.market_data (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol      TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL
                CHECK (category IN ('energy','metals','equity','currency','commodity')),
  price       NUMERIC(18,4) NOT NULL,
  change_val  NUMERIC(18,4) NOT NULL DEFAULT 0,
  change_pct  NUMERIC(8,4)  NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL DEFAULT 'USD',
  source      TEXT NOT NULL DEFAULT 'Bloomberg',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_events_country_code  ON public.events(country_code);
CREATE INDEX IF NOT EXISTS idx_events_tier          ON public.events(tier);
CREATE INDEX IF NOT EXISTS idx_events_topic         ON public.events(topic);
CREATE INDEX IF NOT EXISTS idx_events_published_at  ON public.events(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id       ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_event_regions_code   ON public.event_regions(country_code);
CREATE INDEX IF NOT EXISTS idx_saved_events_user    ON public.saved_events(user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- The backend uses the service-role key and bypasses RLS.
-- RLS here protects direct client SDK access from the mobile app.

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data  ENABLE ROW LEVEL SECURITY;

-- profiles: own row only
CREATE POLICY "profiles_self" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- events: any authenticated user can read
CREATE POLICY "events_authenticated_read" ON public.events
  FOR SELECT USING (auth.role() = 'authenticated');

-- regions: any authenticated user can read
CREATE POLICY "regions_authenticated_read" ON public.regions
  FOR SELECT USING (auth.role() = 'authenticated');

-- event_regions: any authenticated user can read
CREATE POLICY "event_regions_authenticated_read" ON public.event_regions
  FOR SELECT USING (auth.role() = 'authenticated');

-- market_data: any authenticated user can read
CREATE POLICY "market_data_authenticated_read" ON public.market_data
  FOR SELECT USING (auth.role() = 'authenticated');

-- alerts: users see only their own rows
CREATE POLICY "alerts_own_select" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "alerts_own_update" ON public.alerts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- saved_events: users manage only their own bookmarks
CREATE POLICY "saved_events_own_select" ON public.saved_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "saved_events_own_insert" ON public.saved_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_events_own_delete" ON public.saved_events
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Utility Function ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── Triggers ────────────────────────────────────────────────────────────────

-- Keep profiles.updated_at current
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
