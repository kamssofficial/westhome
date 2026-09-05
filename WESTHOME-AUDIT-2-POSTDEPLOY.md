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

---

## Bottom line
Every **red** item from the first audit is now fixed and verified live. The remaining work is:
(a) 1-line code fix (blog in sitemap), (b) add canonical/og:url, and (c) **submit the sitemap to Google Search
Console** — the single most important step now, since the site has zero indexation and indexing takes weeks to
compound.
