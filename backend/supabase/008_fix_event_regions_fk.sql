-- ─── Migration 008: Remove FK constraint on event_regions.country_code ────────
--
-- Problem: event_regions.country_code had a FK to regions.country_code, but
-- the regions table only contains the 5 seeded countries (AE, RU, CN, TR, IN).
-- Claude classifies events to any ISO country, causing FK violations on insert.
--
-- Fix: drop the constraint so any 2-letter country code is accepted.
-- The regions table still drives the Explore screen risk matrix; this change
-- only affects which countries can be tagged to events.

ALTER TABLE public.event_regions
  DROP CONSTRAINT IF EXISTS event_regions_country_code_fkey;

-- Ensure we still have an index on country_code for lookup performance
CREATE INDEX IF NOT EXISTS event_regions_country_code_idx
  ON public.event_regions (country_code);
