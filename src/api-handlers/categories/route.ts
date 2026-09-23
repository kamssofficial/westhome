import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { CATEGORIES } from "@/lib/data";
import { requireAuthRole } from "@/lib/apiAuth";
import { normalizeImageUrl } from "@/lib/categoryImages";
import { memoGet, memoSet, memoInvalidateCatalog, CATALOG_TTL_MS, NS } from "@/lib/memoCache";

const PLACEHOLDER_RE = /placeholder\.svg$/;

// Real tile images served from /public/collections/<category>/
// used when the DB has no usable image for the category itself.
const STATIC_CATEGORY_IMAGES: Record<string, string> = {
  // Main categories
  "wall-decor": "/collections/frames/frame-abstract-art-green-sofa.webp",
  laundry: "/collections/basket/basket-natural-cylindrical-woven-set.webp",
  comforters: "/collections/comforters/comforter-set.webp",
  lamps: "/collections/lamps/modern-lamp.webp",
  carpets: "/collections/carpets/gray-distressed-rug.webp",
  clocks: "/collections/clocks/dark-roman-numeral-clock.webp",
  accessories: "/collections/soap-dispensers/set/soap-dispenser-cream-white-collection.webp",
  // Sub-category fallbacks
  frames: "/collections/frames/frame-abstract-art-green-sofa.webp",
  "cushion-covers": "/collections/cushion-covers/cushion-cover-4532-1.webp",
  "soap-dispensers": "/collections/soap-dispensers/set/soap-dispenser-cream-white-collection.webp",
  vases: "/collections/soap-dispensers/set/soap-dispenser-cream-white-collection.webp",
  "flower-pots": "/collections/soap-dispensers/set/soap-dispenser-cream-white-collection.webp",
  "tissue-boxes": "/collections/soap-dispensers/set/soap-dispenser-cream-white-collection.webp",
  dustbin: "/collections/soap-dispensers/set/soap-dispenser-cream-white-collection.webp",
  basket: "/collections/basket/basket-natural-cylindrical-woven-set.webp",
};

interface CategoryTileSource {
  id: string;
  slug?: string;
  image: string | null;
  images?: Array<{ url: string; isPrimary?: boolean }>;
}

async function resolveCategoryImage(cat: CategoryTileSource): Promise<string | null> {
  const primaryImage =
    cat.images?.find((i) => i.isPrimary) || cat.images?.[0];
  // The admin page writes both the legacy category.image field and the
  // normalized CategoryImage row. Prefer the current primary row when it is
  // available, then fall back to the legacy field for older records.
  if (primaryImage?.url && !PLACEHOLDER_RE.test(primaryImage.url)) return normalizeImageUrl(primaryImage.url);
  if (cat.image && !PLACEHOLDER_RE.test(cat.image)) return normalizeImageUrl(cat.image);
  const product = await db.product.findFirst({
    where: { categoryId: cat.id, isActive: true, status: "ACTIVE" },
    include: { images: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }] } },
    orderBy: { createdAt: "desc" as const },
  });
  const productImage = product?.images?.[0]?.url;
  if (productImage) return normalizeImageUrl(productImage);
  if (cat.slug && STATIC_CATEGORY_IMAGES[cat.slug]) return STATIC_CATEGORY_IMAGES[cat.slug];
  return normalizeImageUrl(cat.image || primaryImage?.url || null);
}

export async function GET() {
  // 60-second memo cache: category tiles ship on every page load.
  const cached = memoGet<{ categories: unknown }>(NS.categories);
  if (cached) {
    return NextResponse.json(cached, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          include: {
            _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
          },
        },
        images: { orderBy: { position: "asc" } },
        _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
      },
      orderBy: { position: "asc" },
    });

    const transformed = await Promise.all(categories.map(async (cat: any) => {
      const image = await resolveCategoryImage(cat);
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image,
        position: cat.position,
        productCount: cat._count.products,
        images: cat.images || [],
        subcategories: cat.subcategories.map((sub: any) => ({
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          description: sub.description,
          image: normalizeImageUrl(sub.image || null),
          position: sub.position,
          productCount: sub._count.products,
        })),
      };
    }));

    const payload = { categories: transformed };
    memoSet(NS.categories, CATALOG_TTL_MS, payload);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json({ categories: CATEGORIES });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const slug = body.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-|-$/g, "");
    const category = await db.category.create({
      data: { name: body.name, slug, description: body.description, image: body.image, position: body.position || 0 },
    });

    // Invalidate cached pages so storefront picks up the new category
    revalidatePath("/shop");
    revalidatePath("/search");
    memoInvalidateCatalog();

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
