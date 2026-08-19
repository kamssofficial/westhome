import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    // Admin can see all orders, customers see only theirs
    const where: any = {};

    if (all && session?.user && (session.user as any).role !== "CUSTOMER") {
      // Admin/manager sees all
    } else if (session?.user) {
      where.userId = (session.user as any).id;
    } else {
      return NextResponse.json({ orders: [], total: 0 });
    }

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          items: true,
          payment: true,
          statusHistory: { orderBy: { createdAt: "desc" } },
        },
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
          salePrice: i.salePrice ? Number(i.salePrice) : null,
          totalPrice: Number(i.totalPrice),
        })),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Orders API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      address,
      deliveryMethod,
      couponCode,
      paymentMethod,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (!address || !address.name || !address.phone || !address.addressLine1 || !address.city || !address.state || !address.pinCode) {
      return NextResponse.json({ error: "Complete address is required" }, { status: 400 });
    }

    // Validate and calculate prices server-side
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        include: { variants: true },
      });

      if (!product || !product.isActive) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }

      let price = Number(product.salePrice || product.regularPrice);
      let stock = product.stockQuantity;
      let variantId = item.variantId;

      if (variantId) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (!variant || !variant.isActive) {
          return NextResponse.json(
            { error: `Variant not found: ${variantId}` },
            { status: 400 }
          );
        }
        price = Number(variant.salePrice || variant.price);
        stock = variant.stockQuantity;
      }

      // Validate stock
      if (product.trackInventory && stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product.id,
        variantId: variantId || null,
        productName: product.name,
        variantName: item.variantName || null,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: price,
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        totalPrice: itemTotal,
        image: item.image || null,
        customSize: item.customSize || null,
      });
    }

    // Validate coupon
    let discount = 0;
    let couponId = null;
    if (couponCode) {
      const coupon = await db.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!coupon || !coupon.isActive) {
        return NextResponse.json({ error: "Invalid coupon" }, { status: 400 });
      }

      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
      }

      if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
        return NextResponse.json(
          { error: `Minimum order value for this coupon is ₹${coupon.minOrderAmount}` },
          { status: 400 }
        );
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
      }

      if (coupon.type === "PERCENTAGE") {
        discount = (subtotal * Number(coupon.value)) / 100;
        if (coupon.maxDiscountAmount) {
          discount = Math.min(discount, Number(coupon.maxDiscountAmount));
        }
      } else {
        discount = Number(coupon.value);
      }

      discount = Math.min(discount, subtotal);
      couponId = coupon.id;
    }

    // Calculate delivery
    let deliveryCharge = 0;
    const deliveryConfig = await db.siteSetting.findUnique({
      where: { key: "deliveryConfig" },
    });

    if (deliveryMethod === "delivery" && deliveryConfig) {
      const config = deliveryConfig.value as any;
      if (subtotal < (config.freeDeliveryThreshold || 999)) {
        deliveryCharge = config.defaultDeliveryCharge || 49;
      }
    }

    const total = subtotal - discount + deliveryCharge;

    // Generate order number
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const orderNumber = `WH${year}${month}${random}`;

    // Get session for user ID
    const session = await auth();
    const userId = session?.user ? (session.user as any).id : null;

    // Create order
    const order = await db.order.create({
      data: {
        orderNumber,
        userId,
        status: "NEW",
        customerName: address.name,
        customerEmail: address.email || "",
        customerPhone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pinCode: address.pinCode,
        country: address.country || "India",
        subtotal,
        discount,
        deliveryCharge,
        tax: 0,
        total,
        paymentMethod: paymentMethod || "razorpay",
        paymentStatus: "PENDING",
        deliveryMethod: deliveryMethod || "delivery",
        couponId,
        couponCode: couponCode || null,
        items: {
          create: orderItems,
        },
        statusHistory: {
          create: { status: "NEW", note: "Order placed" },
        },
      },
      include: {
        items: true,
        payment: true,
      },
    });

    // Create payment record
    await db.payment.create({
      data: {
        orderId: order.id,
        amount: total,
        currency: "INR",
        status: "PENDING",
        method: paymentMethod,
      },
    });

    return NextResponse.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        deliveryCharge: Number(order.deliveryCharge),
        total: Number(order.total),
        items: order.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          totalPrice: Number(i.totalPrice),
        })),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
