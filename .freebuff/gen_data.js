const fs = require('fs');

const data = `// West Home - Complete Product Catalog Data
// Used as fallback when database is not available

export const CATEGORIES = [
  {
    id: "cat-1", name: "Wall Decor", slug: "wall-decor", image: "/images/categories/wall-decor.jpg",
    description: "Elevate your walls with premium art, frames, and decorative pieces",
    isActive: true, position: 1, productCount: 24,
    subcategories: []
  },
  {
    id: "cat-2", name: "Laundry", slug: "laundry", image: "/images/categories/laundry.jpg",
    description: "Premium laundry accessories and organization solutions",
    isActive: true, position: 2, productCount: 12,
    subcategories: []
  },
  {
    id: "cat-3", name: "Comforters", slug: "comforters", image: "/images/categories/comforters.jpg",
    description: "Luxurious comforters for a perfect night's sleep",
    isActive: true, position: 3, productCount: 18,
    subcategories: []
  },
  {
    id: "cat-4", name: "Lamps", slug: "lamps", image: "/images/categories/lamps.jpg",
    description: "Designer lamps and lighting for every room",
    isActive: true, position: 4, productCount: 15,
    subcategories: []
  },
  {
    id: "cat-5", name: "Carpets", slug: "carpets", image: "/images/categories/carpets.jpg",
    description: "Handpicked carpets and rugs for warmth and style",
    isActive: true, position: 5, productCount: 14,
    subcategories: []
  },
  {
    id: "cat-6", name: "Accessories", slug: "accessories", image: "/images/categories/accessories.jpg",
    description: "Home accessories to complete your living spaces",
    isActive: true, position: 6, productCount: 45,
    subcategories: [
      { id: "sub-1", categoryId: "cat-6", name: "Soap Dispensers", slug: "soap-dispensers", image: "/images/categories/accessories.jpg", isActive: true, position: 1, productCount: 8 },
      { id: "sub-2", categoryId: "cat-6", name: "Cushion Covers", slug: "cushion-covers", image: "/images/categories/accessories.jpg", isActive: true, position: 2, productCount: 12 },
      { id: "sub-3", categoryId: "cat-6", name: "Vases", slug: "vases", image: "/images/categories/accessories.jpg", isActive: true, position: 3, productCount: 10 },
      { id: "sub-4", categoryId: "cat-6", name: "Flower Pots", slug: "flower-pots", image: "/images/categories/accessories.jpg", isActive: true, position: 4, productCount: 8 },
      { id: "sub-5", categoryId: "cat-6", name: "Tissue Boxes", slug: "tissue-boxes", image: "/images/categories/accessories.jpg", isActive: true, position: 5, productCount: 6 },
      { id: "sub-6", categoryId: "cat-6", name: "Dustbins", slug: "dustbins", image: "/images/categories/accessories.jpg", isActive: true, position: 6, productCount: 4 },
      { id: "sub-7", categoryId: "cat-6", name: "Trays & Holders", slug: "trays-holders", image: "/images/categories/accessories.jpg", isActive: true, position: 7, productCount: 6 },
      { id: "sub-8", categoryId: "cat-6", name: "Decor Accents", slug: "decor-accents", image: "/images/categories/accessories.jpg", isActive: true, position: 8, productCount: 5 },
    ]
  },
  {
    id: "cat-7", name: "Clocks", slug: "clocks", image: "/images/categories/clocks.jpg",
    description: "Elegant wall and desk clocks",
    isActive: true, position: 7, productCount: 16,
    subcategories: []
  },
];

export const PRODUCTS = [
  // WALL DECOR
  { id: "p-1", name: "Abstract Canvas Wall Art", slug: "abstract-canvas-wall-art", description: "Premium abstract canvas art featuring warm golden tones. Perfect for living rooms and bedrooms.", shortDescription: "Premium abstract canvas art in warm golden tones", regularPrice: 2499, salePrice: 1999, stockQuantity: 15, status: "ACTIVE", isActive: true, isFeatured: true, isNewArrival: true, isBestseller: false, images: [{ id: "img-1", url: "/images/categories/wall-decor.jpg", alt: "Abstract Canvas Wall Art", position: 0, isPrimary: true }], variants: [], category: { id: "cat-1", name: "Wall Decor", slug: "wall-decor" }, rating: 4.8, reviewCount: 42, tags: ["wall art", "canvas", "abstract"] },
  { id: "p-2", name: "Decorative Wall Mirror", slug: "decorative-wall-mirror", description: "Elegant round wall mirror with premium gold-finished frame.", shortDescription: "Elegant round mirror with gold frame", regularPrice: 3299, stockQuantity: 8, status: "ACTIVE", isActive: true, isFeatured: false, isNewArrival: false, isBestseller: true, images: [{ id: "img-2", url: "/images/categories/wall-decor.jpg", alt: "Round Gold Mirror", position: 0, isPrimary: true }], variants: [], category: { id: "cat-1", name: "Wall Decor", slug: "wall-decor" }, rating: 4.6, reviewCount: 28, tags: ["mirror", "wall", "gold"] },
  { id: "p-3", name: "Framed Botanical Print Set", slug: "framed-botanical-print-set", description: "Set of 3 framed botanical art prints. Minimalist design.", shortDescription: "Set of 3 botanical art prints", regularPrice: 1899, salePrice: 1499, stockQuantity: 20, status: "ACTIVE", isActive: true, isFeatured: true, isNewArrival: false, isBestseller: false, images: [{ id: "img-3", url: "/images/categories/wall-decor.jpg", alt: "Botanical Prints", position: 0, isPrimary: true }], variants: [], category: { id: "cat-1", name: "Wall Decor", slug: "wall-decor" }, rating: 4.7, reviewCount: 35, tags: ["botanical", "prints", "framed"] },

  // LAUNDRY
  { id: "p-4", name: "Premium Laundry Basket", slug: "premium-laundry-basket", description: "Durable woven laundry basket with handles. Elegant design.", shortDescription: "Durable woven laundry basket", regularPrice: 1299, stockQuantity: 25, status: "ACTIVE", isActive: true, isFeatured: false, isNewArrival: false, isBestseller: true, images: [{ id: "img-4", url: "/images/categories/laundry.jpg", alt: "Woven Laundry Basket", position: 0, isPrimary: true }], variants: [], category: { id: "cat-2", name: "Laundry", slug: "laundry" }, rating: 4.5, reviewCount: 56, tags: ["laundry", "basket", "woven"] },
  { id: "p-5", name: "Fabric Laundry Sorter", slug: "fabric-laundry-sorter", description: "Three-compartment fabric laundry sorter with metal frame.", shortDescription: "Three-compartment laundry sorter", regularPrice: 1899, stockQuantity: 12, status: "ACTIVE", isActive: true, isFeatured: false, isNewArrival: true, isBestseller: false, images: [{ id: "img-5", url: "/images/categories/laundry.jpg", alt: "Laundry Sorter", position: 0, isPrimary: true }], variants: [], category: { id: "cat-2", name: "Laundry", slug: "laundry" }, rating: 4.4, reviewCount: 18, tags: ["laundry", "sorter", "organizer"] },

  // COMFORTERS
  { id: "p-6", name: "Premium Velvet Comforter", slug: "premium-velvet-comforter", description: "Luxuriously soft velvet comforter. Double-brushed microfiber.", shortDescription: "Luxuriously soft velvet comforter", regularPrice: 4999, salePrice: 3999, stockQuantity: 20, status: "ACTIVE", isActive: true, isFeatured: true, isNewArrival: false, isBestseller: true, images: [{ id: "img-6", url: "/images/categories/comforters.jpg", alt: "Velvet Comforter", position: 0, isPrimary: true }], variants: [{ id: "v-1", name: "Single", price: 3499, salePrice: 2999, stockQuantity: 10, isActive: true, position: 0, images: [], attributes: [] }, { id: "v-2", name: "Queen", price: 4999, salePrice: 3999, stockQuantity: 10, isActive: true, position: 1, images: [], attributes: [] }, { id: "v-3", name: "King", price: 5999, salePrice: 4999, stockQuantity: 5, isActive: true, position: 2, images: [], attributes: [] }], category: { id: "cat-3", name: "Comforters", slug: "comforters" }, rating: 4.9, reviewCount: 68, tags: ["comforter", "velvet", "bedding"] },
  { id: "p-7", name: "Egyptian Cotton Comforter", slug: "egyptian-cotton-comforter", description: "400 thread count Egyptian cotton comforter. Breathable and durable.", shortDescription: "400TC Egyptian cotton comforter", regularPrice: 6999, stockQuantity: 12, status: "ACTIVE", isActive: true, isFeatured: false, isNewArrival: true, isBestseller: false, images: [{ id: "img-7", url: "/images/categories/comforters.jpg", alt: "Egyptian Cotton Comforter", position: 0, isPrimary: true }], variants: [], category: { id
