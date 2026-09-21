# WESTHOME — Google setup, final handoff (westhomebybmd@gmail.com)

> **DONE ✅ Domain verified** — the `google-site-verification=HFTM…bzdE` TXT
> record is live in the GoDaddy zone and the **Domain property `westhome.in`**
> is verified in Search Console. (Domain is the strongest property type: it
> covers `www.westhome.in`, the apex, and every subdomain.)
>
> Website side is also fully done and live: robots.txt allows product-image
> crawling, sitemap lists 278 product URLs, Merchant feed serves 292 items,
> all structured data validated.

**Only these four clicks remain (~12 minutes):**

---

## 1. Submit the sitemap (2 minutes)

1. https://search.google.com/search-console → select the **westhome.in** property
2. Left menu → **Sitemaps** → type `sitemap.xml` → **Submit**
   (expect "Success" and 300+ URLs discovered)

## 2. Request indexing on the top 10 products (5 minutes)

GSC → top bar **URL Inspection** → paste each URL → **Request Indexing**
(one per product type: clocks, rugs, carpets, cushions, comforters, lamps,
baskets, frames, dispensers, wall art):

```
https://www.westhome.in/products/antique-gold-standing-clock
https://www.westhome.in/products/woven-wave-rug-64fts
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

1. https://merchants.google.com → same Google account
2. Business info: country **India**, currency **INR**, store
   "WEST HOME by BM Distributors", phone +91 98950 71144
3. Settings → Business info → Website: enter `https://www.westhome.in`
   → **Verify via Search Console** (one click — the Domain property makes this
   instant) → **Claim**
4. Products → Feeds → **+**:
   - Country `India`, currency `INR`, name `westhome-products`
   - Schedule: **Daily fetch**, 3:00 AM IST
   - URL: `https://www.westhome.in/products.xml`
   - Format: XML
5. After the first fetch (minutes), check **Diagnostics** — GTIN warnings are
   safe to ignore (feed declares `identifier_exists=no`)

## 4. One product image to re-upload (30 seconds)

Admin → Products → **"Elysian Greek Key Cut-Pile Carpet 6\*4fts"** →
re-upload its photo (the current one points at a deleted Drive file and 404s;
it will fail Merchant Center image review until replaced).

---

## What happens next

| Milestone | Timeline |
|---|---|
| Feed fetched + approved | 1–3 days |
| Products in Google Shopping (free listings) | 3–7 days |
| Requested pages indexed | days–2 weeks |
| Full catalog indexed via sitemap | 1–3 weeks |
| Ranking for product-type searches | 1–2 months |
