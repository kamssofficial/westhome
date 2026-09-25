import db from "@/lib/db";
import { resolveProductImage } from "@/lib/categoryImages";
import { memo, SEO_XML_TTL_MS, NS } from "@/lib/memoCache";

/**
 * Google Merchant Center product feed (free Shopping listings).
 *
 * Point Merchant Center at https://www.westhome.in/products.xml with a
 * scheduled fetch (daily). This is the direct lever for products appearing in
 * Google Shopping surfaces and "similar products" carousels — organic crawling
 * alone does not put catalog items there.
 *
 * Kept OUT of /api/ on purpose: robots.ts disallows /api/, and the Merchant
 * Center fetcher honours robots for URLs it is pointed at.
 *
 * Host must be the indexed www host — the bare domain only 308-redirects to it.
 *
 * Attribute decisions that matter for approval (verified against Google's
 * product data spec):
 * - price [price] is ALWAYS the full, non-sale price, and sale_price
 *   [sale_price] is only sent when it is strictly lower. Google disapproves an
 *   item whose sale price is not below its price, and the storefront only
 *   renders a strike-through original price when regular > sale.
 * - shipping [shipping] is item-level because the account has no shipping
 *   settings yet; without it, free listings cannot show a delivery cost.
 * - identifier_exists [identifier_exists] is deliberately NOT sent: these are
 *   store-brand goods that do have a brand and an MPN (the internal SKU), and
 *   Google's spec says to set "no" only when none of GTIN, MPN, or brand exist.
 */

const SITE_URL = "https://www.westhome.in";
const BRAND = "WEST HOME by BM Distributors";
const CURRENCY = "INR";
const SHIP_COUNTRY = "IN";

// Published shipping policy (https://www.westhome.in/policies/shipping):
// free above ₹999, flat ₹49 below; delivery in 3–7 business days.
const FREE_SHIPPING_THRESHOLD = 999;
const FLAT_SHIPPING_FEE = 49;
const MAX_HANDLING_DAYS = 1;
const MIN_TRANSIT_DAYS = 3;
const MAX_TRANSIT_DAYS = 7;

// Regenerated at most once an hour (ISR). Recomputing per request was costing
// a full catalog serialization on every fetch — multi-second responses on a
// small origin. Merchant Center fetches daily; one-hour freshness is ample.
export const revalidate = 3600;

