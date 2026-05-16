# StratLens — Claude Code Context

StratLens is a geopolitical public intelligence mobile app. It aggregates international news, classifies events by risk level and category, generates AI summaries, and sends region-based alerts to users.

**Website:** https://stratlens.site  
**Email:** info@stratlens.site | support@stratlens.site | legal@stratlens.site

---

## Project Status

### Completed ✅
- ✅ Website deployed at https://stratlens.site (Netlify, files in `stratlens-website/`)
- ✅ Backend API running on port 3001 (Node.js + Express + TypeScript)
- ✅ Supabase database connected (PostgreSQL + Auth)
- ✅ Auth screens (sign in / sign up / forgot password)
- ✅ Feed screen with AI-enriched events and tier filters
- ✅ Event detail screen with AI Executive Summary, Why It Matters, Risk Flags, Key Actors
- ✅ Explore / Country Risk Matrix screen with risk dimension bars
- ✅ Markets screen with 19 instruments and sparkline charts
- ✅ Market ticker strip on all tab screens (Bloomberg-style infinite scroll)
- ✅ Alerts screen with unread badge and filter tabs
- ✅ Profile screen with language switcher (EN / AR / ES)
- ✅ Arabic + Spanish AI translation with 7-day AsyncStorage caching
- ✅ Subscription plans (Free / Essential / Professional / Intelligence / Enterprise)
- ✅ Country locking by plan limit (alphabetical assignment)
- ✅ Paywall screen with monthly / annual toggle
- ✅ AI event enrichment script (`backend/src/scripts/enrichEvents.ts`)
- ✅ Multi-URL backend resolver (auto-detects correct IP, no .env changes needed)

### Still To Do 🔲
- 🔲 Connect real payments (Stripe / Apple IAP / Google Play Billing)
- 🔲 Configure real email addresses on stratlens.site domain
- 🔲 Legal review of all policy pages (privacy.html, terms.html)
- 🔲 Connect waitlist / contact forms to real backend or service (e.g. Resend, Mailchimp)
- 🔲 TestFlight build for real device testing
- 🔲 App Store submission (Apple + Google Play)
- 🔲 Real news ingestion pipeline (RSS feeds → AI analysis → Supabase)
- 🔲 Scheduled AI enrichment (cron job on server or Supabase Edge Functions)
- 🔲 Production deployment of backend (Railway / Render / Fly.io)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo (SDK 53) |
| Routing | Expo Router (file-based) |
| State | Redux Toolkit |
| Auth/DB | Supabase (PostgreSQL + Auth) |
| Backend | Node.js + Express (TypeScript) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Website | Static HTML/CSS/JS — hosted on Netlify |

---

## Project Structure

