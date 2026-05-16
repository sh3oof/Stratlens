-- StratLens Seed Data
-- Run AFTER 001_initial_schema.sql
-- Supabase Dashboard → SQL Editor → paste and run

-- ─── Regions ─────────────────────────────────────────────────────────────────
-- Scores: 0 = minimal risk, 100 = extreme risk
-- regions HAS updated_at → safe to set it in ON CONFLICT

INSERT INTO public.regions
  (country_code, country_name, flag, political, security, financial, sanctions, market, aggregate)
VALUES
  ('AE', 'United Arab Emirates', '🇦🇪', 28, 32, 22, 10, 30, 25),
  ('RU', 'Russia',               '🇷🇺', 92, 88, 82, 97, 78, 88),
  ('CN', 'China',                '🇨🇳', 72, 60, 55, 48, 52, 58),
  ('TR', 'Turkey',               '🇹🇷', 65, 52, 74, 25, 68, 57),
  ('IN', 'India',                '🇮🇳', 48, 50, 40,  8, 46, 39)
ON CONFLICT (country_code) DO UPDATE SET
  country_name = EXCLUDED.country_name,
  flag         = EXCLUDED.flag,
  political    = EXCLUDED.political,
  security     = EXCLUDED.security,
  financial    = EXCLUDED.financial,
  sanctions    = EXCLUDED.sanctions,
  market       = EXCLUDED.market,
  aggregate    = EXCLUDED.aggregate,
  updated_at   = NOW();

-- ─── Events ──────────────────────────────────────────────────────────────────
-- events columns: id, title, summary, body, tier, topic, country_code,
--                 source_name, source_url, confidence, type, published_at, created_at
-- NOTE: events has NO updated_at column → use DO NOTHING on conflict

INSERT INTO public.events
  (id, title, summary, body, tier, topic, country_code,
   source_name, source_url, confidence, type, published_at)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Russia Escalates Strikes on Ukrainian Energy Infrastructure',
    'Russian forces launched coordinated missile and drone strikes targeting power generation facilities across central Ukraine, leaving approximately 4 million households without electricity ahead of winter.',
    'Multiple Shahed-136 drone waves and Kh-101 cruise missiles struck transformer stations in Kharkiv, Poltava and Zhytomyr oblasts in what Ukrainian officials described as the largest single infrastructure attack since February 2024. The strikes coincide with dropping temperatures and are assessed as a deliberate strategy to destabilize civilian morale ahead of the heating season. NATO allies convened an emergency session; Poland and Romania activated air-defence assets near the eastern border.',
    'critical', 'conflict', 'RU',
    'Reuters', 'https://reuters.com', 94, 'breaking',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'G7 Agrees Expanded Sanctions Package Targeting Russian Oil Revenue',
    'Finance ministers from G7 nations finalized a coordinated sanctions expansion targeting Russia''s shadow fleet, oil trading intermediaries, and technology re-export channels, effective 30 days from signing.',
    'The package includes designation of 47 additional vessels suspected of carrying Russian crude above the $60 price cap, secondary sanctions on third-country financial institutions facilitating payments, and export controls on dual-use microelectronics. Treasury officials estimate the measures could reduce Russian energy revenues by up to 12% over a 12-month horizon, though enforcement will depend on co-operation from India and Turkey, both of which expressed reservations during negotiations.',
    'high', 'sanctions', 'RU',
    'Financial Times', 'https://ft.com', 91, 'report',
    NOW() - INTERVAL '5 hours'
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'UAE Signs $14bn LNG Supply Agreement with European Consortium',
    'ADNOC Gas has concluded a 15-year liquefied natural gas supply contract with a consortium of French, German, and Italian utilities, securing approximately 1.8 million tonnes per annum from the Ruwais LNG complex from 2027.',
    'The agreement positions the UAE as a cornerstone supplier in Europe''s post-Russian energy realignment. Commercial terms were not disclosed, though analysts at Wood Mackenzie estimate the deal is indexed to a hybrid TTF/JKM benchmark. Concurrently, Abu Dhabi has granted exploration rights to TotalEnergies and Equinor across two offshore blocks in the Gulf of Salwah, signalling further upstream expansion ambitions.',
    'high', 'energy', 'AE',
    'Bloomberg', 'https://bloomberg.com', 88, 'report',
    NOW() - INTERVAL '1 day'
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    'China and India Resume Border Talks After 18-Month Hiatus',
    'Diplomatic delegations from Beijing and New Delhi met in Kathmandu for the first Corps Commander-level talks since the Tawang standoff, agreeing to joint patrolling protocols along contested sectors of the Line of Actual Control.',
    'The talks produced a framework agreement on disengagement at three friction points in eastern Ladakh, with both sides committing to a 72-hour notification mechanism before patrol activity in designated buffer zones. Analysts assess the rapprochement as partly driven by economic pragmatism — bilateral trade reached $136bn in 2024 despite political tensions — and partly by China''s interest in reducing India''s deepening alignment with the Quad.',
    'medium', 'diplomacy', 'CN',
    'South China Morning Post', 'https://scmp.com', 82, 'analysis',
    NOW() - INTERVAL '2 days'
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    'Turkey''s Inflation Accelerates to 67% as Lira Hits New Low',
    'Official data from TurkStat shows annual consumer price inflation reached 67.2% in the latest reading, above analyst forecasts, as the Turkish lira declined 3.1% against the dollar to a historic low of 38.4.',
    'The Central Bank of the Republic of Turkey held its benchmark rate at 50% after five consecutive hikes, signalling a pause that markets interpreted as dovish. The lira''s weakness is exacerbating import costs, particularly for energy, where Turkey imports approximately 99% of its natural gas requirements. The IMF has quietly resumed technical discussions with Ankara, though both sides deny formal programme negotiations are underway.',
    'medium', 'economy', 'TR',
    'Bloomberg', 'https://bloomberg.com', 96, 'report',
    NOW() - INTERVAL '3 days'
  ),
  (
    'a1000000-0000-0000-0000-000000000006',
    'India Election Commission Sets Date for Uttar Pradesh State Polls',
    'The Election Commission of India announced the schedule for Uttar Pradesh assembly by-elections covering 11 constituencies, with polling scheduled across two phases and results to be declared within the same week.',
    'The by-elections are seen as a bellwether for the ruling BJP''s position in India''s most populous state ahead of the 2027 general election cycle. The opposition INDIA alliance has agreed on a seat-sharing formula covering 9 of the 11 constituencies. Voter turnout models from the Centre for the Study of Developing Societies suggest historically higher participation in western UP districts following the new voter registration drive.',
    'low', 'elections', 'IN',
    'The Hindu', 'https://thehindu.com', 99, 'brief',
    NOW() - INTERVAL '4 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Event–Region Links ───────────────────────────────────────────────────────

INSERT INTO public.event_regions (event_id, country_code) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'RU'),
  ('a1000000-0000-0000-0000-000000000002', 'RU'),
  ('a1000000-0000-0000-0000-000000000002', 'TR'),
  ('a1000000-0000-0000-0000-000000000002', 'IN'),
  ('a1000000-0000-0000-0000-000000000003', 'AE'),
  ('a1000000-0000-0000-0000-000000000004', 'CN'),
  ('a1000000-0000-0000-0000-000000000004', 'IN'),
  ('a1000000-0000-0000-0000-000000000005', 'TR'),
  ('a1000000-0000-0000-0000-000000000006', 'IN')
