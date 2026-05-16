# StratLens Website

Static marketing and legal site for the StratLens geopolitical intelligence platform.

**Official domain:** [stratlens.site](https://stratlens.site)

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Main landing page — hero, features, pricing, CTA, footer |
| `privacy.html` | Privacy Policy with contact box |
| `terms.html` | Terms of Service with contact box |
| `styles.css` | Shared dark-theme stylesheet |
| `script.js` | `toggleBilling()` global function + smooth scroll + waitlist stub |

---

## Pricing Model (5 tiers)

| Plan | Countries | Monthly | Annual (per mo) | Badge |
|------|-----------|---------|-----------------|-------|
| Free | 3 | $0 | $0 | — |
| Essential | 8 | $12 | $10 | — |
| Professional | 25 | $39 | $31 | MOST POPULAR |
| Intelligence | 194+ | $99 | $79 | GLOBAL COVERAGE |
| Enterprise | Unlimited | Custom | Custom | — |

Annual plans save 20% vs monthly. Toggle in `index.html` driven by `toggleBilling()` in `script.js`.
Annual price shown per-month; billed as a single annual charge.

---

## Brand Colors

| Token | Hex | Use |
|-------|-----|-----|
| Background | `#07101f` | Page background |
| Surface | `#0d1b30` | Card backgrounds |
| Teal (primary) | `#0ea5e9` | Accent, nav brand, teal plans |
| Purple | `#a855f7` | Intelligence plan accent |
| Green | `#22c55e` | "SAVE 20%" badge, success states |
| Amber | `#f59e0b` | Warning labels (placeholder emails) |
| Text | `#e2e8f0` | Body text |
| Text dim | `#64748b` | Secondary / muted text |
| Border | `#1a2d45` | Card and divider borders |

---

## Contact Emails

All four addresses must be configured on the `stratlens.site` domain before launch.

| Address | Purpose |
|---------|---------|
| `info@stratlens.site` | General enquiries, Enterprise "Contact Us" button |
| `support@stratlens.site` | User support, footer link |
| `legal@stratlens.site` | Terms of Service contact |
| `privacy@stratlens.site` | Privacy Policy contact, GDPR/DSAR requests |

> **⚠️ Placeholder warning** — every email address in these files is marked with an HTML comment:
> `<!-- <address> — PLACEHOLDER: must be configured before launch -->`
> Search for `PLACEHOLDER` across all `.html` files before going live.

---

## Domain

All internal references use `stratlens.site` (not `stratlens.io`):

- `<link rel="canonical">` on every page
- `<meta property="og:url">` and `og:image` base URL
- Footer brand link and copyright line
- All `mailto:` hrefs

---

## Pre-Launch Checklist

### DNS & Infrastructure
- [ ] Domain `stratlens.site` registered and DNS configured
- [ ] SSL certificate provisioned (HTTPS enforced)
- [ ] `www.stratlens.site` → `stratlens.site` redirect active
- [ ] CDN or static host set up (Netlify / Vercel / Cloudflare Pages)
- [ ] `og-image.png` (1200×630) uploaded to root of domain

### Email
- [ ] `info@stratlens.site` — configured and test email sent/received
- [ ] `support@stratlens.site` — configured and test email sent/received
- [ ] `legal@stratlens.site` — configured and test email sent/received
- [ ] `privacy@stratlens.site` — configured and test email sent/received
- [ ] Search all `.html` files for `PLACEHOLDER` and remove warning comments

### Payment Processing
- [ ] Payment processor (Stripe / LemonSqueezy / etc.) account created
- [ ] Webhook endpoints for subscription events wired to backend
- [ ] Monthly and Annual products created for Essential, Professional, Intelligence tiers
- [ ] Enterprise "Contact Us" flow connected to `info@stratlens.site`
- [ ] Test purchases completed in sandbox mode
- [ ] Refund policy documented and support tooling in place

### Legal
- [ ] Privacy Policy reviewed by qualified counsel
- [ ] Terms of Service reviewed by qualified counsel
- [ ] Governing law jurisdiction filled in (Terms §10)
- [ ] Cookie consent banner implemented if targeting EU users (GDPR)
- [ ] Waitlist form has a link to Privacy Policy at submission

### App Store / Backend
- [ ] Backend `.env` configured on production server
- [ ] Supabase project on production plan
- [ ] Anthropic API key rate limits reviewed
- [ ] App Store and Google Play listings reflect 5-tier pricing
- [ ] Push notification certificates / keys configured

---

## Billing Toggle

The Monthly/Annual toggle is implemented as a pure-JS function in `script.js`:

```js
// called by the toggle button in index.html
function toggleBilling()
```

It reads `data-monthly` and `data-annual` attributes from every `.price-val` element and
swaps the displayed value. No inline `<script>` blocks exist in any HTML file — all JS
lives in `script.js`.

---

## Tagline

> **INTELLIGENCE · PERSPECTIVE · ADVANTAGE**
