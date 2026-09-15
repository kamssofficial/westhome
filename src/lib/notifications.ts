import db from "./db";
import { NotificationType } from "@prisma/client";

/**
 * Create a notification for admin/staff users.
 * Only ADMIN and staff roles receive notifications.
 */
export async function createNotification(params: {
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
}) {
  try {
    // Notification is created with empty readBy; staff filter is done at read time
    await db.notification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        orderId: params.orderId || null,
        readBy: "[]",
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/** Notify when a new order is placed */
export async function notifyNewOrder(orderId: string, orderNumber: string, customerName: string, total: number) {
  await createNotification({
    type: "ORDER_PLACED",
    title: "New Order " + orderNumber,
    message: customerName + " placed an order for ₹" + Number(total).toLocaleString("en-IN"),
    orderId,
  });
}

/** Notify when order status changes */
export async function notifyOrderStatusChange(orderId: string, orderNumber: string, newStatus: string) {
  const typeMap: Record<string, NotificationType> = {
    CONFIRMED: "ORDER_CONFIRMED",
    SHIPPED: "ORDER_SHIPPED",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    PAYMENT_CONFIRMED: "PAYMENT_SUCCESS",
  };
  const statusLabel = newStatus.replace(/_/g, " ").toLowerCase();
  await createNotification({
    type: typeMap[newStatus] || "GENERAL",
    title: "Order " + orderNumber + " " + statusLabel,
    message: "Order " + orderNumber + " has been " + statusLabel,
    orderId,
  });
}

/** Notify when a new customer registers */
export async function notifyNewCustomer(customerName: string) {
  await createNotification({
    type: "NEW_CUSTOMER",
    title: "New Customer",
    message: customerName + " just created an account",
  });
}

/** Notify when a product is low on stock */
export async function notifyLowStock(productId: string, productName: string, stockQuantity: number) {
  await createNotification({
    type: "LOW_STOCK",
    title: "Low Stock Alert",
    message: productName + " has only " + stockQuantity + " unit(s) remaining",
  });
}

/** Notify when a product is updated */
export async function notifyProductUpdated(productName: string, action: string) {
  await createNotification({
    type: "PRODUCT_UPDATED",
    title: "Product " + action,
    message: productName + " has been " + action.toLowerCase(),
  });
}
