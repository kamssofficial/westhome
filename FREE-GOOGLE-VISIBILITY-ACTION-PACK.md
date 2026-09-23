# WESTHOME — Free Google visibility action pack

Everything automatable has been done. What's left needs **your browser login** —
click-by-click below. Total time: ~45 min. Cost: ₹0.

> **Superseded (2026-09-22):** Vercel is retired — the store runs on free managed
> hosting, so the "send the Vercel appeal" section below no longer applies and is kept
> only as history. Everything else in this document (Search Console, Merchant Center,
> Business Profile) still applies.

## Already done (by Buffy)

- ✅ SEO commit `b9d15c1` (www-canonical fix + `/products.xml` Merchant Center feed) — on GitHub
- ✅ Image compression commit `7e40a5a`: **public/ 43.4 MB → 14.8 MB (66% smaller)**, same
  filenames, no code/DB changes
- ✅ 10 top product URLs verified live (for Request Indexing below)
- ✅ Both commits sit in `/tmp/westhome-deploy`, ready to `vercel deploy --prod`
  the moment Vercel unblocks the team

---

## 1. Send the Vercel appeal (5 min) — free, no upgrade needed

Go to **vercel.com/help** (sign in as `salmansahil`) → submit:

> Subject: Fair-use block — root cause fixed, requesting review
>
> Hi team,
>
> Our team (kamss/westhome, project `westhome`) was blocked for exceeding fair-use
> limits. The dominant driver was unoptimized static images — we've recompressed the
> entire `public/` directory (43.4 MB → 14.8 MB, −66%) with identical filenames, so
> per-request bandwidth drops by roughly two-thirds going forward.
>
> The site is a small home-goods store in India; traffic is modest and this fix
> addresses the underlying usage permanently. Could you please review and lift the
> block? We'd also appreciate confirmation of which resource triggered the limit.
>
> Thank you!

Also check **vercel.com → Settings → Usage** to see what actually spiked (bandwidth
vs function hours) and mention it if it's obvious. Blocks are routinely lifted for
free once the cause is addressed — no payment required.

## 2. Google Search Console (10 min) — do this regardless of Vercel

1. **search.google.com/search-console** → Add property → **Domain** → `westhome.in`
2. Verify via **DNS TXT**: GoDaddy → My Products → DNS → TXT record, host `@`,
   paste the value Google shows. Wait for verification.
3. **Sitemaps** → submit: `https://www.westhome.in/sitemap.xml`
4. **URL Inspection** (top bar) → paste each URL below → **Request Indexing**:

```
https://www.westhome.in/products/ivory-tone-on-tone-quilted-comforter-set
https://www.westhome.in/products/ivory-carved-swirl-area-rug-6x4fts
https://www.westhome.in/products/blue-gray-distressed-art-rug
https://www.westhome.in/products/white-elegant-wall-clock-living-room
https://www.westhome.in/products/charcoal-grey-velvet-cushion-cover
https://www.westhome.in/products/bronze-pleated-satin-cushion-cover
https://www.westhome.in/products/framed-gold-textured-circle-art-8080-cm
```

## 3. Bing Webmaster Tools (5 min) — free bonus index

**bing.com/webmasters** → Import from Google Search Console (one click after step 2)
→ submit the same sitemap. Bing powers Yahoo/DuckDuckGo too.

## 4. Google Merchant Center (20 min) — the "Popular products" carousel

Only works after the deploy (feed URL lives in `b9d15c1`). When Vercel is unblocked:

1. I deploy (`vercel deploy --prod` from `/tmp/westhome-deploy`) — verify
   `https://www.westhome.in/products.xml` returns XML
2. **merchants.google.com** → Business info: India / INR / "WEST HOME by BM Distributors"
3. Website: `https://www.westhome.in` → Verify via Search Console (one click)
4. Products → Feeds → **+** → Country `India`, currency `INR`, **Daily fetch 03:00 IST**,
   URL `https://www.westhome.in/products.xml`, format XML
5. Free listings activate after feed approval — that's the carousel in the screenshot

## 5. Google Business Profile (10 min) — "near me" searches

**business.google.com** → claim both showrooms (Kasaragod + Mangalore), category
**Home goods store**, website `https://www.westhome.in`, then collect reviews.

---

## Timeline after everything is submitted

| Milestone | When |
|---|---|
| Vercel unblock → feed live | 1–3 days after appeal |
| Shopping/free listings approved | 3–7 days |
| Product pages in web index | 1–3 weeks |
| Product-type rankings ("wall clock Mangalore") | 1–2 months |

## Cleanup note

`/tmp/westhome-deploy` is a git worktree of the main repo (not a copy). The two new
commits (`7e40a5a` images, this doc) exist only there until pushed. After deploy,
remove it with: `git -C D:/FREEBUFF/Projects/westhome worktree remove /tmp/westhome-deploy`