```
StratLens/
├── app/                         # Expo Router screens
│   ├── _layout.tsx              # Root layout — Provider, auth guard, market ticker init
│   ├── (auth)/                  # Auth group (no tab bar)
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                  # Bottom tab navigator (4 tabs)
│   │   ├── _layout.tsx          # Tab bar config (Feed / Explore / Alerts / Profile)
│   │   ├── index.tsx            # Feed screen
│   │   ├── explore.tsx          # Country Risk Matrix
│   │   ├── alerts.tsx           # Alerts with unread badge
│   │   └── profile.tsx          # User profile / settings
│   ├── event/[id].tsx           # Event detail (full intelligence brief)
│   ├── country/[code].tsx       # Country detail + risk matrix
│   ├── market/[symbol].tsx      # Market instrument detail modal
│   ├── markets.tsx              # Full markets screen (19 instruments)
│   └── paywall.tsx              # Subscription paywall modal
│
├── src/
│   ├── config/
│   │   └── plans.ts             # Plan definitions (Free→Enterprise) + feature helpers
│   ├── types/index.ts           # All TypeScript interfaces and enums
│   ├── constants/
│   │   └── theme.ts             # Colors, tierColor(), flagEmoji()
│   ├── store/
│   │   ├── index.ts             # configureStore
│   │   ├── hooks.ts             # useAppDispatch / useAppSelector
│   │   └── slices/
│   │       ├── eventsSlice.ts
│   │       ├── regionsSlice.ts
│   │       ├── alertsSlice.ts
│   │       ├── authSlice.ts
│   │       └── marketsSlice.ts  # Live market data + simulation
│   ├── services/
│   │   ├── supabase.ts          # Supabase client (anon key)
│   │   ├── api.ts               # Typed fetch wrapper
│   │   ├── apiResolver.ts       # Multi-URL backend resolver (auto-probe)
│   │   └── translationService.ts # Claude translation + AsyncStorage cache
│   ├── hooks/
│   │   ├── useEvents.ts
│   │   ├── useAuth.ts
│   │   ├── useRegions.ts
│   │   ├── useAlerts.ts
│   │   ├── useMarkets.ts        # Thin Redux selector wrapper
│   │   ├── usePlan.ts           # Plan limits + country access
│   │   └── useConnectionStatus.ts
│   ├── components/
│   │   ├── common/
│   │   │   ├── RiskBadge.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── feed/
│   │   │   ├── EventCard.tsx    # Live AI translation built-in
│   │   │   └── FilterBar.tsx
│   │   ├── RegionCard.tsx       # Risk bars + lock overlay
│   │   └── MarketTicker.tsx     # Bloomberg-style infinite scroll ticker
│   ├── i18n/
│   │   ├── index.ts             # i18n init, changeLanguage, RTL support
│   │   └── locales/
│   │       ├── en.ts
│   │       ├── ar.ts
│   │       └── es.ts
│   └── utils/index.ts
│
├── backend/
│   └── src/
│       ├── index.ts             # Express bootstrap
│       ├── middleware/auth.ts   # Supabase JWT validation
│       ├── routes/
│       │   ├── events.ts        # GET/PATCH events + camelCase field mapper
│       │   ├── regions.ts       # GET regions (public)
│       │   ├── alerts.ts        # GET/PATCH alerts (auth required)
│       │   ├── ai.ts            # POST /summarize, /brief, /translate
│       │   └── market.ts        # GET market data (public)
│       ├── services/
│       │   ├── claudeService.ts # summarize, analyze, translate, enrichEvent
│       │   └── supabaseService.ts
│       └── scripts/
│           └── enrichEvents.ts  # CLI: npm run enrich [--dry-run] [--id <uuid>]
│
├── stratlens-website/           # Marketing website
│   ├── index.html
│   ├── privacy.html
│   ├── terms.html
│   ├── styles.css
│   ├── script.js
│   ├── netlify.toml             # Netlify deploy config
│   └── vercel.json              # Vercel deploy config
│
└── ai/
    └── prompts/
        ├── summarize.ts
        ├── analyze.ts
        └── brief.ts
```

---

## Key Design Decisions

- **Supabase auth token** validated on every protected backend request via `authMiddleware`. Public routes: `/api/events`, `/api/regions`, `/api/market`. Protected: `/api/alerts`, `/api/ai`.
- **Service role key** only ever used server-side. Mobile app only has the anon key.
- **Claude model**: `claude-sonnet-4-6` for all AI tasks. Do not downgrade to Haiku.
- **Risk levels**: `critical > high > medium > low > info`. Drives UI color coding and alert priority.
- **API base URL resolution**: `apiResolver.ts` probes `EXPO_PUBLIC_API_BASE_URL` → `localhost:3001` → `127.0.0.1:3001` in order. No need to update `.env` when Mac IP changes on simulator.
- **Market simulation**: one `setInterval` in root `_layout.tsx` dispatches `applyTick` to Redux every 10s. All screens share the same Redux state — no duplicate fetches.
- **Translation caching**: `AsyncStorage` key `@stratlens_trans_{lang}_{eventId}_{field}`, 7-day TTL. Max 3 concurrent Claude translation calls (concurrency limiter in `translationService.ts`).
- **Plan enforcement**: `usePlan()` sorts all loaded regions alphabetically by `country_code`, takes the first `plan.countries_limit` — deterministic and consistent across screens.
- **AI enrichment fields**: `ai_summary`, `why_it_matters`, `risk_flags`, `key_actors`, `key_dates`, `market_impact` stored in Supabase. Backend route maps snake_case → camelCase (`aiSummary` etc.) before sending to mobile.

