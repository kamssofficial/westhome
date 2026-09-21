#!/usr/bin/env node
/**
 * Pre-warm /api/images derivatives after a deploy.
 *
 * The image proxy transcodes each requested (image, width) pair on first hit;
 * with no edge cache in front of the origin (www CNAMEs straight to Render),
 * the first visitor pays the Drive fetch + sharp encode. This script walks the
 * catalogue and requests the standard display widths once, so real shoppers
 * get warm responses.
 *
 * Usage:
 *   node scripts/prewarm-images.mjs [--base https://www.westhome.in] [--widths 640,1080]
 *
 * Reads the same public API the storefront uses, so it needs no credentials.
 */

const DEFAULT_WIDTHS = [640, 1080];
// The origin (Render free tier) answers sustained bursts with 429; pacing and
// one polite retry after the advertised backoff keeps the run under that line.
const CONCURRENCY = 2;
const PACING_MS = 150;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const args = { base: "https://www.westhome.in", widths: DEFAULT_WIDTHS };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base") args.base = argv[++i];
    else if (argv[i] === "--widths") args.widths = argv[++i].split(",").map((w) => Number.parseInt(w, 10)).filter(Number.isFinite);
  }
  args.base = args.base.replace(/\/+$/, "");
  return args;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

async function pool(items, worker, concurrency) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

async function main() {
  const { base, widths } = parseArgs(process.argv.slice(2));
  console.log(`Pre-warming ${base} at widths ${widths.join(", ")}`);

  // Walk every product via the paginated lite endpoint (same envelope the
  // storefront cards render from).
  const urls = new Set();
  let page = 1;
  let fetched = 0;
  while (true) {
    const data = await fetchJson(`${base}/api/products?lite=true&page=${page}&limit=100`);
    const products = data.products || [];
    fetched += products.length;
    for (const p of products) {
      for (const img of p.images || []) {
        if (!img.url) continue;
        // resolveProductImage maps legacy drive ids to committed local assets;
        // warming the /api/images path for a drive id is still correct — the
        // proxy is what serves those ids today.
        if (!img.url.startsWith("/api/images/") && !img.url.startsWith("https://lh3.googleusercontent.com/d/")) continue;
        const proxyPath = img.url.startsWith("/api/images/")
          ? img.url
          : `/api/images/${img.url.split("/d/")[1]}`;
        for (const w of widths) urls.add(`${base}${proxyPath}?w=${w}`);
      }
    }
    if (products.length < 100) break;
    page++;
  }
  console.log(`${fetched} products, ${urls.size} image URLs to warm`);

  const t0 = Date.now();
  let ok = 0;
  let failed = 0;
  const allUrls = [...urls];
  await pool(allUrls, async (url) => {
    try {
      let res = await fetch(url, { headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" } });
      if (res.status === 429) {
        // One retry after the advertised (or default) backoff, then give up —
        // a failed warm must never turn into a hammering loop.
        const after = Number.parseInt(res.headers.get("retry-after") || "0", 10) * 1000 || 2000;
        await sleep(after);
        res = await fetch(url, { headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" } });
      }
      if (res.ok) {
        ok++;
        // Consume the body so the connection returns to the pool.
        await res.arrayBuffer();
      } else {
        failed++;
        console.warn(`  ${res.status} ${url.slice(base.length)}`);
      }
    } catch (err) {
      failed++;
      console.warn(`  ERR ${url.slice(base.length)}: ${err.message}`);
    }
    await sleep(PACING_MS);
  }, CONCURRENCY);

  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)}s: ${ok} warmed, ${failed} failed`);
  // A few 429s from the origin's burst protection are normal on the free tier;
  // the run only counts as failed if a large fraction never warmed.
  process.exit(ok < urls.size * 0.8 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
