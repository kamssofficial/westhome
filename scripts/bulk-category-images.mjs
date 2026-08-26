#!/usr/bin/env node
/**
 * Bulk Category Image Upload Script
 *
 * Uploads images to categories via the westhome admin API.
 *
 * Usage:
 *   node scripts/bulk-category-images.mjs                          # use default config
 *   node scripts/bulk-category-images.mjs --config my-config.json  # use custom config
 *   node scripts/bulk-category-images.mjs --dry-run                # preview without uploading
 *
 * Config format (JSON):
 * {
 *   "baseUrl": "http://localhost:57583",
 *   "cookie": "your-session-cookie-here",
 *   "images": [
 *     { "category": "Wall Decor", "image": "/collections/frames/some-image.png" },
 *     { "category": "Laundry",    "image": "/collections/basket/some-basket.png" },
 *     { "category": "slug-or-name", "image": "/path/to/image.png" }
 *   ]
 * }
 *
 * The "category" field can be either the category name or slug.
 * Images must be publicly accessible paths (under /public) or full URLs.
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const configIdx = args.indexOf("--config");
const configFile =
  configIdx !== -1 ? args[configIdx + 1] : "scripts/category-images.json";

const configPath = resolve(configFile);

if (!existsSync(configPath)) {
  console.error(`❌ Config file not found: ${configPath}`);
  console.error(
    "\nCreate one with this format:\n" +
      JSON.stringify(
        {
          baseUrl: "http://localhost:57583",
          cookie: "your-session-cookie",
          images: [
            { category: "Wall Decor", image: "/collections/frames/image.png" },
          ],
        },
        null,
        2
      )
  );
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf-8"));
const { baseUrl, cookie, images } = config;

if (!cookie) {
  console.error("❌ Missing 'cookie' in config. Get it from browser dev tools → Application → Cookies.");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Cookie: cookie,
};

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, { headers, ...options });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

async function main() {
  console.log("📂 Bulk Category Image Upload");
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Images: ${images.length}`);
  if (dryRun) console.log("   ⚠️  DRY RUN — no changes will be made\n");

  // 1. Fetch all categories
  const { categories } = await fetchJSON(`${baseUrl}/api/categories`);
  const catMap = new Map();
  for (const cat of categories) {
    catMap.set(cat.name.toLowerCase(), cat);
    catMap.set(cat.slug.toLowerCase(), cat);
  }

  // 2. Process each image
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of images) {
    const key = entry.category.toLowerCase();
    const category = catMap.get(key);

    if (!category) {
      console.log(`   ⚠️  Category not found: "${entry.category}" — skipping`);
      skipped++;
      continue;
    }

    const existingPrimary = category.images?.find((i) => i.isPrimary);
    if (existingPrimary?.url === entry.image) {
      console.log(`   ⏭️  ${category.name} — already has this image, skipping`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`   📋 ${category.name} → ${entry.image}`);
      success++;
      continue;
    }

    try {
      // Delete existing primary image if any
      if (existingPrimary) {
        await fetchJSON(
          `${baseUrl}/api/categories/${category.id}/images/${existingPrimary.id}`,
          { method: "DELETE" }
        );
      }

      // Create new CategoryImage
      await fetchJSON(`${baseUrl}/api/categories/${category.id}/images`, {
        method: "POST",
        body: JSON.stringify({
          url: entry.image,
          alt: entry.alt || category.name,
          isPrimary: true,
        }),
      });

      // Update legacy image field
      await fetchJSON(`${baseUrl}/api/categories/${category.id}`, {
        method: "PUT",
        body: JSON.stringify({ image: entry.image }),
      });

      console.log(`   ✅ ${category.name} → ${entry.image}`);
      success++;
    } catch (err) {
      console.error(`   ❌ ${category.name} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${success} success, ${failed} failed, ${skipped} skipped`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