---

## Running the Project

### Mobile
```bash
npm install
npx expo start
```

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in keys
npm run dev

# Enrich un-enriched events with AI fields:
npm run enrich
npm run enrich -- --dry-run
npm run enrich -- --id <event-uuid>
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL (https://xxx.supabase.co) |
| `SUPABASE_ANON_KEY` | Anon/publishable key — used by auth middleware only |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy name — same as `SUPABASE_SECRET_KEY` |
| `SUPABASE_SECRET_KEY` | Service role key — DB admin queries, bypasses RLS |
| `ANTHROPIC_API_KEY` | Claude API key for all AI operations |
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | `development` or `production` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

### Mobile app (`.env` in project root)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `EXPO_PUBLIC_API_BASE_URL` | Backend URL (optional — auto-resolved if missing) |

---

## Database Migrations

Run in order via **Supabase Dashboard → SQL Editor**:

| File | Description |
|------|-------------|
| `backend/supabase/001_initial_schema.sql` | Core tables: events, regions, event_regions, profiles, saved_events, alerts |
| `backend/supabase/002_add_subscriptions.sql` | `plan` + `plan_expires_at` on profiles; `subscriptions` table with RLS |
| `backend/supabase/003_add_ai_fields.sql` | AI enrichment columns on events: ai_summary, why_it_matters, risk_flags, key_actors, key_dates, market_impact |
| `backend/supabase/004_expand_market_data.sql` | Expands market_data to 19 instruments (adds NG, PLT, ALU, NI, ZN, BDI, NDX, USDCNY, USDJPY) |
| `backend/supabase/seed.sql` | Seed data: 5 regions, 6 events, 10 market instruments |

---

## Supabase Schema (actual tables)

| Table | Key columns |
|-------|-------------|
| `events` | id, title, summary, body, tier, topic, type, confidence, country_code, source_url, source_name, published_at, ai_summary, why_it_matters, risk_flags (JSONB), key_actors (JSONB), key_dates (JSONB), market_impact |
| `regions` | country_code (PK), country_name, flag, political, security, financial, sanctions, market, aggregate, updated_at |
| `event_regions` | event_id, country_code (join table) |
| `profiles` | id (= auth.uid), email, full_name, role, plan, plan_expires_at, created_at, updated_at |
| `subscriptions` | id, user_id, plan, status, stripe_subscription_id, apple_transaction_id, google_purchase_token |
| `saved_events` | user_id, event_id |
| `alerts` | id, user_id, event_id, tier, sent_at, read_at, created_at |
| `market_data` | symbol (PK), label, category, price, change_val, change_pct, unit, source, updated_at |

---

## Official Contacts & Domain

| Purpose | Address |
|---------|---------|
| Website | https://stratlens.site |
| General | info@stratlens.site |
| Support | support@stratlens.site |
| Legal | legal@stratlens.site |
| Privacy | privacy@stratlens.site |

---

## Color Palette (Dark theme — actual values used in code)

```
Background:    #07101f   (BG)
Card/Surface:  #0d1b30   (CARD)
Border:        #1a2d45   (BORDER)
Teal accent:   #0ea5e9   (TEAL)
Text primary:  #e2e8f0   (TEXT)
Text muted:    #64748b   (DIM)

Tier critical/high: #ef4444
Tier medium:        #eab308
Tier low/info:      #6b7280

Market up:    #22c55e
Market down:  #ef4444

Ticker bg:    #040d1a
```

## Subscription Plans

| Plan | Price/mo | Countries | Alerts | AI Summary |
|------|----------|-----------|--------|------------|
| Free | $0 | 3 | ✗ | ✗ |
| Essential | $12 | 8 | ✓ | ✗ |
| Professional | $39 | 25 | ✓ | ✓ |
| Intelligence | $99 | Unlimited | ✓ | ✓ |
| Enterprise | Custom | Unlimited | ✓ | ✓ |

Annual pricing saves ~20%. Payments not yet live — waitlist in place.
