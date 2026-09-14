import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("key") !== "doit") return NextResponse.json({ error: "unauth" }, { status: 401 });

  try {
    const lampCat = await db.category.findUnique({ where: { slug: "lamps" } });
    if (!lampCat) return NextResponse.json({ error: "No lamps category found" });

    // Get all Designer Lamp products
    const lampProducts = await db.product.findMany({
      where: { categoryId: lampCat.id, name: { startsWith: "Designer Lamp" } },
      orderBy: { name: "asc" },
      include: { images: { orderBy: { position: "asc" } }, variants: true }
    });

    if (lampProducts.length === 0) return NextResponse.json({ error: "No designer lamps found" });

    // Keep the first one as the master, delete the rest
    const master = lampProducts[0];
    const toDelete = lampProducts.slice(1);

    // Collect all images and create variants from deleted products
    const allImages = [...master.images];
    const variantsToCreate = [];

    for (const p of toDelete) {
      // Add its primary image to master if unique
      if (p.images.length > 0) {
        const img = p.images[0];
        const exists = allImages.some(i => i.url === img.url);
        if (!exists) {
          allImages.push({ ...img, id: undefined });
        }
      }
      // Create variant from this product
      variantsToCreate.push({
        productId: master.id,
        name: p.name,
        sku: p.sku || null,
        price: p.regularPrice,
        salePrice: p.salePrice,
        stockQuantity: p.stockQuantity,
        isActive: p.isActive,
        position: variantsToCreate.length,
      });
    }

    // If master has no variants yet, create one from master's current data
    const existingVariants = await db.productVariant.findMany({ where: { productId: master.id } });
    if (existingVariants.length === 0) {
      variantsToCreate.unshift({
        productId: master.id,
        name: master.name,
        sku: master.sku,
        price: master.regularPrice,
        salePrice: master.salePrice,
        stockQuantity: master.stockQuantity,
        isActive: master.isActive,
        position: 0,
      });
    }

    // Step 1: Update master product name and slug
    await db.product.update({
      where: { id: master.id },
      data: {
        name: "Designer Lamp",
        slug: "designer-lamp",
        shortDescription: "Choose from 34 stunning designer lamp designs to elevate your living spaces.",
      }
    });

    // Step 2: Delete old images from master and re-add consolidated
    await db.productImage.deleteMany({ where: { productId: master.id } });
    
    for (let i = 0; i < allImages.length; i++) {
      const img = allImages[i];
      await db.productImage.create({
        data: {
          productId: master.id,
          url: img.url,
          alt: img.alt || "Designer Lamp",
          position: i,
          isPrimary: i === 0,
          imageType: img.imageType || "PRODUCT",
        }
      });
    }

    // Step 3: Create all variants
    for (const v of variantsToCreate) {
      await db.productVariant.create({ data: v });
    }

    // Step 4: Delete duplicate products
    let deletedCount = 0;
    for (const p of toDelete) {
      await db.productVariant.deleteMany({ where: { productId: p.id } });
      await db.productImage.deleteMany({ where: { productId: p.id } });
      await db.product.delete({ where: { id: p.id } });
      deletedCount++;
    }

    return NextResponse.json({
      success: true,
      master: master.id,
      masterNewName: "Designer Lamp",
      variantsCreated: variantsToCreate.length,
      deletedProducts: deletedCount,
      totalImagesConsolidated: allImages.length
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
