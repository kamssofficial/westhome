const fs = require('fs');

const content = `// Real West Home category structure from brand spec
// Used as API fallback when database is unavailable

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  position: number;
  productCount: number;
  subcategories: SubcategoryData[];
}

export interface SubcategoryData {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  position: number;
  productCount: number;
}

export const CATEGORIES: CategoryData[] = [
  {
    id: "cat-1", name: "Wall Decor", slug: "wall-decor",
    description: "Transform your walls with our curated collection of art, mirrors, and decorative pieces.",
    image: "/images/categories/wall-decor.jpg", position: 1, productCount: 0,
    subcategories: [
      { id: "sub-1-1", name: "Wall Art", slug: "wall-art", description: "Canvas prints, paintings, and wall sculptures", image: "/images/categories/wall-decor.jpg", position: 1, productCount: 0 },
      { id: "sub-1-2", name: "Mirrors", slug: "mirrors", description: "Decorative and functional mirrors", image: "/images/categories/wall-decor.jpg", position: 2, productCount: 0 },
      { id: "sub-1-3", name: "Decorative Wall Pieces", slug: "decorative-wall-pieces", description: "Ornaments and decorative accents for walls", image: "/images/categories/wall-decor.jpg", position: 3, productCount: 0 },
      { id: "sub-1-4", name: "Framed Decor", slug: "framed-decor", description: "Elegant framed pieces and photo frames", image: "/images/categories/wall-decor.jpg", position: 4, productCount: 0 },
    ],
  },
  {
    id: "cat-2", name: "Laundry", slug: "laundry",
    description: "Premium laundry organizers and accessories for a tidy home.",
    image: "/images/categories/laundry.jpg", position: 2, productCount: 0,
    subcategories: [
      { id: "sub-2-1", name: "Laundry Baskets", slug: "laundry-baskets", description: "Wicker, fabric, and metal laundry baskets", image: "/images/categories/laundry.jpg", position: 1, productCount: 0 },
      { id: "sub-2-2", name: "Laundry Organizers", slug: "laundry-organizers", description: "Sorting trays and storage solutions", image: "/images/categories/laundry.jpg", position: 2, productCount: 0 },
      { id: "sub-2-3", name: "Storage Products", slug: "storage-products", description: "Bins, boxes, and shelving for laundry areas", image: "/images/categories/laundry.jpg", position: 3, productCount: 0 },
      { id: "sub-2-4", name: "Laundry Accessories", slug: "laundry-accessories", description: "Hangers, drying racks, and ironing accessories", image: "/images/categories/laundry.jpg", position: 4, productCount: 0 },
    ],
  },
  {
    id: "cat-3", name: "Comforters", slug: "comforters",
    description: "Luxurious bedding and comforters for ultimate comfort.",
    image: "/images/categories/comforters.jpg", position: 3, productCount: 0,
    subcategories: [
      { id: "sub-3-1", name: "Comforters", slug: "comforters-sub", description: "Premium quilted comforters and duvets", image: "/images/categories/comforters.jpg", position: 1, productCount: 0 },
      { id: "sub-3-2", name: "Bedding", slug: "bedding", description: "Sheet sets, pillowcases, and bed skirts", image: "/images/categories/comforters.jpg", position: 2, productCount: 0 },
      { id: "sub-3-3", name: "Blankets", slug: "blankets", description: "Throw blankets and winter blankets", image: "/images/categories/comforters.jpg", position: 3, productCount: 0 },
      { id: "sub-3-4", name: "Bed Covers", slug: "bed-covers", description: "Duvet covers and bedspreads", image: "/images/categories/comforters.jpg", position: 4, productCount: 0 },
      { id: "sub-3-5", name: "Pillows", slug: "pillows", description: "Decorative and sleeping pillows", image: "/images/categories/comforters.jpg", position: 5, productCount: 0 },
    ],
  },
  {
    id: "cat-4", name: "Lamps", slug: "lamps",
    description: "Designer lighting to illuminate your space with style.",
    image: "/images/categories/lamps.jpg", position: 4, productCount: 0,
    subcategories: [
      { id: "sub-4-1", name: "Table Lamps", slug: "table-lamps", description: "Desk and bedside table lamps", image: "/images/categories/lamps.jpg", position: 1, productCount: 0 },
      { id: "sub-4-2", name: "Floor Lamps", slug: "floor-lamps", description: "Standing lamps for ambient lighting", image: "/images/categories/lamps.jpg", position: 2, productCount: 0 },
      { id: "sub-4-3", name: "Bedside Lamps", slug: "bedside-lamps", description: "Compact lamps for nightstands", image: "/images/categories/lamps.jpg", position: 3, productCount: 0 },
      { id: "sub-4-4", name: "Decorative Lighting", slug: "decorative-lighting", description: "Fairy lights, lanterns, and accent lights", image: "/images/categories/lamps.jpg", position: 4, productCount: 0 },
    ],
  },
  {
    id: "cat-5", name: "Carpets", slug: "carpets",
    description: "Handpicked rugs and carpets to anchor your rooms.",
    image: "/images/categories/carpets.jpg", position: 5, productCount: 0,
    subcategories: [
      { id: "sub-5-1", name: "Area Rugs", slug: "area-rugs", description: "Large area rugs for living rooms and bedrooms", image: "/images/categories/carpets.jpg", position: 1, productCount: 0 },
      { id: "sub-5-2", name: "Floor Rugs", slug: "floor-rugs", description: "Durable floor rugs for high-traffic areas", image: "/images/categories/carpets.jpg", position: 2, productCount: 0 },
      { id: "sub-5-3", name: "Decorative Carpets", slug: "decorative-carpets", description: "Designer carpets with intricate patterns", image: "/images/categories/carpets.jpg", position: 3, productCount: 0 },
      { id: "sub-5-4", name: "Runners", slug: "runners", description: "Hallway and corridor runners", image: "/images/categories/carpets.jpg", position: 4, productCount: 0 },
    ],
  },
  {
    id: "cat-6", name: "Accessories", slug: "accessories",
    description: "Finishing touches that elevate your interiors.",
    image: "/images/categories/accessories.jpg", position: 6, productCount: 0,
    subcategories: [
      { id: "sub-6-1", name: "Soap Dispensers", slug: "soap-dispensers", description: "Bathroom and kitchen soap dispensers", image: "/images/categories/accessories.jpg", position: 1, productCount: 0 },
      { id: "sub-6-2", name: "Cushion Covers", slug: "cushion-covers", description: "Decorative cushion and pillow covers", image: "/images/categories/accessories.jpg", position: 2, productCount: 0 },
      { id: "sub-6-3", name: "Stand Clocks", slug: "stand-clocks", description: "Table and desk clocks", image: "/images/categories/accessories.jpg", position: 3, productCount: 0 },
      { id: "sub-6-4", name: "Vases", slug: "vases", description: "Ceramic, glass, and metal vases", image: "/images/categories/accessories.jpg", position: 4, productCount: 0 },
      { id: "sub-6-5", name: "Flower Pots", slug: "flower-pots", description: "Indoor and outdoor plant pots", image: "/images/categories/accessories.jpg", position: 5, productCount: 0 },
      { id: "sub-6-6", name: "Tissue Boxes", slug: "tissue-boxes", description: "Premium tissue box covers", image: "/images/categories/accessories.jpg", position: 6, productCount: 0 },
      { id: "sub-6-7", name: "Dustbins", slug: "dustbins", description: "Stylish waste bins for every room", image: "/images/categories/accessories.jpg", position: 7, productCount: 0 },
      { id: "sub-6-8", name: "Trays and Holders", slug: "trays-holders", description: "Serving trays, vanity trays, and organizers", image: "/images/categories/accessories.jpg", position: 8, productCount: 0 },
      { id: "sub-6-9", name: "Decorative Accessories", slug: "decorative-accessories", description: "Ornamental pieces and decorative accents", image: "/images/categories/accessories.jpg", position: 9, productCount: 0 },
    ],
  },
  {
    id: "cat-7", name: "Clocks", slug: "clocks",
    description: "Statement clocks that combine function with design.",
    image: "/images/categories/clocks.jpg", position: 7, productCount: 0,
    subcategories: [
      { id: "sub-7-1", name: "Wall Clocks", slug: "wall-clocks", description: "Analog and digital wall clocks", image: "/images/categories/clocks.jpg", position: 1, productCount: 0 },
      { id: "sub-7-2", name: "Decorative Clocks", slug: "decorative-clocks", description: "Artistic and ornamental clocks", image: "/images/categories/clocks.jpg", position: 2, productCount: 0 },
      { id: "sub-7-3", name: "Modern Clocks", slug: "modern-clocks", description: "Contemporary minimalist clock designs", image: "/images/categories/clocks.jpg", position: 3, productCount: 0 },
      { id: "sub-7-4", name: "Analog Clocks", slug: "analog-clocks", description: "Classic analog timepieces", image: "/images/categories/clocks.jpg", position: 4, productCount: 0 },
    ],
  },
];

export const HOMEPAGE_SECTIONS = [
  {
    id: "hero-1", type: "HERO", position: 1,
    title: "Modern Living",
    subtitle: "CRAFTED FOR",
    description: "Timeless pieces. Thoughtful details.",
    image: "/images/banners/hero.jpg",
    buttonText: "Explore Collections",
    buttonLink: "/shop",
  },
];
`;

fs.writeFileSync('src/lib/data.ts', content);
console.log('data.ts created:', content.length, 'bytes');
