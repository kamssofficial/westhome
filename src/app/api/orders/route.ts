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

    // Server-side delivery charge validation
    const settings = await db.siteSetting.findMany();
    const settingsObj: Record<string, any> = {};
    settings.forEach((s) => { settingsObj[s.key] = s.value; });
    const freeThreshold = Number(settingsObj.freeDeliveryThreshold) || 2000;
    const defaultDeliveryCharge = Number(settingsObj.defaultDeliveryCharge) || 149;
    
    // Recalculate delivery charge server-side
    let serverDeliveryCharge: number;
    if (deliveryMethod === "express") {
      serverDeliveryCharge = 299;
    } else {
      serverDeliveryCharge = subtotal > freeThreshold ? 0 : defaultDeliveryCharge;
    }
    
    // Use server-calculated delivery charge (prevents client manipulation)
    const finalDeliveryCharge = serverDeliveryCharge;
    const finalTotal = subtotal - (discount || 0) + finalDeliveryCharge + (tax || 0);

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
        subtotal,
        discount: discount || 0,
        deliveryCharge: finalDeliveryCharge,
        tax: tax || 0,
        total: finalTotal,
        paymentMethod: paymentMethod || null,
        paymentStatus: paymentMethod === "cod" ? "PENDING" : "PENDING",
        deliveryMethod: deliveryMethod || "delivery",
        customerNotes: customerNotes || null,
        items: {
          create: items.map((item: any) => ({
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
        message: `Order ${orderNumber} placed by ${customerName} for ₹${total}`,
        orderId: order.id,
      },
    });

    return NextResponse.json({ order: { id: order.id, orderNumber: order.orderNumber } }, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
