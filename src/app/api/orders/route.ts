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
      return NextResponse.json({ orders: [], total: 0 });
    }
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      db.order.findMany({ where, include: { items: true, payment: true, statusHistory: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      db.order.count({ where }),
    ]);
    return NextResponse.json({ orders: orders.map((o) => ({ ...o, subtotal: Number(o.subtotal), discount: Number(o.discount), deliveryCharge: Number(o.deliveryCharge), tax: Number(o.tax), total: Number(o.total), items: o.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), salePrice: i.salePrice ? Number(i.salePrice) : null, totalPrice: Number(i.totalPrice) })) })), total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ orders: [], total: 0 });
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
    // Fetch all products in the order to validate prices
    const productIds = items.map((item: any) => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, regularPrice: true, salePrice: true, isActive: true, stockQuantity: true, trackInventory: true },
    });
    
    const productMap = new Map(products.map(p => [p.id, p]));
    
    // Validate and recalculate server-side
    let serverSubtotal = 0;
    const validatedItems = items.map((item: any) => {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} not found or inactive`);
      }
      if (product.trackInventory && product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${item.productName}`);
      }
      const unitPrice = Number(product.regularPrice);
      const salePrice = product.salePrice ? Number(product.salePrice) : null;
      const effectivePrice = salePrice || unitPrice;
      const totalPrice = effectivePrice * item.quantity;
      serverSubtotal += totalPrice;
      return { ...item, unitPrice, salePrice, totalPrice };
    });
    
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
    const finalDiscount = Math.min(Number(discount) || 0, finalSubtotal); // Prevent negative discount
    const finalTax = Number(tax) || 0;
    const finalTotal = finalSubtotal - finalDiscount + finalDeliveryCharge + finalTax;

    // Generate order number
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const orderNumber = `WH${year}${month}${random}`;

    // Create order with items
    const order = await db.order.create({
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
        paymentStatus: paymentMethod === "cod" ? "PENDING" : "PENDING",
        deliveryMethod: deliveryMethod || "delivery",
        customerNotes: customerNotes || null,
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
