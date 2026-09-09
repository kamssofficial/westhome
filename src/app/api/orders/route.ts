import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userId = (session.user as any).id;

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
      tax,
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

    // SECURITY: Server-side price validation — recalculate from database
    // Fetch all products AND their variants in the order to validate prices
    const productIds = items.map((item: any) => item.productId);
    const variantIds = items.filter((item: any) => item.variantId).map((item: any) => item.variantId);
    
    const [products, variants] = await Promise.all([
      db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, regularPrice: true, salePrice: true, isActive: true, stockQuantity: true, trackInventory: true },
      }),
      variantIds.length > 0 ? db.productVariant.findMany({
        where: { id: { in: variantIds }, isActive: true },
        select: { id: true, productId: true, price: true, stockQuantity: true },
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
      
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant) throw new Error(`Variant ${item.variantId} not found`);
        regularPrice = Number(variant.price);
        if (product.trackInventory && variant.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName} (variant)`);
        }
      } else {
        if (product.trackInventory && !item.variantId && product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}`);
        }
        regularPrice = Number(product.regularPrice);
        salePrice = product.salePrice ? Number(product.salePrice) : null;
      }
      
      // The customer pays the sale price when one is live; record that as the unit price.
      const effectivePrice = salePrice !== null && salePrice > 0 ? salePrice : regularPrice;
      const totalPrice = effectivePrice * item.quantity;
      serverSubtotal += totalPrice;
      return { ...item, unitPrice: effectivePrice, salePrice, totalPrice };
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
    const finalTax = Number(tax) || 0;
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

    // Create notification
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
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
