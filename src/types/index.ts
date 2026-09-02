// ============================================================
// Product Types
// ============================================================

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  position: number;
  isPrimary: boolean;
  imageType?: "PRODUCT" | "LIFESTYLE";
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price: number;
  salePrice?: number;
  stockQuantity: number;
  isActive: boolean;
  images: ProductImage[];
  attributes: VariantAttributeSelection[];
}

export interface VariantAttributeSelection {
  attributeId: string;
  attributeName: string;
  value: string;
  colorCode?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  description?: string;
  shortDescription?: string;
  regularPrice: number;
  salePrice?: number;
  promotionalPrice?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  trackInventory: boolean;

  // Physical Dimensions
  height?: number;
  width?: number;
  length?: number;
  depth?: number;
  diameter?: number;
  dimensionUnit?: string;
  weight?: number;
  weightUnit?: string;
  capacity?: number;
  capacityUnit?: string;

  // Physical Attributes
  material?: string;
  color?: string;
  finish?: string;
  shape?: string;
  pattern?: string;
  style?: string;
  mountingType?: string;
  usageLocation?: string;

  // Product Information
  careInstructions?: string;
  warranty?: string;

  // Packaging
  packagingType?: string;
  packagingDimensions?: string;
  packagingWeight?: number;
  includedItems?: string;

  // Custom Sizing
  allowCustomSize: boolean;
  customSizeUnit?: string;
  customSizeMinWidth?: number;
  customSizeMinLength?: number;
  customSizeMinHeight?: number;
  customSizeMaxWidth?: number;
  customSizeMaxLength?: number;
  customSizeMaxHeight?: number;
  customSizePricingMethod?: string;
  customSizeRequiresApproval?: boolean;

  purchaseMethod: "BUY_ONLINE" | "WHATSAPP" | "BOTH";
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  isActive: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isNewArrival: boolean;
  isComingSoon?: boolean;
  isLimitedEdition?: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  category: Category;
  subcategory?: Subcategory;
  rating?: number;
  reviewCount?: number;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  position: number;
  subcategories: Subcategory[];
  productCount?: number;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  position: number;
  productCount?: number;
}

// ============================================================
// Cart Types
// ============================================================

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number;
  salePrice?: number;
  quantity: number;
  image?: string;
  maxStock: number;
  customSize?: CustomSize;
}

export interface CustomSize {
  width?: number;
  length?: number;
  height?: number;
  unit: string;
  notes?: string;
}

export interface Cart {
  items: CartItem[];
  couponCode?: string;
  discount?: number;
  deliveryCharge?: number;
}

// ============================================================
// Order Types
// ============================================================

export type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "PAYMENT_FAILED"
  | "ON_HOLD";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  paymentStatus: PaymentStatus;
  deliveryMethod: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  trackingNumber?: string;
  items: OrderItem[];
  createdAt: string;
  statusHistory: { status: OrderStatus; note?: string; createdAt: string }[];
}

export interface OrderItem {
  id: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  salePrice?: number;
  totalPrice: number;
  image?: string;
  customSize?: CustomSize;
}

// ============================================================
// Address Types
// ============================================================

export interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  isDefault: boolean;
}

// ============================================================
// Coupon Types
// ============================================================

export interface Coupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
}

// ============================================================
// Review Types
// ============================================================

export interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  image?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  isFeatured: boolean;
  user: {
    name: string;
    image?: string;
  };
  createdAt: string;
}

// ============================================================
// Homepage Types
// ============================================================

export type SectionType =
  | "HERO"
  | "CATEGORIES"
  | "FEATURED_PRODUCTS"
  | "NEW_ARRIVALS"
  | "PROMOTIONAL_BANNER"
  | "LIFESTYLE_COLLECTION"
  | "BRAND_STORY"
  | "STORE_INFO"
  | "CUSTOM_HTML";

export interface HomepageSection {
  id: string;
  type: SectionType;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  buttonText?: string;
  buttonLink?: string;
  isActive: boolean;
  position: number;
  content?: Record<string, any>;
}

// ============================================================
// Settings Types
// ============================================================

export interface SiteSettings {
  storeName: string;
  storeDescription: string;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  currency: string;
  logo?: string;
  favicon?: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  deliveryConfig: {
    freeDeliveryThreshold: number;
    defaultDeliveryCharge: number;
    estimatedDeliveryDays: number;
    storePickup: boolean;
  };
  seoDefaults: {
    title: string;
    description: string;
    keywords: string[];
  };
}

// ============================================================
// Search Types
// ============================================================

export interface SearchFilters {
  query?: string;
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  sort?: "recommended" | "newest" | "price_asc" | "price_desc" | "bestselling" | "rating";
  page?: number;
  limit?: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    categories: { name: string; slug: string; count: number }[];
    priceRange: { min: number; max: number };
    attributes: { name: string; values: string[] }[];
  };
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

// ============================================================
// Dashboard Types
// ============================================================

export interface DashboardStats {
  revenue: number;
  revenueGrowth: number;
  orders: number;
  ordersGrowth: number;
  customers: number;
  customersGrowth: number;
  averageOrderValue: number;
  pendingOrders: number;
  lowStockProducts: number;
}

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  image?: string;
  sold: number;
  revenue: number;
}

export interface CategoryPerformance {
  name: string;
  products: number;
  revenue: number;
  orders: number;
}
