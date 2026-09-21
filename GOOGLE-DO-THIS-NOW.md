# WESTHOME — Google setup, final handoff (westhomebybmd@gmail.com)

Everything on the website side is **done and live** (robots.txt allows product
images, sitemap 278 URLs, Merchant feed 292 items, JSON-LD validated,
verification meta support shipped). Only the steps below remain — each needs
your Google login, ~15 minutes total. Do them **in this order**.

---

## Step 0 — Send me your verification token (1 minute) ✋

1. Sign in at https://search.google.com/search-console with **westhomebybmd@gmail.com**
2. Add property → **URL prefix** → enter `https://www.westhome.in`
3. On the "Verify ownership" screen pick **HTML tag**
4. **Copy the token and paste it to me in chat.** It looks like:
   `google-site-verification=AbC123...xyz`

The code to serve it is already deployed — the moment you paste the token,
I set the env var, it auto-deploys, and your Verify button will go green.
(No GoDaddy access needed — the old TXT record in your DNS belongs to a
previous property and would otherwise block you.)

---

## Step 1 — Verify + submit the sitemap (2 minutes, after Step 0)

1. Back in GSC, click **Verify** (green ✓ now)
2. Left menu → **Sitemaps** → type `sitemap.xml` → **Submit**
   (expect "Success", 300+ URLs discovered)

## Step 2 — Request indexing on the top 10 products (5 minutes)

GSC → top bar **URL Inspection** → paste each URL below → **Request Indexing**
(covers 10 product types: clocks, rugs, carpets, cushions, comforters, lamps,
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

## Step 3 — Merchant Center (7 minutes)

1. https://merchants.google.com → same Google account
2. Business info: country **India**, currency **INR**, store
   "WEST HOME by BM Distributors", phone +91 98950 71144
3. Settings → Business info → Website: enter `https://www.westhome.in`
   → **Verify via Search Console** (one click — Step 1 done it) → **Claim**
4. Products → Feeds → **+**:
   - Country `India`, currency `INR`, name `westhome-products`
   - Schedule: **Daily fetch**, 3:00 AM IST
   - URL: `https://www.westhome.in/products.xml`
   - Format: XML
5. After the first fetch (minutes), check **Diagnostics** — GTIN warnings are
   safe to ignore (feed declares `identifier_exists=no`)

## Step 4 — One product image to re-upload (30 seconds)

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
