import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);
    const status = searchParams.get("status");
    const showAll = searchParams.get("all") === "true";
    const where: any = {};

    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (showAll && ["ADMIN", "MANAGER", "ORDER_MANAGER"].includes(role)) {
      // Staff can see all orders.
    } else {
      where.userId = (session.user as any).id;
    }
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: { items: true, payment: true, statusHistory: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    return NextResponse.json({
      orders: orders.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        deliveryCharge: Number(o.deliveryCharge),
        tax: Number(o.tax),
        total: Number(o.total),
        items: o.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          salePrice: i.salePrice != null ? Number(i.salePrice) : null,
          totalPrice: Number(i.totalPrice),
        })),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const userId = (session.user as any).id;
    const {
      customerName, customerEmail, customerPhone,
      addressLine1, addressLine2, city, state, pinCode, country,
      items, paymentMethod, deliveryMethod, customerNotes, couponCode,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items in cart" }, { status: 400 });
    }
    if (items.length > 100) return NextResponse.json({ error: "Too many items" }, { status: 400 });
    if (!customerName || !customerPhone || !addressLine1 || !city || !state || !pinCode) {
      return NextResponse.json({ error: "Missing required address information" }, { status: 400 });
    }

    const productIds = [...new Set(items.map((item: any) => item.productId).filter(Boolean))];
    const variantIds = [...new Set(items.filter((item: any) => item.variantId).map((item: any) => item.variantId))];
    if (productIds.length !== items.length && variantIds.length === 0) {
      return NextResponse.json({ error: "Invalid order items" }, { status: 400 });
    }

    const [products, variants] = await Promise.all([
      db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, regularPrice: true, salePrice: true, isActive: true, stockQuantity: true, trackInventory: true, allowBackorder: true },
      }),
      variantIds.length > 0
        ? db.productVariant.findMany({
            where: { id: { in: variantIds }, isActive: true },
            select: { id: true, productId: true, name: true, price: true, salePrice: true, stockQuantity: true },
          })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));
    let serverSubtotal = 0;

    const validatedItems = items.map((item: any) => {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
        throw new Error("Invalid item quantity");
      }
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) throw new Error(`Product ${item.productId} not found or inactive`);

      let regularPrice: number;
      let salePrice: number | null = null;
      let variantName = item.variantName || null;

      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant || variant.productId !== product.id) throw new Error(`Invalid variant for ${product.name}`);
        regularPrice = Number(variant.price);
        salePrice = variant.salePrice != null ? Number(variant.salePrice) : null;
        variantName = variant.name;
        if (product.trackInventory && !product.allowBackorder && variant.stockQuantity < quantity) {
          throw new Error(`Insufficient stock for ${product.name} (${variant.name})`);
        }
      } else {
        regularPrice = Number(product.regularPrice);
        salePrice = product.salePrice != null ? Number(product.salePrice) : null;
        if (product.trackInventory && !product.allowBackorder && product.stockQuantity < quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }

      const effectivePrice = salePrice != null && salePrice > 0 ? salePrice : regularPrice;
      if (!Number.isFinite(effectivePrice) || effectivePrice < 0) throw new Error(`Invalid price for ${product.name}`);
      const totalPrice = effectivePrice * quantity;
      serverSubtotal += totalPrice;

      return {
        ...item,
        productName: product.name,
        variantName,
        quantity,
        unitPrice: effectivePrice,
        salePrice: salePrice != null && salePrice > 0 ? salePrice : null,
        totalPrice,
      };
    });

    let serverDiscount = 0;
    let serverCouponId: string | null = null;
    if (couponCode) {
      const coupon = await db.coupon.findUnique({
        where: { code: String(couponCode).trim().toUpperCase() },
      });
      if (!coupon || !coupon.isActive) return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
      const now = new Date();
      if (coupon.startsAt && coupon.startsAt > now) return NextResponse.json({ error: "Coupon is not active yet" }, { status: 400 });
      if (coupon.expiresAt && coupon.expiresAt < now) return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
      if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
      if (coupon.perCustomerLimit != null) {
        const usageCount = await db.couponUsage.count({ where: { couponId: coupon.id, userId } });
        if (usageCount >= coupon.perCustomerLimit) return NextResponse.json({ error: "Coupon per-customer usage limit reached" }, { status: 400 });
      }
      if (coupon.minOrderAmount != null && serverSubtotal < Number(coupon.minOrderAmount)) {
        return NextResponse.json({ error: `Minimum order ₹${coupon.minOrderAmount} required` }, { status: 400 });
      }
      if (coupon.type === "PERCENTAGE") {
        serverDiscount = serverSubtotal * (Number(coupon.value) / 100);
        if (coupon.maxDiscountAmount != null) serverDiscount = Math.min(serverDiscount, Number(coupon.maxDiscountAmount));
      } else {
        serverDiscount = Math.min(Number(coupon.value), serverSubtotal);
      }
      serverCouponId = coupon.id;
    }

    const settings = await db.siteSetting.findMany();
    const settingsObj: Record<string, any> = {};
    settings.forEach((s) => { settingsObj[s.key] = s.value; });
    const freeThreshold = Number(settingsObj.freeDeliveryThreshold) || 2000;
    const defaultDeliveryCharge = Number(settingsObj.defaultDeliveryCharge) || 149;
    const finalDeliveryCharge = deliveryMethod === "express"
      ? 299
      : serverSubtotal > freeThreshold ? 0 : defaultDeliveryCharge;

    // Tax is deliberately server-owned. Westhome currently has no tax rules in
    // the order schema/settings, so client-supplied tax is never accepted.
    const finalTax = 0;
    const finalSubtotal = serverSubtotal;
    const finalDiscount = serverDiscount;
    const finalTotal = Math.max(0, finalSubtotal - finalDiscount + finalDeliveryCharge + finalTax);

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    let orderNumber = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
      orderNumber = `WH${year}${month}${random}`;
      const existing = await db.order.findUnique({ where: { orderNumber }, select: { id: true } });
      if (!existing) break;
      if (attempt === 9) throw new Error("Failed to generate unique order number");
    }

    let order: any = null;
    for (let retry = 0; retry < 5; retry++) {
      try {
        order = await db.order.create({
          data: {
            orderNumber,
            userId,
            status: "NEW",
            customerName,
            customerEmail,
            customerPhone,
            addressLine1,
            addressLine2: addressLine2 || null,
            city,
            state,
            pinCode,
            country: country || "India",
            subtotal: finalSubtotal,
            discount: finalDiscount,
            deliveryCharge: finalDeliveryCharge,
            tax: finalTax,
            total: finalTotal,
            paymentMethod: paymentMethod || null,
            paymentStatus: "PENDING",
            deliveryMethod: deliveryMethod || "delivery",
            customerNotes: customerNotes || null,
            couponId: serverCouponId,
            couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
            items: {
              create: validatedItems.map((item: any) => ({
                productId: item.productId,
                variantId: item.variantId || null,
                productName: item.productName,
                variantName: item.variantName || null,
                sku: item.sku || null,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                salePrice: item.salePrice,
                totalPrice: item.totalPrice,
                image: item.image || null,
                customSize: item.customSize || null,
              })),
            },
            statusHistory: { create: { status: "NEW", note: "Order placed" } },
          },
        });
        break;
      } catch (e: any) {
        if (e?.code === "P2002" && retry < 4) {
          const newRandom = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
          orderNumber = `WH${year}${month}${newRandom}`;
          continue;
        }
        throw e;
      }
    }
    if (!order) throw new Error("Failed to create order after retries");

    if (paymentMethod !== "cod") {
      await db.payment.create({ data: { orderId: order.id, amount: finalTotal, currency: "INR", status: "PENDING" } });
    } else {
      try {
        await db.$transaction(async (tx) => {
          const freshOrder = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
          if (!freshOrder) throw new Error("Order not found");

          for (const item of freshOrder.items) {
            if (item.variantId) {
              const result = await tx.productVariant.updateMany({
                where: { id: item.variantId, isActive: true, stockQuantity: { gte: item.quantity } },
                data: { stockQuantity: { decrement: item.quantity } },
              });
              if (result.count !== 1) throw new Error(`Insufficient stock for ${item.productName}`);
            } else {
              const product = await tx.product.findUnique({ where: { id: item.productId }, select: { trackInventory: true, allowBackorder: true, isActive: true } });
              if (!product || !product.isActive) throw new Error(`Product ${item.productName} is no longer available`);
              if (product.trackInventory && !product.allowBackorder) {
                const result = await tx.product.updateMany({ where: { id: item.productId, stockQuantity: { gte: item.quantity } }, data: { stockQuantity: { decrement: item.quantity } } });
                if (result.count !== 1) throw new Error(`Insufficient stock for ${item.productName}`);
              }
            }
          }

          if (freshOrder.couponId && freshOrder.userId) {
            const coupon = await tx.coupon.findUnique({ where: { id: freshOrder.couponId } });
            if (!coupon || !coupon.isActive) throw new Error("Coupon is no longer available");
            if (coupon.perCustomerLimit != null) {
              const usageCount = await tx.couponUsage.count({ where: { couponId: coupon.id, userId: freshOrder.userId } });
              if (usageCount >= coupon.perCustomerLimit) throw new Error("Coupon per-customer usage limit reached");
            }
            const updated = await tx.coupon.updateMany({
              where: { id: coupon.id, isActive: true, ...(coupon.usageLimit != null ? { usedCount: { lt: coupon.usageLimit } } : {}) },
              data: { usedCount: { increment: 1 } },
            });
            if (updated.count !== 1) throw new Error("Coupon usage limit reached");
            await tx.couponUsage.create({ data: { couponId: coupon.id, userId: freshOrder.userId, orderId: freshOrder.id } });
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "CONFIRMED",
              paymentStatus: "PENDING",
              statusHistory: { create: { status: "CONFIRMED", note: "COD order confirmed; inventory and coupon usage committed atomically" } },
            },
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
      } catch (error) {
        await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } }).catch(() => {});
        throw error;
      }
    }

    await db.notification.create({
      data: {
        type: "ORDER_PLACED",
        title: "New Order",
        message: `Order ${orderNumber} placed by ${customerName} for ₹${finalTotal}`,
        orderId: order.id,
        readBy: "[]",
      },
    });

    return NextResponse.json({ order: { id: order.id, orderNumber: order.orderNumber } }, { status: 201 });
  } catch (error: any) {
    console.error("Order creation error:", error?.message || error);
    const msg = error?.message || "Failed to create order";
    if (/Invalid item|Insufficient stock|Coupon|Product .*not found|Product .*inactive|not available/.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
