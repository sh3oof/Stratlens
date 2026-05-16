-- ─── Migration 003: AI-enriched fields on events ─────────────────────────────
-- Run in Supabase Dashboard → SQL Editor after 001_initial_schema.sql

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS ai_summary    TEXT,
  ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
  ADD COLUMN IF NOT EXISTS risk_flags    JSONB,
  ADD COLUMN IF NOT EXISTS key_actors    JSONB,
  ADD COLUMN IF NOT EXISTS key_dates     JSONB,
  ADD COLUMN IF NOT EXISTS market_impact TEXT;

-- Index for the enrichment script to quickly find un-enriched events
CREATE INDEX IF NOT EXISTS events_ai_summary_null_idx
  ON public.events (id)
  WHERE ai_summary IS NULL;
