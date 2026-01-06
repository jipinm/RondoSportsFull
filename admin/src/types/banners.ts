// Banner types and interfaces for admin application

export interface Banner {
  id: number;
  title: string;
  description?: string;
  image_url: string;
  mobile_image_url?: string;
  link_url?: string;
  link_target: '_self' | '_blank';
  position_order: number;
  status: 'active' | 'inactive';
  location: 'homepage_hero' | 'homepage_secondary' | 'category_page' | 'event_page';
  event_date?: string;
  price_tag?: string;
  click_count: number;
  impression_count: number;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface BannerCreate {
  title: string;
  description?: string;
  image_url?: string; // Made optional since it can be auto-generated from uploaded image
  mobile_image_url?: string;
  link_url?: string;
  link_target?: '_self' | '_blank';
  position_order?: number;
  status?: 'active' | 'inactive';
  location?: 'homepage_hero' | 'homepage_secondary' | 'category_page' | 'event_page';
  event_date?: string;
  price_tag?: string;
  image?: File; // Optional file upload
}

export interface BannerUpdate {
  title?: string;
  description?: string;
  image_url?: string;
  mobile_image_url?: string;
  link_url?: string;
  link_target?: '_self' | '_blank';
  position_order?: number;
  status?: 'active' | 'inactive';
  location?: 'homepage_hero' | 'homepage_secondary' | 'category_page' | 'event_page';
  event_date?: string;
  price_tag?: string;
  image?: File; // Optional file upload
}

export interface BannersFilters {
  search?: string;
  status?: 'active' | 'inactive';
  location?: 'homepage_hero' | 'homepage_secondary' | 'category_page' | 'event_page';
}

export interface BannersPagination {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface BannersResponse {
  success: boolean;
  data: Banner[];
  pagination: BannersPagination;
  filters_applied?: BannersFilters;
}

export interface BannerResponse {
  success: boolean;
  data: Banner;
  message?: string;
}

export interface BannerDeleteResponse {
  success: boolean;
  message: string;
}

export interface BannerUploadResponse {
  success: boolean;
  data: {
    filename: string;
    image_url: string;
    mobile_image_url?: string;
    banner: Banner;
  };
  message?: string;
}

export interface BannerPositionsUpdate {
  positions: Record<number, number>; // banner_id -> position
}

export interface BannerPositionsResponse {
  success: boolean;
  message: string;
}

// Public banner types (for frontend display)
export interface PublicBanner {
  id: number;
  title: string;
  description?: string;
  image_url: string;
  mobile_image_url?: string;
  link_url?: string;
  link_target: '_self' | '_blank';
  position_order: number;
}

export interface PublicBannersResponse {
  success: boolean;
  data: PublicBanner[];
  location: string;
}

// Banner analytics types
export interface BannerAnalytics {
  banner_id: number;
  title: string;
  click_count: number;
  impression_count: number;
  click_through_rate: number;
  status: string;
  created_at: string;
}

export interface BannerStatsResponse {
  success: boolean;
  data: {
    total_banners: number;
    active_banners: number;
    total_clicks: number;
    total_impressions: number;
    top_performing: BannerAnalytics[];
  };
}

// Error types
export interface BannerFieldError {
  field: string;
  message: string;
}

export interface BannerError {
  success: false;
  error: string;
  field_errors?: BannerFieldError[];
}

// Form validation types
export interface BannerFormData {
  title: string;
  description: string;
  image_url: string;
  mobile_image_url: string;
  link_url: string;
  link_target: '_self' | '_blank';
  position_order: number;
  status: 'active' | 'inactive';
  location: 'homepage_hero' | 'homepage_secondary' | 'category_page' | 'event_page';
  event_date: string;
}

export interface BannerFormErrors {
  title?: string;
  description?: string;
  image_url?: string;
  mobile_image_url?: string;
  link_url?: string;
  link_target?: string;
  position_order?: string;
  status?: string;
  location?: string;
  event_date?: string;
  file?: string;
}

// Constants for select options
export const BANNER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
] as const;

export const BANNER_LOCATIONS = [
  { value: 'homepage_hero', label: 'Homepage Hero' },
  { value: 'homepage_secondary', label: 'Homepage Secondary' },
  { value: 'category_page', label: 'Category Page' },
  { value: 'event_page', label: 'Event Page' }
] as const;

export const LINK_TARGETS = [
  { value: '_self', label: 'Same Window' },
  { value: '_blank', label: 'New Window' }
] as const;

// Utility types
export type BannerStatus = Banner['status'];
export type BannerLocation = Banner['location'];
export type LinkTarget = Banner['link_target'];