ON CONFLICT DO NOTHING;

-- ─── Market Data ─────────────────────────────────────────────────────────────
-- market_data HAS updated_at → safe to set it in ON CONFLICT

INSERT INTO public.market_data
  (symbol, label, category, price, change_val, change_pct, unit, source)
VALUES
  ('BRENT',  'Brent Crude',   'energy',    86.42,  1.24,  1.46, 'USD/bbl', 'ICE'),
  ('WTI',    'WTI Crude',     'energy',    82.17,  1.09,  1.34, 'USD/bbl', 'NYMEX'),
  ('GOLD',   'Gold',          'metals',  2342.80, -8.40, -0.36, 'USD/oz',  'COMEX'),
  ('SILVER', 'Silver',        'metals',    30.14,  0.22,  0.73, 'USD/oz',  'COMEX'),
  ('COPPER', 'Copper',        'metals',     4.58,  0.03,  0.66, 'USD/lb',  'COMEX'),
  ('SPX',    'S&P 500',       'equity',  5248.49, 24.31,  0.47, 'USD',     'NYSE'),
  ('FTSE',   'FTSE 100',      'equity',  8142.15,-18.70, -0.23, 'GBP',     'LSE'),
  ('DXY',    'USD Index',     'currency', 104.23,  0.38,  0.37, 'Index',   'ICE'),
  ('EURUSD', 'EUR/USD',       'currency',   1.082,-0.004,-0.37, 'Rate',    'ECB'),
  ('UX1',    'Uranium (UX1)', 'commodity',  91.50,  2.25,  2.52, 'USD/lb', 'UxC')
ON CONFLICT (symbol) DO UPDATE SET
  price      = EXCLUDED.price,
  change_val = EXCLUDED.change_val,
  change_pct = EXCLUDED.change_pct,
  updated_at = NOW();