function xmlEscape(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Merchant descriptions are plain text: strip tags, squash whitespace, cap length. */
function toPlainText(input: string | null | undefined, maxLen = 4500): string {
  if (!input) return "";
  const text = input
    .replace(/<[^>]*>/g, " ")
    // Strip control chars that are illegal in XML 1.0 even when escaped.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

/**
 * Merchant Center wants a real description per item. Catalogue rows with
 * neither a short nor a long description used to fall back to the bare product
 * name, which reads as a thin "Missing description" data-quality flag — so
 * synthesise one from the name plus its place in the catalogue.
 */
function feedDescription(
  name: string,
  shortDescription: string | null,
  description: string | null,
  categoryName?: string | null,
  subcategoryName?: string | null,
): string {
  const explicit = toPlainText(shortDescription || description);
  if (explicit) return explicit;

  const taxonomy = [categoryName, subcategoryName].filter(Boolean).join(" › ");
  const where = taxonomy ? ` — ${taxonomy} from the West Home collection` : "";
  return toPlainText(
    `${name}${where}. Premium home décor by WEST HOME, with free delivery across India on orders over ₹${FREE_SHIPPING_THRESHOLD}.`,
  );
}

function absoluteImage(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Item-level shipping, mirroring the published policy for the amount the
 * customer actually pays (sale price when one applies).
 */
function shippingLines(effectivePrice: number): string[] {
  const fee = effectivePrice > FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
  return [
    "      <g:shipping>",
    `        <g:country>${SHIP_COUNTRY}</g:country>`,
    "        <g:service>Standard</g:service>",
    `        <g:price>${fee.toFixed(2)} ${CURRENCY}</g:price>`,
    "        <g:min_handling_time>0</g:min_handling_time>",
    `        <g:max_handling_time>${MAX_HANDLING_DAYS}</g:max_handling_time>`,
    `        <g:min_transit_time>${MIN_TRANSIT_DAYS}</g:min_transit_time>`,
    `        <g:max_transit_time>${MAX_TRANSIT_DAYS}</g:max_transit_time>`,
    "      </g:shipping>",
  ];
}

type FeedProduct = {
  id: string;
  slug: string;
  name: string;
  seoTitle: string | null;
  shortDescription: string | null;
  description: string | null;
  sku: string | null;
  regularPrice: unknown; // Prisma Decimal
  salePrice: unknown | null;
  stockQuantity: number;
  allowBackorder: boolean;
  purchaseMethod: string;
  updatedAt: Date;
  category: { name: string; slug: string } | null;
  subcategory: { name: string } | null;
  images: { url: string; alt: string | null; isPrimary: boolean; position: number }[];
  variants: {
    id: string;
    name: string;
    isActive: boolean;
    stockQuantity: number;
    price: unknown;
    salePrice: unknown | null;
    images: { url: string; isPrimary: boolean; position: number }[];
  }[];
};

export async function GET() {
  // v2: the price/sale_price, shipping and identifier rules below changed the
  // payload, so the memo key is bumped to avoid serving the old body.
  const xml = await memo(`${NS.feed}:v2`, SEO_XML_TTL_MS, buildFeedXml);
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Browsers: refetch hourly; shared/CDN cache: serve stale for a day
      // while regenerating in the background, so crawls never block on origin.
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

async function buildFeedXml(): Promise<string> {
  let products: FeedProduct[] = [];
  try {
    // Same visibility rule as the sitemap and product pages: isActive only.
    products = await db.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        seoTitle: true,
        shortDescription: true,
        description: true,
        sku: true,
        regularPrice: true,
        salePrice: true,
        stockQuantity: true,
        allowBackorder: true,
        purchaseMethod: true,
        updatedAt: true,
        category: { select: { name: true, slug: true } },
        subcategory: { select: { name: true } },
        images: {
          orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }],
          select: { url: true, alt: true, isPrimary: true, position: true },
        },
        variants: {
          where: { isActive: true },
          orderBy: { position: "asc" as const },
          select: {
            id: true,
            name: true,
            isActive: true,
            stockQuantity: true,
            price: true,
            salePrice: true,
            images: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }], select: { url: true, isPrimary: true, position: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    console.error("products.xml: failed to load products", error);
    // buildFeedXml() returns a string; on DB failure emit an empty-channel feed
    // (same shape as before — Merchant Center tolerates an empty feed).
    return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n<title>${BRAND}</title>\n<link>${SITE_URL}</link>\n<description>Product feed temporarily unavailable</description>\n</channel>\n</rss>`;
  }

  const items: string[] = [];

  for (const p of products) {
    // Variant products emit one item per variant (children share item_group_id,
    // which is how Google models size/colour variants in Merchant Center).
    if (p.variants.length > 0) {
      for (const v of p.variants) {
        const stocked = (v.stockQuantity ?? 0) > 0;
        const vRegular = Number(v.price);
        const vSaleCandidate =
          v.salePrice != null && Number(v.salePrice) > 0 ? Number(v.salePrice) : null;
        // Only a strictly lower sale price is a sale — Google disapproves an
        // item whose sale price is not below its price, and the storefront
        // renders a strike-through only in this case.
        const vSale = vSaleCandidate != null && vSaleCandidate < vRegular ? vSaleCandidate : null;
        if (!Number.isFinite(vRegular) || vRegular <= 0) continue;
        const vImages = [
          ...v.images.map((vi) => resolveProductImage(p.category?.slug, vi.url, p.slug)),
          ...p.images.map((img) => resolveProductImage(p.category?.slug, img.url, p.slug)),
        ]
          .filter((u): u is string => Boolean(u))
          .map(absoluteImage)
          .filter((u, i, arr) => arr.indexOf(u) === i);
        if (vImages.length === 0) continue;
        const vLines: string[] = [
          "    <item>",
          `      <g:id>${xmlEscape(v.id)}</g:id>`,
          `      <g:title>${xmlEscape(toPlainText(`${p.seoTitle || p.name} - ${v.name}`, 150))}</g:title>`,
          `      <g:description>${xmlEscape(feedDescription(p.name, p.shortDescription, p.description, p.category?.name, p.subcategory?.name))}</g:description>`,
          `      <g:link>${xmlEscape(`${SITE_URL}/products/${p.slug}`)}</g:link>`,
          `      <g:image_link>${xmlEscape(vImages[0])}</g:image_link>`,
        ];
        for (const extra of vImages.slice(1, 10)) {
          vLines.push(`      <g:additional_image_link>${xmlEscape(extra)}</g:additional_image_link>`);
        }
        vLines.push(
          `      <g:condition>new</g:condition>`,
          `      <g:availability>${stocked ? "in_stock" : p.allowBackorder ? "backorder" : "out_of_stock"}</g:availability>`,
          `      <g:brand>${xmlEscape(BRAND)}</g:brand>`,
          `      <g:price>${vRegular.toFixed(2)} ${CURRENCY}</g:price>`,
        );
        if (vSale != null) vLines.push(`      <g:sale_price>${vSale.toFixed(2)} ${CURRENCY}</g:sale_price>`);
        if (p.sku) vLines.push(`      <g:mpn>${xmlEscape(p.sku)}</g:mpn>`);
        vLines.push(
          `      <g:item_group_id>${xmlEscape(p.sku || p.id)}</g:item_group_id>`,
          `      <g:product_type>${xmlEscape([p.category?.name, p.subcategory?.name].filter(Boolean).join(" > "))}</g:product_type>`,
          `      <g:google_product_category>Home &amp; Garden &gt; Decor</g:google_product_category>`,
        );
        vLines.push(...shippingLines(vSale ?? vRegular));
        vLines.push("    </item>");
        items.push(vLines.join("\n"));
      }
      // Variant products are fully represented by their variant items.
      continue;
    }

    // Mirror ProductDetailClient's buyability: variants decide when present.
    const hasVariants = p.variants.length > 0;
    const inStock = hasVariants
      ? p.variants.some((v) => (v.stockQuantity ?? 0) > 0)
      : (p.stockQuantity ?? 0) > 0;

    const availability = inStock
      ? "in_stock"
      : p.allowBackorder
        ? "backorder"
        : "out_of_stock";

    // Mirror PriceDisplay on the product page: a strike-through regular price
    // is only rendered when regular > sale, so g:price is always the full price
    // and g:sale_price only exists for a genuine discount.
    const regular = Number(p.regularPrice);
    if (!Number.isFinite(regular) || regular <= 0) continue; // Merchant Center rejects 0/absent prices
    const saleCandidate =
      p.salePrice != null && Number(p.salePrice) > 0 ? Number(p.salePrice) : null;
    const sale = saleCandidate != null && saleCandidate < regular ? saleCandidate : null;

    const title = toPlainText(p.seoTitle || p.name, 150);
    const description = feedDescription(
      p.name,
      p.shortDescription,
      p.description,
      p.category?.name,
      p.subcategory?.name,
    );
    if (!title || !description) continue;

    const imageUrls = p.images
      .map((img) => resolveProductImage(p.category?.slug, img.url, p.slug))
      .filter((u): u is string => Boolean(u))
      .map(absoluteImage)
      .filter((u, i, arr) => arr.indexOf(u) === i);

    if (imageUrls.length === 0) continue; // image_link is required

    const productType = [p.category?.name, p.subcategory?.name].filter(Boolean).join(" > ");
    const link = `${SITE_URL}/products/${p.slug}`;

    const lines: string[] = [
      "    <item>",
      `      <g:id>${xmlEscape(p.id)}</g:id>`,
      `      <g:title>${xmlEscape(title)}</g:title>`,
      `      <g:description>${xmlEscape(description)}</g:description>`,
      `      <g:link>${xmlEscape(link)}</g:link>`,
      `      <g:image_link>${xmlEscape(imageUrls[0])}</g:image_link>`,
    ];
    for (const extra of imageUrls.slice(1, 10)) {
      lines.push(`      <g:additional_image_link>${xmlEscape(extra)}</g:additional_image_link>`);
    }
    lines.push(
      `      <g:condition>new</g:condition>`,
      `      <g:availability>${availability}</g:availability>`,
      `      <g:brand>${xmlEscape(BRAND)}</g:brand>`,
      `      <g:price>${regular.toFixed(2)} ${CURRENCY}</g:price>`,
    );
    if (sale != null) lines.push(`      <g:sale_price>${sale.toFixed(2)} ${CURRENCY}</g:sale_price>`);
    if (productType) lines.push(`      <g:product_type>${xmlEscape(productType)}</g:product_type>`);
    if (p.sku) lines.push(`      <g:mpn>${xmlEscape(p.sku)}</g:mpn>`);
    lines.push(
      `      <g:google_product_category>Home &amp; Garden &gt; Decor</g:google_product_category>`,
    );
    lines.push(...shippingLines(sale ?? regular));
    lines.push("    </item>");
    items.push(lines.join("\n"));
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    `  <channel>`,
    `    <title>${xmlEscape(BRAND)}</title>`,
    `    <link>${SITE_URL}</link>`,
    `    <description>Premium home décor and lifestyle products by BM Distributors.</description>`,
    ...items,
    `  </channel>`,
    `</rss>`,
  ].join("\n");
}
