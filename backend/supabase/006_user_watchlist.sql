-- ─── Migration 006: User watchlist ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_watchlist (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code TEXT        NOT NULL,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, country_code)
);

CREATE INDEX IF NOT EXISTS user_watchlist_user_idx ON public.user_watchlist (user_id);

-- ── RLS: users can only see and manage their own rows ─────────────────────────
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist"
  ON public.user_watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own watchlist"
  ON public.user_watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own watchlist"
  ON public.user_watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- ── Trigger: auto-add UAE for every new sign-up ───────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_watchlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_watchlist (user_id, country_code)
  VALUES (NEW.id, 'AE')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_user_watchlist ON auth.users;
CREATE TRIGGER on_new_user_watchlist
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_watchlist();

-- ── Seed: admin@stratlens.site gets UAE, Russia, China ───────────────────────
INSERT INTO public.user_watchlist (user_id, country_code)
  SELECT id, unnest(ARRAY['AE','RU','CN'])
  FROM auth.users
  WHERE email = 'admin@stratlens.site'
ON CONFLICT DO NOTHING;
