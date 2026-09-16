# WESTHOME — Google Shopping & Search Console setup (do this after deploy)

Everything below is click-by-click and cannot be done from code. Budget ~45 minutes
total, then let Google work (feed approval: days; product indexing: 1–3 weeks).

Feed URL to use everywhere: **https://www.westhome.in/products.xml**
Sitemap URL to use everywhere: **https://www.westhome.in/sitemap.xml**

---

## 1. Google Search Console (10 min)

1. Go to https://search.google.com/search-console and sign in with the business Google account.
2. Add property → **Domain** → enter `westhome.in` → verify via **DNS TXT record** (GoDaddy:
   DNS zone → TXT record → host `@`, paste the value Google shows). Wait for verification
   (usually minutes; can take up to 48h).
3. Once verified: **Sitemaps** → enter `sitemap.xml` → Submit.
4. **URL Inspection** (top bar): paste 10 product URLs (top sellers first) → "Request Indexing"
   for each. This is the fastest way to get product pages crawled.
5. After 1 week, check **Indexing → Pages** — the "Duplicate without user-selected canonical"
   and "Canonical URL points to a redirect" counts should drop to ~0.

## 2. Google Merchant Center (20 min)

1. Go to https://merchants.google.com → sign in with the same business account.
2. Business info: country **India**, currency **INR**; store name
   "WEST HOME by BM Distributors"; support phone +91 98950 71144.
3. **Verify & claim the website** (Settings → Business info → Website):
   enter `https://www.westhome.in` and choose **Verify via Search Console** (one click,
   since step 1 is done). Claim it.
4. **Create the product feed**: Products → Feeds → **+** →
   - Country of sale: `India`, Currency: `INR`
   - Name: `westhome-products`, Schedule: **Daily fetch**, 3:00 AM IST
   - URL: `https://www.westhome.in/products.xml`
   - File format: XML
5. After the first fetch, open **Diagnostics** and fix any item issues. Common ones:
   - *Missing recommended attribute* (GTIN): safe to ignore — the feed declares
     `identifier_exists=no` since these are unbranded curated goods.
   - *Image quality*: replace the flagged product photos in the admin panel.
   - *Price mismatch*: means a `salePrice` changed after the last fetch — self-corrects
     on the next daily fetch.
6. **Free listings** (Shopping tab, no cost) activate automatically once the feed is
   approved. Optional later: run Performance Max / Shopping campaigns on the same feed.

## 3. Google Business Profile (10 min, highest local ROI)

1. https://business.google.com → create/claim a profile for each showroom:
   - **Kasaragod**: Citygate Building, Press Club Junction, Chandragiri
   - **Mangalore**: 1st Floor, Kankanady Gate Building, Kankanady
2. Category: **Home goods store** (primary) + Gift shop / Interior decorator (secondary).
3. Website field: `https://www.westhome.in`; add products with photos from the site.
4. Ask every happy showroom customer for a Google review (the checkout flow already
   shows a review QR). 10+ real reviews is the single biggest lever for
   "home decor near me" searches.

## 4. What to expect, and when

| Milestone | Timeline |
|---|---|
| Feed fetched + approved | 1–3 days |
| Products visible in Google Shopping (free listings) | 3–7 days |
| Product pages in web index (after GSC submission) | 1–3 weeks |
| Ranking for product-type searches ("wall clock Mangalore") | 1–2 months |
| Ranking for competitive generic terms | 3–6 months, review-driven |

## 5. Ongoing (5 min/week)

- Add new products to the admin panel — they flow into `sitemap.xml`, `products.xml`
  and JSON-LD automatically.
- Watch Merchant Center **Diagnostics** weekly for the first month.
- One blog post per month (src/lib/blog.ts follows the existing pattern) targeting a
  specific buyer search.
