# WESTHOME.IN — Re-Audit (Post-Deployment) — Sep 6, 2026

Method: live production probing (curl, HTTP status, HTML/JSON-LD extraction) + DuckDuckGo web research
(freeunlimited-websearch) + repo source review. All checks against **https://www.westhome.in** (live, production).

---

## ✅ FIXED — confirmed LIVE on production (was broken in the first audit)

| # | Issue (first audit) | Now (verified live) | Evidence |
|---|---|---|---|
| 1 | `robots.txt` → **404** | **HTTP 200**, proper rules | Allows all, disallows /admin /staff /api/ /account /cart /checkout /login; `Sitemap: https://www.westhome.in/sitemap.xml` |
| 2 | `sitemap.xml` → **404** | **HTTP 200**, valid XML urlset | **198 URLs**: 179 products, 8 collections, 11 static pages |
| 3 | No JSON-LD anywhere | **Store schema on every page** (name, Kasaragod address, phone, hours) | Homepage: `{"@type":"Store"}` verified |
| 3b | — | **Product schema** on all 179 product pages | `Gray Crosshatch Distressed Rug` → price 999 INR, `InStock` |
| 3c | — | **Blog + BlogPosting schema** | Blog list: `{"@type":"Blog"}`; all 4 articles: `BlogPosting` + H1 content |
| 4 | Images = **3,075,535-byte PNGs** (3 MB @3840px) | **Optimized AVIF/WebP** via Next.js optimizer | 1080px AVIF = **107 KB (−96.5%)**, WebP = 210 KB. Magic bytes `ftypavif`/`WEBP` confirmed. 107 `/_next/image` URLs on product page |
| 5 | No blog/content | **Blog live**: /blog + 4 SEO articles, linked in footer | All 4 article routes HTTP 200 with real H1 content |
| 6 | Razorpay build failure | Fixed (lazy init) | Production deploy builds cleanly |

## 🟡 STILL OPEN (after deployment)

1. **Google has not indexed the site at all.** `site:westhome.in` → zero results.
   → Action: submit the new sitemap in **Google Search Console** (domain property for westhome.in).
   Indexing takes days-to-weeks regardless; nothing else can be done from code.
2. **Blog URLs missing from sitemap.xml.** Sitemap has products + static pages but no `/blog/*` entries (4 articles).
   One-line fix in `src/app/sitemap.ts`.
3. **No `<link rel="canonical">` and no `og:url` anywhere.** Pages never emit them (Next.js doesn't auto-add
   from `metadataBase`). Matters for duplicate-content signals (www vs bare domain, query params).
   → Add `alternates: { canonical }` / `openGraph.url` per page.
4. **Search presence ≈ zero for the brand name.** Brand queries surface *other* Westhome businesses
   (westhomepmc.com property mgmt, staging companies, Instagram accounts). Expected for an unindexed site — will
   only change after Google crawls + weeks of ranking.
5. **No third-party reviews.** Only self-published testimonials. The Google-review CTA + QR is now in checkout,
   but no real reviews exist yet — needs actual customers.

## 🟢 VERIFIED STILL GOOD

- Security headers: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` ✓
- Homepage `<title>` / meta description correct; Store JSON-LD on every page ✓
- All core routes HTTP 200; homepage HTML ~116 KB ✓
- metadataBase now defaults to `https://www.westhome.in` (was `http://localhost:57583`) — defensive fix confirmed
  deployed; no localhost leakage in any meta tag ✓
- Local "home decor Kasaragod" searches surface competitors (plumint, Justdial, Empire Furniture, studio GKW) —
  westhome.in absent from that SERP (unindexed, expected)

---## Bottom line

Every **red** item from the first audit is now fixed and verified live. The remaining work is:
(a) 1-line code fix (blog in sitemap), (b) add canonical/og:url, and (c) **submit the sitemap to Google Search
Console** — the single most important step now, since the site has zero indexation and indexing takes weeks to
compound.

---

# WESTHOME.IN — Google Shopping visibility audit — Sep 16, 2026

Goal: products showing in Google when shoppers search for similar products.

## What changed since Sep 6 (verified live)

- **Google has indexed the site**: homepage, /search, /about, /cart, collections, policies all surface for
  `site:westhome.in`. But **almost no /products/* pages are indexed** — one product + one junk parameterised URL
  (`/?add-to-wishlist=11918`) were the only product-ish results.
- **Deployment gap confirmed**: the repo's canonical/og:url code was never shipped. Live product pages emit
  **no canonical, no og:url, and no Product JSON-LD** (only the default Store schema). All code fixes from the
  first audit remain **undeployed on production**.
- **Host mismatch found**: production serves and indexes `https://www.westhome.in` (bare `westhome.in` → 308 →
  www), but every in-repo URL (sitemap loc, robots sitemap line, JSON-LD @id/url, merchant feed host, layout
  metadataBase) pointed at the **bare** domain — i.e. canonicals that canonicalize to a redirect.
- No Google Merchant Center feed existed; nothing supplies Google Shopping / "similar products" carousels.

## Code changes this session (all typechecked; webpack build green; 31/31 tests pass)

1. **`products.xml` feed route (new)** — `src/app/products.xml/route.ts`: Google Merchant Center RSS 2.0 feed
   with all required attributes (`id/title/description/link/image_link/price/availability/brand/condition`),
   sale prices, MPN, `item_group_id` for variants (one item per variant with variant price/images),
   `product_type` (Category > Subcategory), `google_product_category`, up to 10 additional images, XML-safe
   escaping, and the same isActive/stock/sale-price rules the storefront uses. Served outside `/api/` because
   robots.ts disallows `/api/`.
2. **Host alignment to www** — `layout.tsx` SITE_URL/metadataBase, `robots.ts`, `sitemap.ts`, product-page
   JSON-LD @id/offer url, Store JSON-LD @id/url, Blog JSON-LD URLs (blog pages still use bare-domain literals —
   harmless but worth sweeping next), all now use `https://www.westhome.in`.

## Undeployed — shipping these changes is the actual blocker

Nothing here helps until this repo is deployed to production (Vercel or the GoDaddy standalone path in
DEPLOY-GODADDY.md). `git status` also shows unrelated pre-existing modifications (prisma seed, scripts, public
assets) — leave those to the owner or commit separately.

## Manual steps after deploy (cannot be done from code)

1. **Google Search Console** (domain property `westhome.in`): submit `https://www.westhome.in/sitemap.xml`;
   URL-inspect ~10 key product URLs and request indexing; watch the Pages report for the canonical/redirect
   issue disappearing.
2. **Google Merchant Center**: create account → verify/claim `westhome.in` (can auto-verify via the same
   Search Console) → create feed *Country of sale: India, Currency: INR* → scheduled fetch **daily** of
   `https://www.westhome.in/products.xml` → fix any item diagnostics → free listings start serving in days.
3. **Google Business Profile**: claim/verify for both showrooms (Kasaragod + Mangalore), add
   `westhome.in` as the website, push real customer reviews (local intent searches currently surface
   competitors only).
4. Optional: Merchant Center free listings get product into Shopping tab; paid PMax/Shopping campaigns can
   reuse the same feed later.
