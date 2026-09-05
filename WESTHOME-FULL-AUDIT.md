# WESTHOME.in — Full Audit Report

*Audited: Sept 6, 2026 — live site probing + DuckDuckGo research + full codebase review of the private repo (`salmansahil2005/westhome`)*

---

## 1. TECHNICAL / SEO — LIVE SITE

### 🔴 Critical
| Issue | Evidence | Fix |
|---|---|---|
| **No `robots.txt`** | `https://www.westhome.in/robots.txt` → **HTTP 404** | ✅ Fix written (`src/app/robots.ts`), not yet deployed |
| **No `sitemap.xml`** | `https://www.westhome.in/sitemap.xml` → **HTTP 404** — Google cannot discover most of the 178 products | ✅ Fix written (`src/app/sitemap.ts`), not yet deployed |
| **No structured data (JSON-LD)** | Zero `application/ld+json` on homepage or product pages — no rich results, no local-business schema | ✅ Fix written (Store + Product schema), not yet deployed |
| **Product images are 3 MB+ PNGs** | Product image `1787828554930-pb0t99.png?w=3840` → **3,075,535 bytes**, served at 3840px, no WebP/AVIF conversion. A product page with 4 images ≈ **12 MB** — 10-30s load on Indian mobile data | Custom image loader (`src/lib/imageLoader.ts`) only appends `?w=`, Vercel Blob ignores it. Needs real optimization |

### 🟡 Moderate
| Issue | Evidence | Fix |
|---|---|---|
| **No blog / content** | No `/blog` route; zero informational content | Add blog (informational keywords like "home decor ideas Kerala") |
| **Metadata fallback to localhost** | `layout.tsx` used `metadataBase: http://localhost:57583` fallback — canonical/OG URLs could point at localhost if `NEXTAUTH_URL` unset at build | ✅ Fixed in repo |
| **Search presence ≈ zero** | DDG searches for brand return mostly *other* "Westhome" companies (property mgmt, electrical mfr) | Build authority: reviews, social, local citations |

### 🟢 Good (verified)
- **Security headers strong**: HSTS (`max-age=63072000`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, strict Referrer-Policy, Permissions-Policy ✅
- **HTTPS + canonical redirect** (`westhome.in` → `www`) ✅
- **Per-page metadata exists**: `generateMetadata` on product + collection pages, unique titles, OG tags with image alt ✅
- **Alt text near-perfect**: 20/21 `<Image>` components have alt (only admin-only HeroManager missing) ✅
- **All key routes return 200**: `/products/*`, `/collections/*`, `/shop/all` ✅
- **Page weight reasonable**: homepage ~112 KB HTML (images excluded) ✅

---

## 2. WEB PRESENCE & BRAND

### Findings
- **Facebook page exists**: "West home by BM Distributors, Kasaragod" — **56 likes**, low engagement (`facebook.com/westhomebybmdistributors`)
- **No Instagram/Twitter/LinkedIn found** for the *decor* brand
- **No third-party reviews**: Trustpilot / Google business / Amazon-style reviews do NOT surface for `westhomebybmd.com` — the only reviews are the 5 self-published testimonials on the site
- **Brand-confusion risk (low)**: `thewesthome.in` (a different "WESTHOME" store) does **not resolve** — dead domain, so not a live threat. But `westhomepmc.com` (property management) and `westhomesele.com` (electrical) dominate name searches
- **Competitive gap**: "home decor Kasaragod" searches return Urban Ladder, Home Centre, HomeGoods, local interior firms — westhome.in ranks nowhere yet

### Actions
1. **Verify + claim the Google Business Profile** for the Kasaragod store (local SEO — highest ROI for a physical store)
2. Grow the Facebook page (56 likes is below trust threshold); post product content weekly
3. Push customers to leave **Google reviews** — the site already shows "5.0 Verified Google Reviews" but only 5 testimonial quotes are displayed
4. Add the site URL to every social profile

---

## 3. CODEBASE AUDIT (private repo)

### Architecture (good)
- Next.js 15/16 (Turbopack), Prisma 7 + Postgres, Supabase auth, Razorpay payments, Vercel Blob images
- 55 pages, admin dashboard with analytics, role-based auth, coupons, inventory
- TypeScript: **zero errors** project-wide; production build passes (after the Razorpay fix below)

### Bugs found & fixed this session
1. **`api/payment/create` crashed the build** — Razorpay constructed at module load with empty keys → SDK throws at import. **Fixed**: lazy init + clean 503 when keys missing
2. **`metadataBase` localhost fallback** — **Fixed**

### Remaining issues
| Area | Issue |
|---|---|
| **Image pipeline** | Custom loader disables Next's optimizer entirely — no WebP/AVIF, no compression, no responsive sizes beyond `?w=`. Fix: use `next/image` optimizer with Vercel Blob (remove custom loader) or migrate to Cloudinary/Imgix |
| **`pnpm-workspace.yaml`** | New file needed for pnpm 11 build-script approval (Prisma engines) — keep it |
| **Deprecation warnings** | `middleware` convention → migrate to `proxy` (Next 16); custom Cache-Control on `/_next/static` warning |
| **GitHub pages** | Site deploys from `gh` but repo has no CI status/README badges — minor |

---

## 4. PRIORITIZED ACTION LIST

### Deploy now (already written, ready to commit)
1. ✅ **robots.txt + sitemap.xml** — fixes 404s, unlocks product indexing
2. ✅ **JSON-LD**: Store schema (homepage) + Product schema (all 178 product pages) — rich results + local SEO
3. ✅ **metadataBase fix** — protects canonical URLs
4. ✅ **Razorpay build fix** — unblocks CI/production builds

### This week
5. **Image optimization** (biggest performance win): convert 3 MB PNGs → compressed WebP/AVIF, serve 800px for cards / 1600px for zoom
6. **Google Business Profile** claim + reviews push
7. **Blog**: 4-6 SEO articles ("wall decor ideas for Indian homes", "Kasaragod home styling")
8. Facebook page growth (posts → site traffic)

### This month
9. Email capture (newsletter) on exit intent
10. Schema markup for **reviews** (aggregate rating from real Google reviews)
11. Consider Instagram Shopping integration (visual product — high fit)