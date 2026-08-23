import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });

  console.log("📦 Seeding products...\n");

  // Fetch all categories
  const categories = await db.category.findMany({
    include: { subcategories: true },
  });

  const catMap: Record<string, string> = {};
  for (const cat of categories) catMap[cat.slug] = cat.id;

  const subMap: Record<string, string> = {};
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      subMap[`${cat.slug}/${sub.slug}`] = sub.id;
    }
  }

  // Helper to create a product
  async function createProduct(data: {
    name: string;
    slug: string;
    description: string;
    shortDescription?: string;
    regularPrice: number;
    salePrice?: number;
    categorySlug: string;
    subcategorySlug?: string;
    image?: string;
    isFeatured?: boolean;
    isBestseller?: boolean;
    isNewArrival?: boolean;
    material?: string;
    color?: string;
    stockQuantity?: number;
    tags?: string[];
  }) {
    const catId = catMap[data.categorySlug];
    if (!catId) {
      console.log(`   ⚠️  Category "${data.categorySlug}" not found, skipping ${data.name}`);
      return;
    }
    const subId = data.subcategorySlug ? subMap[`${data.categorySlug}/${data.subcategorySlug}`] : undefined;

    const product = await db.product.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        shortDescription: data.shortDescription || data.description.slice(0, 100),
        regularPrice: data.regularPrice,
        salePrice: data.salePrice,
        categoryId: catId,
        subcategoryId: subId,
        status: "ACTIVE",
        isActive: true,
        isFeatured: data.isFeatured || false,
        isBestseller: data.isBestseller || false,
        isNewArrival: data.isNewArrival || false,
        material: data.material,
        color: data.color,
        stockQuantity: data.stockQuantity ?? 50,
        purchaseMethod: "BOTH",
        images: {
          create: {
            url: data.image || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=800&fit=crop",
            alt: data.name,
            position: 0,
            isPrimary: true,
          },
        },
      },
      include: { images: true },
    });

    if (data.tags?.length) {
      for (const tag of data.tags) {
        await db.productTag.upsert({
          where: { productId_tag: { productId: product.id, tag } },
          update: {},
          create: { productId: product.id, tag },
        });
      }
    }

    return product;
  }

  // ============================================================
  // WALL DECOR
  // ============================================================
  console.log("🖼️  Wall Decor...");
  const wallDecor = [
    { name: "Abstract Gold Leaf Canvas", slug: "abstract-gold-leaf-canvas", description: "Hand-painted gold leaf abstract art on premium canvas. A statement piece that adds warmth and sophistication to any living space.", regularPrice: 4999, image: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=600&h=800&fit=crop", isFeatured: true, material: "Canvas", color: "Gold", tags: ["living room", "bedroom", "gold accent"] },
    { name: "Minimalist Line Art Frame", slug: "minimalist-line-art-frame", description: "Elegant single-line portrait art in a slim matte black frame. Modern and timeless, perfect for gallery walls.", regularPrice: 2499, image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=800&fit=crop", material: "MDF", color: "Black", tags: ["minimalist", "modern"] },
    { name: "Boho Macrame Wall Hanging", slug: "boho-macrame-wall-hanging", description: "Handwoven cotton macrame wall hanging with wooden bead accents. Brings texture and a bohemian vibe to any room.", regularPrice: 3499, image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&h=800&fit=crop", isBestseller: true, material: "Cotton", color: "Cream", tags: ["boho", "handmade"] },
    { name: "Decorative Mirror Circle", slug: "decorative-mirror-circle", description: "Round gold-framed decorative mirror with beveled edge. Creates the illusion of space and reflects light beautifully.", regularPrice: 5999, image: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=600&h=800&fit=crop", material: "Glass", color: "Gold", tags: ["mirror", "gold accent"] },
    { name: "Wooden Accent Wall Panel", slug: "wooden-accent-wall-panel", description: "Natural wood slat wall panel that adds warmth and texture. Easy to install, perfect for creating an accent wall.", regularPrice: 7999, isNewArrival: true, material: "Sheesham Wood", color: "Natural", tags: ["wood", "accent wall"] },
    { name: "Ceramic Wall Planter Set", slug: "ceramic-wall-planter-set", description: "Set of 3 ceramic wall-mounted planters in matte finish. Perfect for displaying succulents and small plants.", regularPrice: 2999, material: "Ceramic", color: "Terracotta", tags: ["plants", "boho"] },
  ];
  for (const p of wallDecor) await createProduct({ ...p, categorySlug: "wall-decor" });

  // ============================================================
  // LAUNDRY
  // ============================================================
  console.log("🧺 Laundry...");
  const laundry = [
    { name: "Premium Wicker Laundry Basket", slug: "premium-wicker-laundry-basket", description: "Handcrafted premium wicker laundry basket with cotton liner. Spacious 60L capacity with sturdy handles.", regularPrice: 3999, image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=800&fit=crop", isFeatured: true, isBestseller: true, material: "Wicker", color: "Natural", tags: ["bestseller", "storage"] },
    { name: "Collapsible Fabric Hamper", slug: "collapsible-fabric-hamper", description: "Space-saving collapsible laundry hamper with carry handles. When empty, folds flat for easy storage.", regularPrice: 1499, image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=800&fit=crop", material: "Polyester", color: "Grey", tags: ["space-saving"] },
    { name: "Rattan Laundry Basket Lidded", slug: "rattan-laundry-basket-lidded", description: "Elegant lidded rattan laundry basket. The removable lid keeps laundry out of sight while adding a decorative touch.", regularPrice: 4999, image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=800&fit=crop", isNewArrival: true, material: "Rattan", color: "Honey", tags: ["lidded", "premium"] },
    { name: "Cotton Rope Storage Basket", slug: "cotton-rope-storage-basket", description: "Soft cotton rope woven storage basket. Versatile — use for laundry, toys, or blankets.", regularPrice: 2499, material: "Cotton Rope", color: "White", tags: ["versatile", "soft"] },
    { name: "Bamboo Folding Laundry Rack", slug: "bamboo-folding-laundry-rack", description: "Eco-friendly bamboo folding drying rack with 3 tiers. Folds flat when not in use.", regularPrice: 3499, material: "Bamboo", color: "Natural", tags: ["eco-friendly", "folding"] },
  ];
  for (const p of laundry) await createProduct({ ...p, categorySlug: "laundry" });

  // ============================================================
  // COMFORTERS
  // ============================================================
  console.log("🛏️  Comforters...");
  const comforters = [
    { name: "Royal Velvet King Comforter", slug: "royal-velvet-king-comforter", description: "Luxurious velvet king-size comforter with quilted diamond pattern. Ultra-soft microfiber fill keeps you warm all winter.", regularPrice: 8999, salePrice: 7499, image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=800&fit=crop", isFeatured: true, isBestseller: true, material: "Velvet", color: "Navy", tags: ["winter", "luxury", "king size"] },
    { name: "Cotton Percale Comforter", slug: "cotton-percale-comforter", description: "Breathable cotton percale comforter, perfect for year-round use. Pre-washed for a lived-in softness from day one.", regularPrice: 5999, image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=800&fit=crop", material: "Cotton", color: "White", tags: ["all season", "breathable"] },
    { name: "Silk Blend Duvet Insert", slug: "silk-blend-duvet-insert", description: "Premium silk blend duvet insert with 700 fill power. Lightweight yet incredibly warm. Hypoallergenic.", regularPrice: 12999, isNewArrival: true, material: "Silk Blend", color: "Ivory", tags: ["premium", "hypoallergenic"] },
    { name: "Quilted Cotton Throw", slug: "quilted-cotton-throw", description: "Lightweight quilted cotton throw blanket. Perfect as a sofa accent or an extra layer on cool evenings.", regularPrice: 2499, material: "Cotton", color: "Sage Green", tags: ["throw", "lightweight"] },
    { name: "Egyptian Cotton Sheet Set", slug: "egyptian-cotton-sheet-set", description: "400 thread count Egyptian cotton sheet set. Includes flat sheet, fitted sheet, and 2 pillowcases.", regularPrice: 6999, isFeatured: true, material: "Egyptian Cotton", color: "White", tags: ["sheets", "premium"] },
    { name: "Microfiber All-Season Comforter", slug: "microfiber-all-season-comforter", description: "Affordable all-season microfiber comforter. Machine washable and hypoallergenic. Great value for everyday use.", regularPrice: 2999, material: "Microfiber", color: "Grey", tags: ["budget", "machine washable"] },
  ];
  for (const p of comforters) await createProduct({ ...p, categorySlug: "comforters" });

  // ============================================================
  // LAMPS
  // ============================================================
  console.log("💡 Lamps...");
  const lamps = [
    { name: "Brass Arc Floor Lamp", slug: "brass-arc-floor-lamp", description: "Sculptural brass arc floor lamp with linen shade. Creates a warm ambient glow. Height adjustable.", regularPrice: 7999, image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=600&h=800&fit=crop", isFeatured: true, material: "Brass", color: "Gold", tags: ["floor lamp", "statement piece"] },
    { name: "Ceramic Table Lamp", slug: "ceramic-table-lamp", description: "Handcrafted ceramic table lamp with a textured finish. Comes with a cotton drum shade.", regularPrice: 3999, image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=600&h=800&fit=crop", isBestseller: true, material: "Ceramic", color: "Terracotta", tags: ["table lamp", "handmade"] },
    { name: "Minimalist LED Desk Lamp", slug: "minimalist-led-desk-lamp", description: "Sleek LED desk lamp with touch dimmer and 3 color temperatures. USB charging port built in.", regularPrice: 2999, image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=600&h=800&fit=crop", isNewArrival: true, material: "Aluminium", color: "Matte Black", tags: ["LED", "desk", "USB"] },
    { name: "Rattan Pendant Light", slug: "rattan-pendant-light", description: "Handwoven rattan pendant light that casts beautiful shadow patterns. Perfect over dining tables.", regularPrice: 4999, material: "Rattan", color: "Natural", tags: ["pendant", "boho"] },
    { name: "Crystal Chandelier Mini", slug: "crystal-chandelier-mini", description: "Compact crystal chandelier with 6 arms. Dazzling light refraction adds glamour to any room.", regularPrice: 9999, material: "Crystal", color: "Silver", tags: ["chandelier", "luxury"] },
    { name: "Wooden Tripod Floor Lamp", slug: "wooden-tripod-floor-lamp", description: "Mid-century modern tripod floor lamp with natural wood legs and canvas shade.", regularPrice: 5499, material: "Oak Wood", color: "Natural", tags: ["mid-century", "floor lamp"] },
  ];
  for (const p of lamps) await createProduct({ ...p, categorySlug: "lamps" });

  // ============================================================
  // CARPETS
  // ============================================================
  console.log("🧶 Carpets...");
  const carpets = [
    { name: "Persian Hand-Knotted Rug", slug: "persian-hand-knotted-rug", description: "Authentic hand-knotted Persian rug with intricate floral motifs. Made from pure wool on cotton foundation.", regularPrice: 19999, salePrice: 16999, image: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&h=800&fit=crop", isFeatured: true, material: "Wool", color: "Burgundy", tags: ["handmade", "premium", "traditional"] },
    { name: "Moroccan Shaggy Rug", slug: "moroccan-shaggy-rug", description: "Plush Moroccan-style shaggy rug with geometric patterns. Ultra-soft underfoot, perfect for bedrooms.", regularPrice: 8999, image: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&h=800&fit=crop", isBestseller: true, material: "Polypropylene", color: "Cream", tags: ["shaggy", "soft", "bedroom"] },
    { name: "Jute Natural Fiber Rug", slug: "jute-natural-fiber-rug", description: "Eco-friendly jute rug with a beautiful natural texture. Durable and sustainable.", regularPrice: 4999, material: "Jute", color: "Natural", tags: ["eco-friendly", "natural"] },
    { name: "Kilim Runner Carpet", slug: "kilim-runner-carpet", description: "Flat-weave kilim runner with vibrant geometric patterns. Ideal for hallways and entryways.", regularPrice: 6999, isNewArrival: true, material: "Wool", color: "Multi", tags: ["kilim", "hallway"] },
    { name: "Memory Foam Bath Mat", slug: "memory-foam-bath-mat", description: "Ultra-absorbent memory foam bath mat with non-slip backing. Available in 6 colors.", regularPrice: 1499, material: "Microfiber", color: "Grey", tags: ["bath", "memory foam"] },
    { name: "Woven Cotton Accent Rug", slug: "woven-cotton-accent-rug", description: "Handwoven cotton accent rug with tassels. Lightweight and easy to wash. Great for kids' rooms.", regularPrice: 2999, material: "Cotton", color: "Indigo", tags: ["washable", "kids"] },
  ];
  for (const p of carpets) await createProduct({ ...p, categorySlug: "carpets" });

  // ============================================================
  // CLOCKS
  // ============================================================
  console.log("🕐 Clocks...");
  const clocks = [
    { name: "Oversized Wall Clock Gold", slug: "oversized-wall-clock-gold", description: "Statement oversized wall clock with gold frame and Roman numerals. 60cm diameter — a centerpiece for any wall.", regularPrice: 4999, image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&h=800&fit=crop", isFeatured: true, material: "Metal", color: "Gold", tags: ["oversized", "statement"] },
    { name: "Vintage Wooden Wall Clock", slug: "vintage-wooden-wall-clock", description: "Rustic wooden wall clock with distressed finish. Adds vintage charm to kitchens and living rooms.", regularPrice: 2999, image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&h=800&fit=crop", isBestseller: true, material: "Wood", color: "Walnut", tags: ["vintage", "rustic"] },
    { name: "Modern Minimalist Desk Clock", slug: "modern-minimalist-desk-clock", description: "Sleek desk clock with silent sweep movement. Brushed steel body with clean white face.", regularPrice: 1999, material: "Steel", color: "Silver", tags: ["desk", "silent"] },
    { name: "Sunburst Mirror Clock", slug: "sunburst-mirror-clock", description: "Eye-catching sunburst mirror clock that doubles as a wall mirror and timepiece.", regularPrice: 5999, isNewArrival: true, material: "Metal", color: "Gold", tags: ["mirror", "decorative"] },
    { name: "Pendulum Wall Clock", slug: "pendulum-wall-clock", description: "Classic pendulum wall clock with Westminster chime. Solid wood construction.", regularPrice: 7999, material: "Sheesham Wood", color: "Mahogany", tags: ["classic", "chime"] },
  ];
  for (const p of clocks) await createProduct({ ...p, categorySlug: "clocks" });

  // ============================================================
  // ACCESSORIES
  // ============================================================
  console.log("✨ Accessories...");

  // Soap Dispensers
  const soapDispensers = [
    { name: "Ceramic Soap Dispenser Set", slug: "ceramic-soap-dispenser-set", description: "Set of 2 ceramic soap dispensers with bamboo pump. Perfect for kitchen sink or bathroom vanity.", regularPrice: 1999, image: "https://images.unsplash.com/photo-1584568694244-44cb2a4c2c0b?w=600&h=800&fit=crop", isBestseller: true, material: "Ceramic", color: "White", tags: ["bathroom", "kitchen"] },
    { name: "Glass Soap Dispenser Amber", slug: "glass-soap-dispenser-amber", description: "Amber glass soap dispenser with brass pump. A stylish upgrade for any countertop.", regularPrice: 1499, material: "Glass", color: "Amber", tags: ["bathroom", "premium"] },
  ];
  for (const p of soapDispensers) await createProduct({ ...p, categorySlug: "accessories", subcategorySlug: "soap-dispensers" });

  // Cushion Covers
  const cushionCovers = [
    { name: "Velvet Cushion Cover Set of 2", slug: "velvet-cushion-cover-set", description: "Luxurious velvet cushion covers with hidden zipper. Set of 2 in complementary colors.", regularPrice: 1999, image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=800&fit=crop", isFeatured: true, material: "Velvet", color: "Teal", tags: ["sofa", "luxury"] },
    { name: "Embroidered Cotton Cushion Cover", slug: "embroidered-cotton-cushion-cover", description: "Hand-embroidered cotton cushion cover with traditional motifs. Each piece is unique.", regularPrice: 999, material: "Cotton", color: "Indigo", tags: ["handmade", "traditional"] },
  ];
  for (const p of cushionCovers) await createProduct({ ...p, categorySlug: "accessories", subcategorySlug: "cushion-covers" });

  // Vases
  const vases = [
    { name: "Handblown Glass Vase Trio", slug: "handblown-glass-vase-trio", description: "Set of 3 handblown glass vases in graduated sizes. Each piece is unique with subtle color variations.", regularPrice: 3999, image: "https://images.unsplash.com/photo-1612196808214-b7e239e5c5c4?w=600&h=800&fit=crop", isFeatured: true, material: "Glass", color: "Amber", tags: ["handmade", "decorative"] },
    { name: "Ceramic Bud Vase", slug: "ceramic-bud-vase", description: "Minimalist ceramic bud vase perfect for a single stem or dried flowers. Matte finish.", regularPrice: 999, material: "Ceramic", color: "Terracotta", tags: ["minimalist", "single stem"] },
    { name: "Metal Sculptural Vase", slug: "metal-sculptural-vase", description: "Abstract sculptural metal vase that serves as an art piece even without flowers.", regularPrice: 4999, isNewArrival: true, material: "Iron", color: "Matte Black", tags: ["sculptural", "art piece"] },
  ];
  for (const p of vases) await createProduct({ ...p, categorySlug: "accessories", subcategorySlug: "vases" });

  // Flower Pots
  const flowerPots = [
    { name: "Self-Watering Ceramic Planter", slug: "self-watering-ceramic-planter", description: "Smart self-watering ceramic planter with water reservoir. Keeps plants hydrated for up to 2 weeks.", regularPrice: 1999, image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&h=800&fit=crop", isBestseller: true, material: "Ceramic", color: "Sage Green", tags: ["self-watering", "smart"] },
    { name: "Terracotta Pot Set of 3", slug: "terracotta-pot-set-3", description: "Classic terracotta pot set in 3 sizes. Drainage holes included. Unglazed for natural look.", regularPrice: 1499, material: "Terracotta", color: "Natural", tags: ["classic", "set"] },
  ];
  for (const p of flowerPots) await createProduct({ ...p, categorySlug: "accessories", subcategorySlug: "flower-pots" });

  // Tissue Boxes
  const tissueBoxes = [
    { name: "Leather Tissue Box Cover", slug: "leather-tissue-box-cover", description: "Premium faux leather tissue box cover with magnetic closure. Elevates your coffee table or bathroom counter.", regularPrice: 1499, image: "https://images.unsplash.com/photo-1584568694244-44cb2a4c2c0b?w=600&h=800&fit=crop", material: "Faux Leather", color: "Brown", tags: ["premium", "bathroom"] },
    { name: "Bamboo Tissue Box Holder", slug: "bamboo-tissue-box-holder", description: "Eco-friendly bamboo tissue box holder with smooth finish. Sustainable and stylish.", regularPrice: 999, material: "Bamboo", color: "Natural", tags: ["eco-friendly"] },
  ];
  for (const p of tissueBoxes) await createProduct({ ...p, categorySlug: "accessories", subcategorySlug: "tissue-boxes" });

  // Dustbin
  const dustbins = [
    { name: "Touch-Lid Stainless Steel Bin", slug: "touch-lid-stainless-steel-bin", description: "Pedal-operated stainless steel dustbin with soft-close lid. Fingerprint-resistant finish. 30L capacity.", regularPrice: 2999, image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=800&fit=crop", isBestseller: true, material: "Stainless Steel", color: "Silver", tags: ["kitchen", "pedal"] },
    { name: "Rattan Waste Basket", slug: "rattan-waste-basket", description: "Handwoven rattan waste basket. Perfect for bedrooms and offices. Lightweight yet sturdy.", regularPrice: 1499, material: "Rattan", color: "Natural", tags: ["bedroom", "office"] },
  ];
  for (const p of dustbins) await createProduct({ ...p, categorySlug: "accessories", subcategorySlug: "dustbin" });

  // ============================================================
  // SUMMARY
  // ============================================================
  const productCount = await db.product.count();
  const imageCount = await db.productImage.count();
  const tagCount = await db.productTag.count();

  console.log("\n📊 Product Seed Summary:");
  console.log(`   Total Products: ${productCount}`);
  console.log(`   Product Images: ${imageCount}`);
  console.log(`   Product Tags: ${tagCount}`);
  console.log("\n🎉 Product seed complete!");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
