import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatPriceRange(min: number, max: number): string {
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `WH${year}${month}${random}`;
}

export function generateSKU(category: string, id: string): string {
  const prefix = category.slice(0, 3).toUpperCase();
  const suffix = id.slice(-6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function calculateDiscount(
  originalPrice: number | string,
  salePrice: number | string
): number {
  const original =
    typeof originalPrice === "string"
      ? parseFloat(originalPrice)
      : originalPrice;
  const sale = typeof salePrice === "string" ? parseFloat(salePrice) : salePrice;
  if (original <= 0 || sale <= 0 || sale >= original) return 0;
  return Math.round(((original - sale) / original) * 100);
}

export function getWhatsAppUrl(
  phone: string,
  message: string
): string {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodedMessage}`;
}

export function generateProductWhatsAppMessage(
  productName: string,
  productUrl: string,
  variant?: string,
  size?: string,
  customSize?: string
): string {
  let message = `Hi, I'm interested in:\n\n`;
  message += `📦 *${productName}*\n`;
  message += `🔗 ${productUrl}\n`;
  if (variant) message += `🎨 Variant: ${variant}\n`;
  if (size) message += `📏 Size: ${size}\n`;
  if (customSize) message += `📐 Custom Size: ${customSize}\n`;
  message += `\nPlease share the details. Thank you!`;
  return message;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-800",
    CONFIRMED: "bg-indigo-100 text-indigo-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    SHIPPED: "bg-cyan-100 text-cyan-800",
    OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    REFUNDED: "bg-gray-100 text-gray-800",
    PAYMENT_FAILED: "bg-red-100 text-red-800",
    ON_HOLD: "bg-yellow-100 text-yellow-800",
    DRAFT: "bg-gray-100 text-gray-800",
    ACTIVE: "bg-green-100 text-green-800",
    INACTIVE: "bg-red-100 text-red-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  const re = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return re.test(phone.replace(/\s/g, ""));
}

export function validatePinCode(pin: string): boolean {
  const re = /^[1-9][0-9]{5}$/;
  return re.test(pin);
}
