import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });
  console.log("🌱 Seeding WESTHOME database...\n");

  // ============================================================
  // ADMIN USER
  // ============================================================
  console.log("👤 Creating admin user...");
  const adminPasswordHash = await bcrypt.hash("Westhome1144", 12);
  const admin = await db.user.upsert({
    where: { email: "sanoojbm1144@gmail.com" },
    update: { name: "sanooj" },
    create: {
      name: "sanooj",
      email: "sanoojbm1144@gmail.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log(`   ✅ Admin: ${admin.email} / Westhome1144`);

  // ============================================================
  // STAFF USER
  // ============================================================
  console.log("\n👤 Creating staff user...");
  const staffPasswordHash = await bcrypt.hash("SALLUshai@2005", 12);
  const staff = await db.user.upsert({
    where: { email: "salmansahil2005@gmail.com" },
    update: { name: "Sahil", role: "MANAGER", passwordHash: staffPasswordHash },
    create: {
      name: "Sahil",
      email: "salmansahil2005@gmail.com",
      passwordHash: staffPasswordHash,
      role: "MANAGER",
      emailVerified: new Date(),
    },
  });
  console.log(`   ✅ Staff: ${staff.email} / SALLUshai@2005`);

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
    { name: "Dustbin", slug: "dustbin", position: 6 },
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
        freeDeliveryThreshold: 2000,
        defaultDeliveryCharge: 149,
        estimatedDeliveryDays: 5,
        storePickup: true,
      },
      group: "delivery",
    },
    { key: "freeDeliveryThreshold", value: 2000, group: "delivery" },
    { key: "defaultDeliveryCharge", value: 149, group: "delivery" },
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
  console.log("   Admin login: sanoojbm1144@gmail.com / Westhome1144");
  console.log("   Staff login: salmansahil2005@gmail.com / SALLUshai@2005");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    });
