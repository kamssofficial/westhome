import { PrismaClient, ProductStatus, PurchaseMethod } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding WESTHOME database...\n");

  // ============================================================
  // ADMIN USER
  // ============================================================
  console.log("👤 Creating admin user...");
  const adminPasswordHash = await bcrypt.hash("admin123", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@westhomebybmd.com" },
    update: {},
    create: {
      name: "WESTHOME Admin",
      email: "admin@westhomebybmd.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log(`   ✅ Admin: ${admin.email} / admin123`);

  // ============================================================
  // CATEGORIES (in correct order)
  // ============================================================
  console.log("\n📂 Creating categories...");

  const categoryData = [
    { name: "Wall Decor", slug: "wall-decor", position: 1, description: "Elevate your walls with premium art, frames, and decorative pieces" },
    { name: "Laundry", slug: "laundry", position: 2, description: "Premium laundry accessories and organization solutions" },
    { name: "Comforters", slug: "comforters", position: 3, description: "Luxurious comforters for a perfect night's sleep" },
    { name: "Lamps", slug: "lamps", position: 4, description: "Designer lamps and lighting for every room" },
    { name: "Carpets", slug: "carpets", position: 5, description: "Handpicked carpets and rugs for warmth and style" },
    { name: "Clocks", slug: "clocks", position: 6, description: "Elegant wall and desk clocks" },
    { name: "Accessories", slug: "accessories", position: 7, description: "Home accessories to complete your living spaces" },
  ];

  const categories: Record<string, any> = {};
  for (const cat of categoryData) {
    categories[cat.slug] = await db.category.upsert({
      where: { slug: cat.slug },
      update: { position: cat.position, description: cat.description },
      create: cat,
    });
    console.log(`   ✅ ${cat.name}`);
  }

  // ============================================================
  // ACCESSORIES SUBCATEGORIES
  // ============================================================
  console.log("\n📂 Creating Accessories subcategories...");

  const accessoriesSubData = [
    { name: "Soap Dispensers", slug: "soap-dispensers", position: 1 },
    { name: "Cushion Covers", slug: "cushion-covers", position: 2 },
    { name: "Vases", slug: "vases", position: 3 },
    { name: "Flower Pots", slug: "flower-pots", position: 4 },
    { name: "Tissue Boxes", slug: "tissue-boxes", position: 5 },
  ];

  const accessoriesId = categories["accessories"].id;
  const subcategories: Record<string, any> = {};
  for (const sub of accessoriesSubData) {
    subcategories[sub.slug] = await db.subcategory.upsert({
      where: { slug: sub.slug },
      update: { position: sub.position },
      create: { ...sub, categoryId: accessoriesId },
    });
    console.log(`   ✅ Accessories > ${sub.name}`);
  }

  // ============================================================
  // SAMPLE PRODUCTS
  // ============================================================
  console.log("\n📦 Creating sample products...");

  interface ProductDef {
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    regularPrice: number;
    salePrice?: number;
    stockQuantity: number;
    categoryId: string;
    subcategoryId?: string;
    isFeatured?: boolean;
    isBestseller?: boolean;
    isNewArrival?: boolean;
    status: ProductStatus;
    purchaseMethod: PurchaseMethod;
    allowCustomSize?: boolean;
    customSizeUnit?: string;
    customSizeRequiresApproval?: boolean;
    images?: { url: string; alt: string; isPrimary: boolean; position: number }[];
    variants?: { name: string; price: number; salePrice?: number; stockQuantity: number; sku: string; isActive: boolean; position: number }[];
    variantAttributes?: { name: string; values: string[]; position: number }[];
  }

  const sampleProducts: ProductDef[] = [
    {
      name: "Abstract Canvas Wall Art - Golden Hour",
      slug: "abstract-canvas-golden-hour",
      description: "Premium abstract canvas art featuring warm golden tones. Perfect for living rooms and bedrooms.",
      shortDescription: "Premium abstract canvas art in warm golden tones",
      regularPrice: 2499,
      salePrice: 1999,
      stockQuantity: 15,
      categoryId: categories["wall-decor"].id,
      isFeatured: true,
      isNewArrival: true,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BOTH" as PurchaseMethod,
      images: [{ url: "/images/placeholder/product-1.jpg", alt: "Abstract Canvas Wall Art", isPrimary: true, position: 0 }],
    },
    {
      name: "Decorative Wall Mirror - Round Gold Frame",
      slug: "decorative-wall-mirror-round-gold",
      description: "Elegant round wall mirror with premium gold-finished frame. Adds depth and sophistication to any room.",
      shortDescription: "Elegant round mirror with gold frame",
      regularPrice: 3299,
      stockQuantity: 8,
      categoryId: categories["wall-decor"].id,
      isBestseller: true,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BOTH" as PurchaseMethod,
      images: [{ url: "/images/placeholder/product-2.jpg", alt: "Round Gold Mirror", isPrimary: true, position: 0 }],
    },
    {
      name: "Premium Velvet Comforter - Queen Size",
      slug: "premium-velvet-comforter-queen",
      description: "Luxuriously soft velvet comforter. Double-brushed microfiber with premium filling for year-round comfort.",
      shortDescription: "Luxuriously soft velvet comforter",
      regularPrice: 4999,
      salePrice: 3999,
      stockQuantity: 20,
      categoryId: categories["comforters"].id,
      isFeatured: true,
      isBestseller: true,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BUY_ONLINE" as PurchaseMethod,
      variants: [
        { name: "Single", price: 3499, salePrice: 2999, stockQuantity: 10, sku: "WH-COMF-SGL", isActive: true, position: 0 },
        { name: "Double", price: 4499, salePrice: 3499, stockQuantity: 8, sku: "WH-COMF-DBL", isActive: true, position: 1 },
        { name: "Queen", price: 4999, salePrice: 3999, stockQuantity: 10, sku: "WH-COMF-QEN", isActive: true, position: 2 },
        { name: "King", price: 5999, salePrice: 4999, stockQuantity: 5, sku: "WH-COMF-KNG", isActive: true, position: 3 },
      ],
      variantAttributes: [
        { name: "Size", values: ["Single", "Double", "Queen", "King"], position: 0 },
      ],
    },
    {
      name: "Egyptian Cotton Comforter - Premium Collection",
      slug: "egyptian-cotton-comforter-premium",
      description: "400 thread count Egyptian cotton comforter. Breathable, durable, and incredibly soft.",
      shortDescription: "400TC Egyptian cotton comforter",
      regularPrice: 6999,
      stockQuantity: 12,
      categoryId: categories["comforters"].id,
      isNewArrival: true,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BOTH" as PurchaseMethod,
    },
    {
      name: "Modern Arc Floor Lamp - Matte Black",
      slug: "modern-arc-floor-lamp-matte-black",
      description: "Sleek arc floor lamp with adjustable head and warm LED lighting. Perfect for reading corners.",
      shortDescription: "Sleek arc floor lamp with adjustable head",
      regularPrice: 3999,
      salePrice: 3499,
      stockQuantity: 10,
      categoryId: categories["lamps"].id,
      isFeatured: true,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BOTH" as PurchaseMethod,
    },
    {
      name: "Ceramic Table Lamp - Cream",
      slug: "ceramic-table-lamp-cream",
      description: "Handcrafted ceramic table lamp with linen shade. Warm ambient lighting for bedrooms and living rooms.",
      shortDescription: "Handcrafted ceramic table lamp",
      regularPrice: 2499,
      stockQuantity: 15,
      categoryId: categories["lamps"].id,
      isBestseller: true,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BOTH" as PurchaseMethod,
    },
    {
      name: "Hand-Tufted Wool Carpet - Beige",
      slug: "hand-tufted-wool-carpet-beige",
      description: "Premium hand-tufted wool carpet. Soft underfoot, durable, and easy to maintain.",
      shortDescription: "Premium hand-tufted wool carpet",
      regularPrice: 5999,
      stockQuantity: 8,
      categoryId: categories["carpets"].id,
      isFeatured: true,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "WHATSAPP" as PurchaseMethod,
      allowCustomSize: true,
      customSizeUnit: "cm",
      customSizeRequiresApproval: true,
      variants: [
        { name: "4x6 ft", price: 5999, stockQuantity: 5, sku: "WH-CARP-4X6", isActive: true, position: 0 },
        { name: "6x9 ft", price: 8999, stockQuantity: 3, sku: "WH-CARP-6X9", isActive: true, position: 1 },
        { name: "8x10 ft", price: 12999, stockQuantity: 2, sku: "WH-CARP-8X10", isActive: true, position: 2 },
      ],
      variantAttributes: [
        { name: "Size", values: ["4x6 ft", "6x9 ft", "8x10 ft"], position: 0 },
      ],
    },
    {
      name: "Minimalist Wall Clock - Wooden Frame",
      slug: "minimalist-wall-clock-wooden",
      description: "Clean minimalist wall clock with natural wooden frame. Silent quartz movement.",
      shortDescription: "Minimalist clock with wooden frame",
      regularPrice: 1499,
      stockQuantity: 20,
      categoryId: categories["clocks"].id,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BUY_ONLINE" as PurchaseMethod,
    },
    {
      name: "Vintage Metal Wall Clock - Antique Finish",
      slug: "vintage-metal-wall-clock-antique",
      description: "Classic vintage-style metal wall clock with antique finish. A statement piece for any room.",
      shortDescription: "Vintage metal clock with antique finish",
      regularPrice: 1999,
      salePrice: 1699,
      stockQuantity: 12,
      categoryId: categories["clocks"].id,
      isNewArrival: true,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BOTH" as PurchaseMethod,
    },
    {
      name: "Premium Laundry Basket - Woven Design",
      slug: "premium-laundry-basket-woven",
      description: "Durable woven laundry basket with handles. Elegant design that complements any bathroom or bedroom.",
      shortDescription: "Durable woven laundry basket",
      regularPrice: 1299,
      stockQuantity: 25,
      categoryId: categories["laundry"].id,
      isBestseller: true,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BOTH" as PurchaseMethod,
    },
    {
      name: "Ceramic Flower Vase - Terracotta",
      slug: "ceramic-flower-vase-terracotta",
      description: "Handmade ceramic vase in warm terracotta finish. Perfect for fresh or dried flowers.",
      shortDescription: "Handmade ceramic vase in terracotta",
      regularPrice: 899,
      stockQuantity: 30,
      categoryId: categories["accessories"].id,
      subcategoryId: subcategories["vases"].id,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BOTH" as PurchaseMethod,
    },
    {
      name: "Indoor Plant Pot - White Ceramic Set",
      slug: "indoor-plant-pot-white-ceramic-set",
      description: "Set of 3 white ceramic plant pots in graduating sizes. Drainage holes included.",
      shortDescription: "Set of 3 white ceramic plant pots",
      regularPrice: 1499,
      salePrice: 1199,
      stockQuantity: 18,
      categoryId: categories["accessories"].id,
      subcategoryId: subcategories["flower-pots"].id,
      isFeatured: true,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BUY_ONLINE" as PurchaseMethod,
    },
    {
      name: "Velvet Cushion Cover - Emerald Green",
      slug: "velvet-cushion-cover-emerald",
      description: "Premium velvet cushion cover with invisible zipper. 16x16 inch.",
      shortDescription: "Premium velvet cushion cover",
      regularPrice: 599,
      stockQuantity: 40,
      categoryId: categories["accessories"].id,
      subcategoryId: subcategories["cushion-covers"].id,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BOTH" as PurchaseMethod,
    },
    {
      name: "Leather Tissue Box Cover - Brown",
      slug: "leather-tissue-box-cover-brown",
      description: "Premium leather tissue box cover. Elegant addition to any coffee table or desk.",
      shortDescription: "Premium leather tissue box cover",
      regularPrice: 799,
      stockQuantity: 22,
      categoryId: categories["accessories"].id,
      subcategoryId: subcategories["tissue-boxes"].id,
      isNewArrival: true,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BOTH" as PurchaseMethod,
    },
    {
      name: "Automatic Soap Dispenser - Stainless Steel",
      slug: "automatic-soap-dispenser-stainless",
      description: "Touchless automatic soap dispenser with stainless steel finish. Battery operated.",
      shortDescription: "Touchless stainless steel soap dispenser",
      regularPrice: 1299,
      stockQuantity: 15,
      categoryId: categories["accessories"].id,
      subcategoryId: subcategories["soap-dispensers"].id,
      status: "ACTIVE" as ProductStatus,
      purchaseMethod: "BUY_ONLINE" as PurchaseMethod,
    },
  ];

  for (const productDef of sampleProducts) {
    const { images, variants, variantAttributes, ...data } = productDef;

    // Create product
    let product;
    const existing = await db.product.findUnique({ where: { slug: data.slug } });

    if (existing) {
      product = existing;
    } else {
      product = await db.product.create({
        data: {
          ...data,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId || null,
          images: images ? {
            create: images.map((img) => ({
              url: img.url,
              alt: img.alt,
              isPrimary: img.isPrimary,
              position: img.position,
            })),
          } : undefined,
        },
      });
    }

    // Create variant attributes and variants
    if (variantAttributes && variants) {
      for (const va of variantAttributes) {
        const attr = await db.variantAttribute.upsert({
          where: { productId_name: { productId: product.id, name: va.name } },
          update: { position: va.position },
          create: {
            productId: product.id,
            name: va.name,
            position: va.position,
          },
        });

        for (const v of variants) {
          let variant = await db.productVariant.findFirst({
            where: { productId: product.id, sku: v.sku },
          });

          if (!variant) {
            variant = await db.productVariant.create({
              data: {
                productId: product.id,
                name: v.name,
                sku: v.sku,
                price: v.price,
                salePrice: v.salePrice ?? null,
                stockQuantity: v.stockQuantity,
                isActive: v.isActive,
                position: v.position,
              },
            });
          }

          // Link variant to attribute value
          const existingAttrValue = await db.variantAttributeValue.findUnique({
            where: {
              variantAttributeId_variantId: {
                variantAttributeId: attr.id,
                variantId: variant.id,
              },
            },
          });

          if (!existingAttrValue) {
            await db.variantAttributeValue.create({
              data: {
                variantAttributeId: attr.id,
                variantId: variant.id,
                value: v.name,
                position: v.position,
              },
            });
          }
        }
      }
    }

    console.log(`   ✅ ${product.name}`);
  }

  // ============================================================
  // SITE SETTINGS
  // ============================================================
  console.log("\n⚙️ Creating site settings...");

  const settingsData: { key: string; value: any; group: string }[] = [
    { key: "storeName", value: "WESTHOME", group: "general" },
    { key: "contactPhone", value: "+919999999999", group: "contact" },
    { key: "whatsappNumber", value: "+919999999999", group: "contact" },
    { key: "contactEmail", value: "info@westhomebybmd.com", group: "contact" },
    { key: "currency", value: "INR", group: "general" },
    {
      key: "deliveryConfig",
      value: {
        freeDeliveryThreshold: 999,
        defaultDeliveryCharge: 49,
        estimatedDeliveryDays: 5,
        storePickup: true,
      },
      group: "delivery",
    },
  ];

  for (const setting of settingsData) {
    await db.siteSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value, group: setting.group },
    });
  }
  console.log("   ✅ Store settings created");

  // ============================================================
  // CONTENT PAGES
  // ============================================================
  console.log("\n📄 Creating content pages...");

  const contentPages = [
    { slug: "about", title: "About WESTHOME", content: "WESTHOME by BM Distributors is a premium home lifestyle brand offering curated products for modern living." },
    { slug: "contact", title: "Contact Us", content: "Reach us via phone, email, or WhatsApp for any queries." },
    { slug: "faq", title: "Frequently Asked Questions", content: "Find answers to common questions about orders, delivery, and returns." },
  ];

  for (const page of contentPages) {
    await db.contentPage.upsert({
      where: { slug: page.slug },
      update: { content: page.content },
      create: page,
    });
  }
  console.log("   ✅ Content pages created");

  // ============================================================
  // HOMEPAGE SECTIONS
  // ============================================================
  console.log("\n🏠 Creating homepage sections...");

  const existingSections = await db.homepageSection.count();
  if (existingSections === 0) {
    const sections = [
      { type: "HERO" as const, title: "Elevate Your Living Space", subtitle: "Premium Home & Lifestyle", position: 0, isActive: true },
      { type: "CATEGORIES" as const, title: "Shop by Category", position: 1, isActive: true },
      { type: "FEATURED_PRODUCTS" as const, title: "Featured Products", subtitle: "Our handpicked selection", position: 2, isActive: true },
      { type: "NEW_ARRIVALS" as const, title: "New Arrivals", subtitle: "Fresh additions to our collection", position: 3, isActive: true },
      { type: "BRAND_STORY" as const, title: "Why WESTHOME", position: 4, isActive: true },
      { type: "STORE_INFO" as const, title: "Visit Our Store", position: 5, isActive: true },
    ];

    for (const section of sections) {
      await db.homepageSection.create({ data: section });
    }
    console.log("   ✅ Homepage sections created");
  } else {
    console.log("   ⏭️ Homepage sections already exist, skipping");
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  const counts = await Promise.all([
    db.user.count(),
    db.category.count(),
    db.subcategory.count(),
    db.product.count(),
    db.productVariant.count(),
    db.siteSetting.count(),
    db.contentPage.count(),
    db.homepageSection.count(),
  ]);

  console.log("\n📊 Seed Summary:");
  console.log(`   Users: ${counts[0]}`);
  console.log(`   Categories: ${counts[1]}`);
  console.log(`   Subcategories: ${counts[2]}`);
  console.log(`   Products: ${counts[3]}`);
  console.log(`   Variants: ${counts[4]}`);
  console.log(`   Settings: ${counts[5]}`);
  console.log(`   Content Pages: ${counts[6]}`);
  console.log(`   Homepage Sections: ${counts[7]}`);

  console.log("\n🎉 Seed complete!");
  console.log("   Admin login: admin@westhomebybmd.com / admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
