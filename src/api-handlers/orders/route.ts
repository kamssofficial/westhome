import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { restoreOrderStock } from "@/lib/inventory";
import { notifyNewOrder } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { isGuestClaimEnabled, mintGuestClaimToken, verifyGuestClaimToken } from "@/lib/guestOrder";

// Guest checkout abuse control: a small burst allowance per IP per window.
// Authenticated customers are exempt — they are already rate-limited by auth.
const guestOrderLimiter = rateLimit({ windowMs: 60_000, max: 5 });

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const showAll = searchParams.get("all") === "true";
    const where: any = {};

    if (session?.user) {
      const role = (session.user as any).role;
      // Admin/Manager/OrderManager can see all orders when ?all=true
      if (showAll && (role === "ADMIN" || role === "MANAGER" || role === "ORDER_MANAGER")) {
        // No userId filter — show all orders
      } else {
        // Regular customers only see their own orders
        where.userId = (session.user as any).id;
      }
    } else {
      // Guest order tracking: orderNumber + phone must both match, so a leaked
      // order number alone reveals nothing and guessing is impractical.
      const guestOrderNumber = searchParams.get("guestOrderNumber");
      const guestPhone = (searchParams.get("guestPhone") || "").replace(/\D/g, "");
      if (guestOrderNumber && guestPhone.length >= 10) {
        where.orderNumber = guestOrderNumber;
        where.customerPhone = { endsWith: guestPhone.slice(-10) };
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      db.order.findMany({ where, include: { items: true, payment: true, statusHistory: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      db.order.count({ where }),
    ]);
    return NextResponse.json({ orders: orders.map((o) => ({ ...o, subtotal: Number(o.subtotal), discount: Number(o.discount), deliveryCharge: Number(o.deliveryCharge), tax: Number(o.tax), total: Number(o.total), items: o.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), salePrice: i.salePrice ? Number(i.salePrice) : null, totalPrice: Number(i.totalPrice) })) })), total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const isGuest = !session?.user;
    if (isGuest) {
      if (!isGuestClaimEnabled()) {
        return NextResponse.json({ error: "Guest checkout is temporarily unavailable. Please sign in to place your order." }, { status: 503 });
      }
      if (!(await guestOrderLimiter.checkAsync(request))) {
        return NextResponse.json({ error: "Too many order attempts. Please wait a minute and try again." }, { status: 429 });
      }
    }

    const body = await request.json();
    const userId: string | null = isGuest ? null : (session!.user as any).id;

    const {
      customerName,
      customerEmail,
      customerPhone,
      addressLine1,
      addressLine2,
      city,
      state,
      pinCode,
      country,
      items,
      subtotal,
      discount,
      deliveryCharge,
      total,
      paymentMethod,
      deliveryMethod,
      customerNotes,
      couponCode,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items in cart" }, { status: 400 });
    }

    // Validate required fields
    if (!customerName || !customerPhone || !addressLine1 || !city || !state || !pinCode) {
      return NextResponse.json({ error: "Missing required address information" }, { status: 400 });
    }

    // Guests place orders with just contact + address details. The phone number
    // is the primary contact channel and doubles (with the order number) as the
    // guest order-lookup key; email is optional and only used for confirmations.
    const phoneDigits = String(customerPhone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      return NextResponse.json({ error: "Please enter a valid phone number (10-digit mobile preferred)." }, { status: 400 });
    }
    const guestEmail = String(customerEmail || "").trim();
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // SECURITY: Server-side price validation — recalculate from database
    // Fetch all products AND their variants in the order to validate prices
    const productIds = items.map((item: any) => item.productId);
    const variantIds = items.filter((item: any) => item.variantId).map((item: any) => item.variantId);
    
    const [products, variants] = await Promise.all([
      db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, regularPrice: true, salePrice: true, isActive: true, stockQuantity: true, trackInventory: true, sku: true },
      }),
      variantIds.length > 0 ? db.productVariant.findMany({
        where: { id: { in: variantIds }, isActive: true },
        select: { id: true, productId: true, price: true, salePrice: true, stockQuantity: true, sku: true },
      }) : Promise.resolve([]),
    ]);
    
    const productMap = new Map(products.map(p => [p.id, p]));
    const variantMap = new Map(variants.map(v => [v.id, v]));
    
    // Validate and recalculate server-side
    let serverSubtotal = 0;
    const validatedItems = items.map((item: any) => {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} not found or inactive`);
      }
      
      // Use variant price/stock if variant is specified
      let regularPrice: number;
      let salePrice: number | null = null;
      // SKU is resolved server-side from the DB — never trusted from the client —
      // so order pages always show the true code even if the cart is stale.
      let resolvedSku: string | null;
      
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant) throw new Error(`Variant ${item.variantId} not found`);
        // SECURITY: a variant must belong to the claimed product to prevent paying
        // variant B's price and decrementing variant B's stock while ordering product A.
        if (variant.productId !== item.productId) {
          throw new Error(`Variant ${item.variantId} does not belong to product ${item.productId}`);
        }
        // SKU is resolved server-side from the DB — never trusted from the client —
        // so order pages always show the true code even if the cart is stale.
        resolvedSku = variant.sku || product.sku || null;
        regularPrice = Number(variant.price);
        salePrice = variant.salePrice != null && Number(variant.salePrice) > 0 ? Number(variant.salePrice) : null;
        // Stock 0 is un-buyable regardless of trackInventory/allowBackorder.
        if (variant.stockQuantity < item.quantity) {
          throw new Error(`Out of stock: ${item.productName}${item.variantName ? ` (${item.variantName})` : ""}`);
        }
      } else {
        // Stock 0 is un-buyable regardless of trackInventory/allowBackorder.
        if (product.stockQuantity < item.quantity) {
          throw new Error(`Out of stock: ${item.productName}`);
        }
        regularPrice = Number(product.regularPrice);
        salePrice = product.salePrice ? Number(product.salePrice) : null;
        resolvedSku = product.sku || null;
      }
      
      // The customer pays the sale price when one is live; record that as the unit price.
      const effectivePrice = salePrice !== null && salePrice > 0 ? salePrice : regularPrice;
      const totalPrice = effectivePrice * item.quantity;
      serverSubtotal += totalPrice;
      return { ...item, unitPrice: effectivePrice, salePrice, totalPrice, sku: resolvedSku };
    });
    
    // Server-side coupon validation
    let serverDiscount = 0;
    let serverCouponId: string | null = null;
    if (couponCode) {
      const coupon = await db.coupon.findFirst({
        where: {
          code: couponCode.toUpperCase(),
          isActive: true,
        },
      });
      if (!coupon) {
        return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
      }
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
      }
      if (coupon.minOrderAmount && serverSubtotal < Number(coupon.minOrderAmount)) {
        return NextResponse.json({ error: `Minimum order ₹${coupon.minOrderAmount} required` }, { status: 400 });
      }
      if (coupon.type === "PERCENTAGE") {
        serverDiscount = serverSubtotal * (Number(coupon.value) / 100);
        if (coupon.maxDiscountAmount) serverDiscount = Math.min(serverDiscount, Number(coupon.maxDiscountAmount));
      } else {
        serverDiscount = Math.min(Number(coupon.value), serverSubtotal);
      }
      serverCouponId = coupon.id;
    }
    
    // Server-side delivery charge validation
    const settings = await db.siteSetting.findMany();
    const settingsObj: Record<string, any> = {};
    settings.forEach((s) => { settingsObj[s.key] = s.value; });
    const freeThreshold = Number(settingsObj.freeDeliveryThreshold) || 2000;
    const defaultDeliveryCharge = Number(settingsObj.defaultDeliveryCharge) || 149;
    
    let serverDeliveryCharge: number;
    if (deliveryMethod === "express") {
      serverDeliveryCharge = 299;
    } else {
      serverDeliveryCharge = serverSubtotal > freeThreshold ? 0 : defaultDeliveryCharge;
    }
    
    const finalDeliveryCharge = serverDeliveryCharge;
    const finalSubtotal = serverSubtotal;
    const finalDiscount = serverDiscount; // Server-validated coupon discount only
    // No tax is ever applied at order time — always compute as 0 server-side rather
    // than trusting a client-supplied (possibly negative) tax value.
    const finalTax = 0;
    const finalTotal = finalSubtotal - finalDiscount + finalDeliveryCharge + finalTax;

    // Generate collision-safe order number with retry
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

    // Create order with items (retry on P2002 unique constraint collision)
    let order: any = null;
    for (let retry = 0; retry < 5; retry++) {
      try {
        order = await db.order.create({
          data: {
            orderNumber,
            userId,
            status: "NEW",
        customerName,
        customerEmail: guestEmail,
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
        items: {
          create: validatedItems.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            productName: item.productName,
            variantName: item.variantName || null,
            sku: item.sku || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            salePrice: item.salePrice || null,
            totalPrice: item.totalPrice,
            image: item.image || null,
            customSize: item.customSize || null,
          })),
        },
        statusHistory: {
          create: {
            status: "NEW",
            note: "Order placed",
          },
        },
      },
    });
        break; // Success
      } catch (e: any) {
        if (e?.code === "P2002" && retry < 4) {
          // Unique constraint collision — regenerate order number and retry
          const newRandom = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
          orderNumber = `WH${year}${month}${newRandom}`;
          continue;
        }
        throw e;
      }
    }
    if (!order) throw new Error("Failed to create order after retries");

    // Create payment record so payment/verify can find it
    await db.payment.create({
      data: {
        orderId: order.id,
        amount: finalTotal,
        status: "PENDING",
      },
    });

    // Create notification (fire-and-forget)
    notifyNewOrder(order.id, orderNumber, customerName, finalTotal).catch(() => {});

    // Guests receive a one-time claim token bound to this order id. It authorizes
    // payment for exactly this order and enables token-based order tracking.
    const guestClaimToken = userId ? null : mintGuestClaimToken(order.id);

    return NextResponse.json(
      { order: { id: order.id, orderNumber: order.orderNumber, ...(guestClaimToken ? { guestClaimToken } : {}) } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

// DELETE — clear the entire order history (all orders). Admin only.
export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    // Restore stock for every paid order BEFORE removing the rows, since
    // restoreOrderStock reads those rows.
    const paidOrders = await db.order.findMany({
      where: { paymentStatus: "COMPLETED" },
      select: { id: true },
    });
    for (const o of paidOrders) {
      try {
        await restoreOrderStock(o.id);
      } catch (error) {
        console.error("Failed to restore stock for order", o.id, error);
      }
    }

    const result = await db.$transaction(async (tx) => {
      // Notification.orderId is a plain scalar, not a relation — null them out
      // so notifications survive while their orders are removed.
      await tx.notification.updateMany({
        where: { orderId: { not: null } },
        data: { orderId: null },
      });
      // Payment must be deleted explicitly — no cascade in the schema.
      const payments = await tx.payment.deleteMany({});
      // OrderItem and OrderStatusHistory cascade with the order.
      const orders = await tx.order.deleteMany({});
      return { orders: orders.count, payments: payments.count };
    });

    await logAdminAction({
      action: "CLEAR_HISTORY",
      entity: "ORDER",
      details: { deletedOrders: result.orders, deletedPayments: result.payments },
      request,
    });

    return NextResponse.json({
      success: true,
      deletedOrders: result.orders,
      deletedPayments: result.payments,
    });
  } catch (error) {
    console.error("Admin clear orders error:", error);
    return NextResponse.json({ error: "Failed to clear order history" }, { status: 500 });
  }
}
