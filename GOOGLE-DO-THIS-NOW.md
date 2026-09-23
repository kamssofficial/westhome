# WESTHOME — Google setup, final handoff (westhomebybmd@gmail.com)

> **DONE ✅ Domain verified** — the `google-site-verification=HFTM…bzdE` TXT
> record is live in the GoDaddy zone and the **Domain property `westhome.in`**
> is verified in Search Console. (Domain is the strongest property type: it
> covers `www.westhome.in`, the apex, and every subdomain.)
>
> Website side is also fully done and live: robots.txt allows product-image
> crawling, sitemap lists 278 product URLs, Merchant feed serves 292 items,
> all structured data validated.

**Only these three steps remain (~12 minutes):**

> **Progress 2026-09-21**
> - ✅ Sitemap submitted — "Success", **303 pages discovered**
> - ✅ Request indexing 2/10: `antique-gold-standing-clock`, `woven-wave-rug-64fts`
>   (retry succeeded, confirmed in the priority crawl queue)
> - ⏳ Remaining 8 requests — do them in a fresh session (list in step 2)
> - ⏳ Merchant Center blocked on "doesn't have access to any Merchant Center
>   account" — see step 3 for the fix

---

## 1. Submit the sitemap (2 minutes)

1. https://search.google.com/search-console → select the **westhome.in** property
2. Left menu → **Sitemaps** → type `sitemap.xml` → **Submit**
   (expect "Success" and 300+ URLs discovered)

## 2. Request indexing on the top 10 products (5 minutes)

GSC → top bar **URL Inspection** → paste each URL → **Request Indexing**.
Google caps these per day for new properties; if it refuses, finish the rest
the next morning. **Done:** antique-gold-standing-clock, woven-wave-rug-64fts.
**Still to submit (8):**

```
https://www.westhome.in/products/sculpted-wave-off-white-carpet-64fts
https://www.westhome.in/products/teal-velvet-cushion-cover
https://www.westhome.in/products/mocha-leaf-embossed-comforter-set
https://www.westhome.in/products/black-bubble-table-lamp
https://www.westhome.in/products/dark-open-weave-decorative-basket
https://www.westhome.in/products/luminous-verticality-framed-art-120150cm
https://www.westhome.in/products/green-olive-ceramic-soap-dispenser-set
https://www.westhome.in/products/velvet-terrain-black-wall-art-80120cm
```

## 3. Merchant Center + product feed (5 minutes)

**If you see "your current account doesn't have access to any Merchant Center
account"**, the signup stalled halfway (it tried to join an existing account
that doesn't exist). Fix — in this order:

1. Open an **incognito window**, sign in only with **westhomebybmd@gmail.com**
2. Go straight to **https://merchants.google.com/onboarding** (not the
   dashboard URL) and pick **Create a new account** if offered
3. **Complete every step in one sitting** — the account is only provisioned
   after the last screen:
   - Business info: "WEST HOME by BM Distributors", India, INR
   - Website: `https://www.westhome.in` → Verify via Search Console → Claim
   - **Shipping**: free over ₹999, flat ₹49 below (matches the site)
   - **Returns policy**: as per the store policy page
4. If the error persists after that, it is usually new-account propagation —
   wait 24 h and retry the same onboarding URL before contacting support

Once created: Products → Feeds → **+** →
- Country `India`, currency `INR`, name `westhome-products`
- Schedule: **Daily fetch**, 3:00 AM IST
- URL: `https://www.westhome.in/products.xml`
- Format: XML

After the first fetch, check **Diagnostics** — GTIN warnings are safe to
ignore (feed declares `identifier_exists=no`).

## 4. Product images — nothing to do ✅

All 292 feed items verified healthy (re-verified live; the one carpet image
that briefly 404'd was a transient Drive hiccup cleared by the proxy's
negative cache — the file is alive and serves a 100 KB WebP again).
If Merchant Center ever flags a specific image later, re-upload just that
photo via Admin → Products.

---

## What happens next

| Milestone | Timeline |
|---|---|
| Feed fetched + approved | 1–3 days |
| Products in Google Shopping (free listings) | 3–7 days |
| Requested pages indexed | days–2 weeks |
| Full catalog indexed via sitemap | 1–3 weeks |
| Ranking for product-type searches | 1–2 months |
