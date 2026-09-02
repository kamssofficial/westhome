import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

function validateAndNormalizePhone(phone: string): string | null {
  if (!phone || typeof phone !== "string") return null;
  let cleaned = phone.replace(/[^\d]/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("91") && cleaned.length > 10) cleaned = cleaned.slice(2);
  if (!/^\d{10}$/.test(cleaned) || !/^[6-9]/.test(cleaned)) return null;
  return cleaned;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const status = searchParams.get("status");
    const showAll = searchParams.get("all") === "true";
    const where: any = {};
    if (session?.user) {
      const role = (session.user as any).role;
      if (!(showAll && ["ADMIN", "MANAGER", "ORDER_MANAGER"].includes(role))) where.userId = (session.user as any).id;
    } else return NextResponse.json({ orders: [], total: 0 });
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      db.order.findMany({ where, include: { items: true, payment: true, statusHistory: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      db.order.count({ where }),
    ]);
    return NextResponse.json({ orders: orders.map((o) => ({ ...o, subtotal: Number(o.subtotal), discount: Number(o.discount), deliveryCharge: Number(o.deliveryCharge), tax: Number(o.tax), total: Number(o.total), items: o.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), salePrice: i.salePrice === null ? null : Number(i.salePrice), totalPrice: Number(i.totalPrice) })) })), total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ orders: [], total: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const userId = (session.user as any).id as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { customerName, customerEmail, customerPhone, addressLine1, addressLine2, city, state, pinCode, country, items, deliveryMethod, customerNotes, couponCode } = body;
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
    if (!customerName || !customerPhone || !addressLine1 || !city || !state || !pinCode) return NextResponse.json({ error: "Missing required address information" }, { status: 400 });

    const normalizedPhone = validateAndNormalizePhone(customerPhone);
    if (!normalizedPhone) return NextResponse.json({ error: "A valid 10-digit mobile number is required to place an order" }, { status: 400 });

    const productIds = [...new Set(items.map((item: any) => item?.productId).filter((id: unknown): id is string => typeof id === "string" && id.length > 0))];
    if (productIds.length === 0 || productIds.length !== items.filter((item: any) => typeof item?.productId === "string" && item.productId.length > 0).length) return NextResponse.json({ error: "Invalid product in cart" }, { status: 400 });

    const [products, variants] = await Promise.all([
      db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, regularPrice: true, salePrice: true, isActive: true, status: true, stockQuantity: true, trackInventory: true, allowBackorder: true, categoryId: true } }),
      db.productVariant.findMany({ where: { productId: { in: productIds } }, select: { id: true, productId: true, name: true, price: true, salePrice: true, stockQuantity: true, isActive: true } }),
    ]);
    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    let serverSubtotal = 0;
    const validatedItems = [];
    for (const item of items) {
      const product = productMap.get(item.productId);
      const quantity = Number(item.quantity);
      if (!product || !product.isActive || product.status !== "ACTIVE") return NextResponse.json({ error: `Product ${item.productName || item.productId} is no longer available` }, { status: 409 });
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });

      let effectivePrice: number;
      let salePrice: number | null;
      let variantName = item.variantName || null;
      let sku = item.sku || null;
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant || variant.productId !== product.id || !variant.isActive) return NextResponse.json({ error: `Selected variant for ${product.name} is unavailable` }, { status: 409 });
        if (variant.stockQuantity < quantity) return NextResponse.json({ error: `Insufficient stock for ${variant.name}` }, { status: 409 });
        salePrice = variant.salePrice === null ? null : Number(variant.salePrice);
        effectivePrice = salePrice !== null && salePrice > 0 ? salePrice : Number(variant.price);
        variantName = variant.name;
        sku = variant.sku || sku;
      } else {
        if (product.trackInventory && !product.allowBackorder && product.stockQuantity < quantity) return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 409 });
        salePrice = product.salePrice === null ? null : Number(product.salePrice);
        effectivePrice = salePrice !== null && salePrice > 0 ? salePrice : Number(product.regularPrice);
      }
      if (!Number.isFinite(effectivePrice) || effectivePrice < 0) return NextResponse.json({ error: `Invalid price for ${product.name}` }, { status: 409 });
      serverSubtotal += effectivePrice * quantity;
      validatedItems.push({ productId: product.id, variantId: item.variantId || null, productName: product.name, variantName, sku, quantity, unitPrice: effectivePrice, salePrice, totalPrice: effectivePrice * quantity, image: item.image || null, customSize: item.customSize || null });
    }

    const settings = await db.siteSetting.findMany();
    const settingsObj: Record<string, any> = {};
    settings.forEach((s) => { settingsObj[s.key] = s.value; });
    const dc = settingsObj.deliveryConfig;
    const freeThreshold = dc ? Number(dc.freeDeliveryThreshold) || 2000 : Number(settingsObj.freeDeliveryThreshold) || 2000;
    const defaultDeliveryCharge = dc ? Number(dc.defaultDeliveryCharge) || 149 : Number(settingsObj.defaultDeliveryCharge) || 149;
    const finalDeliveryCharge = deliveryMethod === "express" ? 299 : serverSubtotal > freeThreshold ? 0 : defaultDeliveryCharge;

    let finalDiscount = 0;
    let couponId: string | null = null;
    let normalizedCouponCode: string | null = null;
    const requestedCoupon = typeof couponCode === "string" ? couponCode.trim().toUpperCase() : "";
    if (requestedCoupon) {
      const coupon = await db.coupon.findUnique({ where: { code: requestedCoupon }, include: { usages: { where: { userId } } } });
      if (!coupon || !coupon.isActive) return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
      const now = new Date();
      if (coupon.startsAt && coupon.startsAt > now) return NextResponse.json({ error: "This coupon is not yet valid" }, { status: 400 });
      if (coupon.expiresAt && coupon.expiresAt < now) return NextResponse.json({ error: "This coupon has expired" }, { status: 400 });
      if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return NextResponse.json({ error: "This coupon has reached its usage limit" }, { status: 400 });
      if (coupon.perCustomerLimit !== null && coupon.usages.length >= coupon.perCustomerLimit) return NextResponse.json({ error: "You have reached this coupon's usage limit" }, { status: 400 });
      if (coupon.minOrderAmount !== null && serverSubtotal < Number(coupon.minOrderAmount)) return NextResponse.json({ error: `Minimum order value for this coupon is ₹${coupon.minOrderAmount}` }, { status: 400 });
      finalDiscount = coupon.type === "PERCENTAGE" ? serverSubtotal * Number(coupon.value) / 100 : Number(coupon.value);
      if (coupon.maxDiscountAmount !== null) finalDiscount = Math.min(finalDiscount, Number(coupon.maxDiscountAmount));
      finalDiscount = Math.min(Math.max(finalDiscount, 0), serverSubtotal);
      couponId = coupon.id;
      normalizedCouponCode = coupon.code;
    }

    const finalTax = 0;
    const finalTotal = Math.max(0, serverSubtotal - finalDiscount + finalDeliveryCharge + finalTax);
    if (!Number.isFinite(finalTotal) || finalTotal <= 0) return NextResponse.json({ error: "Invalid order total" }, { status: 409 });

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const orderNumber = `WH${year}${month}${random}`;

    const order = await db.order.create({
      data: {
        orderNumber, userId, status: "NEW", customerName, customerEmail: customerEmail || "", customerPhone: normalizedPhone,
        addressLine1, addressLine2: addressLine2 || null, city, state, pinCode, country: country || "India",
        subtotal: serverSubtotal, discount: finalDiscount, deliveryCharge: finalDeliveryCharge, tax: finalTax, total: finalTotal,
        paymentMethod: "RAZORPAY", paymentStatus: "PENDING", deliveryMethod: deliveryMethod || "delivery", customerNotes: customerNotes || null,
        couponId, couponCode: normalizedCouponCode,
        items: { create: validatedItems },
        statusHistory: { create: { status: "NEW", note: "Order created; awaiting payment" } },
      },
    });

    await db.user.updateMany({ where: { id: userId, phone: null }, data: { phone: normalizedPhone } });
    await db.notification.create({ data: { type: "ORDER_PLACED", title: "New Order", message: `Order ${orderNumber} placed by ${customerName} for ₹${finalTotal}`, orderId: order.id, readBy: "[]" } });
    return NextResponse.json({ order: { id: order.id, orderNumber: order.orderNumber } }, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
