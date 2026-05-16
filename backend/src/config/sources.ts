/**
 * RSS feed sources for StratLens ingestion.
 *
 * Guidelines for adding sources:
 *  - Prefer feeds that cover hard geopolitical news, not opinion/lifestyle
 *  - Confirm the feed URL is publicly accessible (no login required)
 *  - Set enabled: false to pause a source without deleting its config
 *  - biasNote is for internal reference only — not exposed in the app
 */

export interface FeedSource {
  name:      string;
  url:       string;
  region:    'global' | 'middle-east' | 'asia' | 'europe' | 'americas' | 'africa';
  enabled:   boolean;
  maxItems?: number;   // per-source override for MAX_PER_SOURCE
  biasNote?: string;
}

export const SOURCES: FeedSource[] = [

  // ── Wire Services (DNS blocked on this network — leave disabled) ───────────
  {
    name:    'Reuters World',
    url:     'https://feeds.reuters.com/reuters/worldNews',
    region:  'global',
    enabled: false,
    biasNote: 'DNS blocked',
  },
  {
    name:    'Associated Press',
    url:     'https://feeds.apnews.com/rss/world-news',
    region:  'global',
    enabled: false,
    biasNote: 'DNS blocked',
  },

  // ── BBC ───────────────────────────────────────────────────────────────────
  {
    name:    'BBC World News',
    url:     'http://feeds.bbci.co.uk/news/world/rss.xml',
    region:  'global',
    enabled: true,
  },
  {
    name:    'BBC Business',
    url:     'http://feeds.bbci.co.uk/news/business/rss.xml',
    region:  'global',
    enabled: true,
  },

  // ── Middle East / Gulf ────────────────────────────────────────────────────
  {
    name:    'Al Jazeera English',
    url:     'https://www.aljazeera.com/xml/rss/all.xml',
    region:  'middle-east',
    enabled: true,
  },
  {
    name:    'Middle East Eye',
    url:     'https://www.middleeasteye.net/rss',
    region:  'middle-east',
    enabled: true,
  },
  {
    name:    'The National (UAE)',
    url:     'https://www.thenationalnews.com/rss/',
    region:  'middle-east',
    enabled: true,
  },

  // ── Asia-Pacific ──────────────────────────────────────────────────────────
  {
    name:    'South China Morning Post',
    url:     'https://www.scmp.com/rss/91/feed',
    region:  'asia',
    enabled: true,
  },
  {
    name:    'The Hindu',
    url:     'https://www.thehindu.com/news/international/feeder/default.rss',
    region:  'asia',
    enabled: true,
  },
  {
    name:    'The Diplomat',
    url:     'https://thediplomat.com/feed/',
    region:  'asia',
    enabled: true,
  },

  // ── Defence / Security ────────────────────────────────────────────────────
  {
    name:    'Defense News',
    url:     'https://www.defensenews.com/arc/outboundfeeds/rss/',
    region:  'global',
    enabled: true,
  },
  {
    name:    'Breaking Defense',
    url:     'https://breakingdefense.com/feed/',
    region:  'global',
    enabled: true,
  },
  {
    name:    'War on the Rocks',
    url:     'https://warontherocks.com/feed/',
    region:  'global',
    enabled: true,
  },

  // ── Policy / Foreign Affairs ──────────────────────────────────────────────
  {
    name:    'Politico',
    url:     'https://www.politico.com/rss/politicopicks.xml',
    region:  'global',
    enabled: true,
  },
  {
    name:    'Foreign Policy',
    url:     'https://foreignpolicy.com/feed/',
    region:  'global',
    enabled: true,
  },

  // ── International Organisations ───────────────────────────────────────────
  {
    name:    'UN News',
    url:     'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    region:  'global',
    enabled: true,
  },
  {
    name:    'World Bank News',
    url:     'https://feeds.worldbank.org/worldbank/news',
    region:  'global',
    enabled: true,
  },

  // ── Google News — Topic Searches ──────────────────────────────────────────
  // Google News RSS supports ?q= searches; hl/gl set language/country for ranking.
  {
    name:     'Google News: UAE',
    url:      'https://news.google.com/rss/search?q=UAE+news&hl=en&gl=AE&ceid=AE:en',
    region:   'middle-east',
    enabled:  true,
    maxItems: 8,
  },
  {
    name:     'Google News: Saudi Arabia',
    url:      'https://news.google.com/rss/search?q=Saudi+Arabia&hl=en&gl=US&ceid=US:en',
    region:   'middle-east',
    enabled:  true,
    maxItems: 8,
  },
  {
    name:     'Google News: Geopolitics',
    url:      'https://news.google.com/rss/search?q=geopolitics+security&hl=en&gl=US&ceid=US:en',
    region:   'global',
    enabled:  true,
    maxItems: 10,
  },
  {
    name:     'Google News: Sanctions',
    url:      'https://news.google.com/rss/search?q=sanctions+2025&hl=en&gl=US&ceid=US:en',
    region:   'global',
    enabled:  true,
    maxItems: 8,
  },
  {
    name:     'Google News: Oil & Energy',
    url:      'https://news.google.com/rss/search?q=oil+energy+market&hl=en&gl=US&ceid=US:en',
    region:   'global',
    enabled:  true,
    maxItems: 8,
  },
  {
    name:     'Google News: Defense',
    url:      'https://news.google.com/rss/search?q=defense+military&hl=en&gl=US&ceid=US:en',
    region:   'global',
    enabled:  true,
    maxItems: 8,
  },
  {
    name:     'Google News: China',
    url:      'https://news.google.com/rss/search?q=China+economy+security&hl=en&gl=US&ceid=US:en',
    region:   'asia',
    enabled:  true,
    maxItems: 8,
  },
  {
    name:     'Google News: Russia',
    url:      'https://news.google.com/rss/search?q=Russia+sanctions&hl=en&gl=US&ceid=US:en',
    region:   'global',
    enabled:  true,
    maxItems: 8,
  },
  {
    name:     'Google News: Middle East',
    url:      'https://news.google.com/rss/search?q=Middle+East&hl=en&gl=US&ceid=US:en',
    region:   'middle-east',
    enabled:  true,
    maxItems: 8,
  },

  // ── Paywalled / Restricted (disabled) ────────────────────────────────────
  {
    name:    'Financial Times',
    url:     'https://www.ft.com/world?format=rss',
    region:  'global',
    enabled: false,
    biasNote: 'Requires FT subscription for full content',
  },
  {
    name:    'Bloomberg Markets',
    url:     'https://feeds.bloomberg.com/markets/news.rss',
    region:  'global',
    enabled: false,
    biasNote: 'Bloomberg RSS is restricted; use Bloomberg API',
  },
];

/** Only the sources the script will actually attempt. */
export const ENABLED_SOURCES = SOURCES.filter(s => s.enabled);
