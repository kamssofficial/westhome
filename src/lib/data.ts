// Type definitions for fallback data
// Real data comes from the database via API routes

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

// Empty fallback arrays - real data comes from database
export const CATEGORIES: CategoryData[] = [];
export const HOMEPAGE_SECTIONS: any[] = [];
