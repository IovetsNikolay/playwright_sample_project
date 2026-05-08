export interface BrandResponse {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryResponse {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  sub_categories?: CategoryResponse[];
}

export interface ImageResponse {
  id: string;
  by_name: string;
  by_url: string;
  source_name: string;
  source_url: string;
  file_name: string;
  title: string;
}

export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  is_location_offer: boolean;
  is_rental: boolean;
  in_stock: boolean;
  co2_rating: string;
  is_eco_friendly: boolean;
  brand: BrandResponse;
  category: CategoryResponse;
  product_image: ImageResponse;
}

export interface PaginatedProductResponse {
  current_page: number;
  data: ProductResponse[];
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
}

export interface ProductRequest {
  name: string;
  description: string;
  price: number;
  category_id: string;
  brand_id: string;
  product_image_id: string;
  is_location_offer?: boolean;
  is_rental?: boolean;
  co2_rating?: string;
}

export type PartialProductRequest = Partial<ProductRequest>;

export interface ProductListParams {
  by_brand?: string;
  by_category?: string;
  is_rental?: string;
  between?: string;
  sort?: string;
  page?: number;
}

export interface ProductSearchParams {
  q: string;
  page?: number;
}

export interface ProductSpecResponse {
  id: string;
  spec_name: string;
  spec_value: string;
  spec_unit: string | null;
}

export interface ProductSpecRequest {
  spec_name: string;
  spec_value: string;
  spec_unit?: string | null;
}
