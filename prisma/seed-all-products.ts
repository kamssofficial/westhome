import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CAT: Record<string, string> = {};

// Unsplash images carefully matched to each product
const products = [
  // ── WALL DECOR ──
  {
    name: "Abstract Gold Leaf Canvas",
    slug: "abstract-gold-leaf-canvas",
    desc: "A stunning abstract canvas with hand-applied gold leaf accents that catches light beautifully.",
    price: 4999,
    cat: "Wall Decor",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=800&fit=crop",
    featured: true,
  },
  {
    name: "Boho Macramé Wall Hanging",
    slug: "boho-macrame-wall-hanging",
    desc: "Hand-knotted cotton macramé piece that adds warmth and texture to any wall.",
    price: 3499,
    cat: "Wall Decor",
    image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&h=800&fit=crop",
  },
  {
    name: "Ceramic Wall Planter Set",
    slug: "ceramic-wall-planter-set",
    desc: "Set of 3 minimalist ceramic planters for mounting on walls with live or dried botanicals.",
    price: 2999,
    cat: "Wall Decor",
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&h=800&fit=crop",
  },
  {
    name: "Decorative Mirror Circle",
    slug: "decorative-mirror-circle",
    desc: "Elegant round mirror with a slim gold frame, perfect for entryways and bedrooms.",
    price: 5999,
    cat: "Wall Decor",
    image: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=600&h=800&fit=crop",
  },
  {
    name: "Minimalist Line Art Frame",
    slug: "minimalist-line-art-frame",
    desc: "Modern single-line face drawing in a sleek matte black frame.",
    price: 2499,
    cat: "Wall Decor",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=800&fit=crop",
  },
  {
    name: "Wooden Accent Wall Panel",
    slug: "wooden-accent-wall-panel",
    desc: "Natural wood slat panel that creates a stunning feature wall with depth and texture.",
    price: 7999,
    cat: "Wall Decor",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=800&fit=crop",
  },

  // ── LAUNDRY ──
  {
    name: "Premium Wicker Laundry Basket",
    slug: "premium-wicker-laundry-basket",
    desc: "Handwoven natural wicker basket with handles, blending function and style.",
    price: 3999,
    cat: "Laundry",
    image: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&h=800&fit=crop",
  },
  {
    name: "Collapsible Fabric Hamper",
    slug: "collapsible-fabric-hamper",
    desc: "Lightweight fabric hamper that folds flat when not in use. Perfect for small spaces.",
    price: 1499,
    cat: "Laundry",
    image: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=600&h=800&fit=crop",
  },
  {
    name: "Bamboo Folding Laundry Rack",
    slug: "bamboo-folding-laundry-rack",
    desc: "Eco-friendly bamboo drying rack with multiple tiers. Folds compactly for storage.",
    price: 3499,
    cat: "Laundry",
    image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=600&h=800&fit=crop",
  },
  {
    name: "Cotton Rope Storage Basket",
    slug: "cotton-rope-storage-basket",
    desc: "Soft braided cotton rope basket in a neutral tone for laundry or toys.",
    price: 2499,
    cat: "Laundry",
    image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&h=800&fit=crop",
  },
  {
    name: "Rattan Laundry Basket Lidded",
    slug: "rattan-laundry-basket-lidded",
    desc: "Elegant rattan basket with a fitted lid to keep laundry hidden away.",
    price: 4999,
    cat: "Laundry",
    image: "https://images.unsplash.com/photo-1631125915902-d8abe9225ff2?w=600&h=800&fit=crop",
  },

  // ── COMFORTERS ──
  {
    name: "Royal Velvet King Comforter",
    slug: "royal-velvet-king-comforter",
    desc: "Plush velvet comforter in deep jewel tones for a luxurious bedroom update.",
    price: 8999,
    cat: "Comforters",
    image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=800&fit=crop",
    featured: true,
  },
  {
    name: "Egyptian Cotton Sheet Set",
    slug: "egyptian-cotton-sheet-set",
    desc: "600 thread count Egyptian cotton sheets with a silky-smooth finish.",
    price: 6999,
    cat: "Comforters",
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=800&fit=crop",
  },
  {
    name: "Cotton Percale Comforter",
    slug: "cotton-percale-comforter",
    desc: "Crisp and breathable percale cotton comforter in classic white.",
    price: 5999,
    cat: "Comforters",
    image: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=800&fit=crop",
  },
  {
    name: "Silk Blend Duvet Insert",
    slug: "silk-blend-duvet-insert",
    desc: "Lightweight silk-blend duvet that regulates temperature for year-round comfort.",
    price: 12999,
    cat: "Comforters",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=800&fit=crop",
  },
  {
    name: "Microfiber All-Season Comforter",
    slug: "microfiber-all-season-comforter",
    desc: "Soft microfiber comforter with box-stitch quilting. Machine washable and hypoallergenic.",
    price: 2999,
    cat: "Comforters",
    image: "https://images.unsplash.com/photo-1616627561950-9f746e330187?w=600&h=800&fit=crop",
  },
  {
    name: "Quilted Cotton Throw",
    slug: "quilted-cotton-throw",
    desc: "Hand-stitched quilted cotton throw blanket, perfect for couches and reading nooks.",
    price: 2499,
    cat: "Comforters",
    image: "https://images.unsplash.com/photo-1580301762395-21ce6d5d4049?w=600&h=800&fit=crop",
  },

  // ── LAMPS ──
  {
    name: "Brass Arc Floor Lamp",
    slug: "brass-arc-floor-lamp",
    desc: "Mid-century modern arc lamp with a brushed brass finish and linen shade.",
    price: 7999,
    cat: "Lamps",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=600&h=800&fit=crop",
    featured: true,
  },
  {
    name: "Ceramic Table Lamp",
    slug: "ceramic-table-lamp",
    desc: "Handcrafted ceramic base with a textured glaze, topped with a cotton drum shade.",
    price: 3999,
    cat: "Lamps",
    image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&h=800&fit=crop",
  },
  {
    name: "Crystal Chandelier Mini",
    slug: "crystal-chandelier-mini",
    desc: "Compact crystal chandelier that brings sparkle to small spaces and powder rooms.",
    price: 9999,
    cat: "Lamps",
    image: "https://images.unsplash.com/photo-1543198126-a8ad8e47fb22?w=600&h=800&fit=crop",
  },
  {
    name: "Minimalist LED Desk Lamp",
    slug: "minimalist-led-desk-lamp",
    desc: "Sleek LED desk lamp with adjustable brightness and color temperature.",
    price: 2999,
    cat: "Lamps",
    image: "https://images.unsplash.com/photo-1534073737927-85f1ebff1f5d?w=600&h=800&fit=crop",
  },
  {
    name: "Rattan Pendant Light",
    slug: "rattan-pendant-light",
    desc: "Natural rattan pendant that casts beautiful shadow patterns on walls and ceilings.",
    price: 4999,
    cat: "Lamps",
    image: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=600&h=800&fit=crop",
  },
  {
    name: "Wooden Tripod Floor Lamp",
    slug: "wooden-tripod-floor-lamp",
    desc: "Three-legged floor lamp with solid wood legs and a warm fabric shade.",
    price: 5499,
    cat: "Lamps",
    image: "https://images.unsplash.com/photo-1543198126-a8ad8e47fb22?w=600&h=800&fit=crop&q=80&sat=-30",
  },

  // ── CARPETS ──
  {
    name: "Persian Hand-Knotted Rug",
    slug: "persian-hand-knotted-rug",
    desc: "Authentic hand-knotted Persian rug with intricate floral motifs in rich burgundy and gold.",
    price: 19999,
    cat: "Carpets",
    image: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&h=800&fit=crop",
    featured: true,
  },
  {
    name: "Moroccan Shaggy Rug",
    slug: "moroccan-shaggy-rug",
    desc: "Plush high-pile Moroccan rug with diamond pattern in cream and charcoal.",
    price: 8999,
    cat: "Carpets",
    image: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&h=800&fit=crop&q=80&sat=-40",
  },
  {
    name: "Kilim Runner Carpet",
    slug: "kilim-runner-carpet",
    desc: "Flat-weave kilim runner in vibrant geometric patterns. Ideal for hallways.",
    price: 6999,
    cat: "Carpets",
    image: "https://images.unsplash.com/photo-1604074131665-7a4b13870ab4?w=600&h=800&fit=crop",
  },
  {
    name: "Jute Natural Fiber Rug",
    slug: "jute-natural-fiber-rug",
    desc: "Eco-friendly jute rug with a braided texture that adds organic warmth to any room.",
    price: 4999,
    cat: "Carpets",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=800&fit=crop&q=80&sat=-20",
  },
  {
    name: "Memory Foam Bath Mat",
    slug: "memory-foam-bath-mat",
    desc: "Ultra-soft memory foam bath mat with non-slip backing. Available in neutral tones.",
    price: 1499,
    cat: "Carpets",
    image: "https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=600&h=800&fit=crop",
  },
  {
    name: "Woven Cotton Accent Rug",
    slug: "woven-cotton-accent-rug",
    desc: "Soft woven cotton rug in muted earth tones, perfect for bedside.",
    price: 2999,
    cat: "Carpets",
    image: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=600&h=800&fit=crop",
  },

  // ── CLOCKS ──
  {
    name: "Oversized Wall Clock Gold",
    slug: "oversized-wall-clock-gold",
    desc: "Large 24-inch wall clock with gold metal frame and minimalist Roman numerals.",
    price: 4999,
    cat: "Clocks",
    image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&h=800&fit=crop",
    featured: true,
  },
  {
    name: "Pendulum Wall Clock",
    slug: "pendulum-wall-clock",
    desc: "Classic wooden pendulum clock with a rich walnut finish.",
    price: 7999,
    cat: "Clocks",
    image: "https://images.unsplash.com/photo-1508963493744-76fce69379c0?w=600&h=800&fit=crop",
  },
  {
    name: "Sunburst Mirror Clock",
    slug: "sunburst-mirror-clock",
    desc: "Gold sunburst mirror that doubles as a clock — a statement piece for any wall.",
    price: 5999,
    cat: "Clocks",
    image: "https://images.unsplash.com/photo-1416339134316-0e91dc9ded92?w=600&h=800&fit=crop",
  },
  {
    name: "Modern Minimalist Desk Clock",
    slug: "modern-minimalist-desk-clock",
    desc: "Sleek desktop clock with clean lines and a silent sweep movement.",
    price: 1999,
    cat: "Clocks",
    image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&h=800&fit=crop&q=80&sat=-50",
  },
  {
    name: "Vintage Wooden Wall Clock",
    slug: "vintage-wooden-wall-clock",
    desc: "Rustic reclaimed wood clock with exposed gears and vintage charm.",
    price: 2999,
    cat: "Clocks",
    image: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=600&h=800&fit=crop",
  },

  // ── ACCESSORIES ──
  {
    name: "Handblown Glass Vase Trio",
    slug: "handblown-glass-vase-trio",
    desc: "Set of 3 artisan handblown glass vases in graduated sizes and smoky tones.",
    price: 3999,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1612196808214-b7e239e5c5c4?w=600&h=800&fit=crop",
  },
  {
    name: "Velvet Cushion Cover Set of 2",
    slug: "velvet-cushion-cover-set-of-2",
    desc: "Luxurious velvet cushion covers with hidden zip. Available in jewel tones.",
    price: 1999,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=800&fit=crop",
  },
  {
    name: "Glass Soap Dispenser Amber",
    slug: "glass-soap-dispenser-amber",
    desc: "Amber glass soap dispenser with a matte black pump — elevates any countertop.",
    price: 1499,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1584568694244-44cb2a4c2c0b?w=600&h=800&fit=crop",
  },
  {
    name: "Ceramic Soap Dispenser Set",
    slug: "ceramic-soap-dispenser-set",
    desc: "Minimalist ceramic soap and lotion dispenser set in matte white.",
    price: 1999,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=800&fit=crop",
  },
  {
    name: "Bamboo Tissue Box Holder",
    slug: "bamboo-tissue-box-holder",
    desc: "Sustainable bamboo tissue cover that replaces unsightly cardboard boxes.",
    price: 999,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&h=800&fit=crop",
  },
  {
    name: "Leather Tissue Box Cover",
    slug: "leather-tissue-box-cover",
    desc: "Premium vegan leather tissue cover in tan with embossed stitching detail.",
    price: 1499,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&h=800&fit=crop&q=80&sat=-30",
  },
  {
    name: "Terracotta Pot Set of 3",
    slug: "terracotta-pot-set-of-3",
    desc: "Classic terracotta pots in three sizes with drainage holes for healthy roots.",
    price: 1499,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&h=800&fit=crop&q=80&sat=-20",
  },
  {
    name: "Self-Watering Ceramic Planter",
    slug: "self-watering-ceramic-planter",
    desc: "Clever self-watering planter with a built-in reservoir — keeps plants hydrated for days.",
    price: 1999,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600&h=800&fit=crop",
  },
  {
    name: "Metal Sculptural Vase",
    slug: "metal-sculptural-vase",
    desc: "Abstract sculptural vase in brushed metal — a piece of art even without flowers.",
    price: 4999,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=600&h=800&fit=crop",
  },
  {
    name: "Ceramic Bud Vase",
    slug: "ceramic-bud-vase",
    desc: "Delicate ceramic bud vase in a speckled glaze, perfect for a single stem.",
    price: 999,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1612196808214-b7e239e5c5c4?w=600&h=800&fit=crop&q=80&sat=-40",
  },
  {
    name: "Embroidered Cotton Cushion Cover",
    slug: "embroidered-cotton-cushion-cover",
    desc: "Hand-embroidered cotton cover with folk-art inspired floral motifs.",
    price: 999,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1584100936595-c0c5f76f3f3a?w=600&h=800&fit=crop",
  },
  {
    name: "Touch-Lid Stainless Steel Bin",
    slug: "touch-lid-stainless-steel-bin",
    desc: "Sleek stainless steel pedal bin with soft-close touch lid and fingerprint-resistant finish.",
    price: 2999,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1607167465959-4a0f8a3a4a12?w=600&h=800&fit=crop",
  },
  {
    name: "Rattan Waste Basket",
    slug: "rattan-waste-basket",
    desc: "Natural rattan waste basket that brings warmth to bathrooms and offices.",
    price: 1499,
    cat: "Accessories",
    image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&h=800&fit=crop&q=80&sat=-30",
  },
];

async function main() {
  // Get category IDs
  const cats = await prisma.category.findMany({ select: { id: true, name: true } });
  for (const c of cats) CAT[c.name] = c.id;

  // Delete existing products
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  console.log("Cleared old products");

  let created = 0;
  for (const p of products) {
    const catId = CAT[p.cat];
    if (!catId) {
      console.log(`  ⚠ Category "${p.cat}" not found, skipping ${p.name}`);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.desc,
        status: "ACTIVE",
        isActive: true,
        isFeatured: p.featured || false,
        isBestseller: false,
        isNewArrival: false,
        isComingSoon: false,
        isLimitedEdition: false,
        regularPrice: p.price,
        stockQuantity: 50,
        trackInventory: true,
        categoryId: catId,
        publishedAt: new Date(),
      },
    });

    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: p.image,
        alt: p.name,
        isPrimary: true,
        position: 0,
      },
    });

    created++;
    console.log(`  ✓ ${p.name} (${p.cat})`);
  }

  // Print category counts
  for (const [catName, catId] of Object.entries(CAT)) {
    const count = await prisma.product.count({ where: { categoryId: catId } });
    console.log(`  📦 ${catName}: ${count} products`);
  }

  console.log(`\n✅ Done — ${created} products created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
