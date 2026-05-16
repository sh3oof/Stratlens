-- ─── Migration 004: Expand market_data with full instrument set ──────────────
-- Run in Supabase Dashboard → SQL Editor

INSERT INTO public.market_data
  (symbol, label, category, price, change_val, change_pct, unit, source)
VALUES
  -- Energy (additional)
  ('NG',      'Natural Gas',        'energy',      2.847,   0.032,   1.14, 'USD/MMBtu', 'NYMEX'),
  -- Precious Metals (additional)
  ('PLT',     'Platinum',           'metals',    1042.50, -12.30,  -1.17, 'USD/oz',    'NYMEX'),
  -- Industrial Metals
  ('ALU',     'Aluminium',          'metals',    2384.00,  18.50,   0.78, 'USD/t',     'LME'),
  ('NI',      'Nickel',             'metals',   17420.00,-280.00,  -1.58, 'USD/t',     'LME'),
  ('ZN',      'Zinc',               'metals',    2876.50,  42.30,   1.49, 'USD/t',     'LME'),
  -- Strategic
  ('BDI',     'Baltic Dry Index',   'commodity', 1284.00,  23.00,   1.82, 'pts',       'Baltic Exchange'),
  -- Indices (additional)
  ('NDX',     'NASDAQ',             'equity',  18421.00,  121.40,   0.66, 'pts',       'NASDAQ'),
  -- FX (additional)
  ('USDCNY',  'USD/CNY',            'currency',    7.247,   0.011,  0.15, 'Rate',      'FX'),
  ('USDJPY',  'USD/JPY',            'currency',  153.42,    0.83,   0.54, 'Rate',      'FX')
ON CONFLICT (symbol) DO UPDATE SET
  price      = EXCLUDED.price,
  change_val = EXCLUDED.change_val,
  change_pct = EXCLUDED.change_pct,
  updated_at = NOW();

-- Also patch existing instruments to correct sources per spec
UPDATE public.market_data SET source = 'LME'   WHERE symbol = 'COPPER';
UPDATE public.market_data SET source = 'NYSE'  WHERE symbol = 'SPX';
UPDATE public.market_data SET source = 'LSE'   WHERE symbol = 'FTSE';
UPDATE public.market_data SET source = 'ECB'   WHERE symbol = 'EURUSD';
UPDATE public.market_data SET category = 'commodity' WHERE symbol = 'UX1';
