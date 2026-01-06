/**
 * Banner interface for homepage hero slider and other banner locations
 */
export interface Banner {
  id: number;
  title: string;
  description: string;
  image_url: string;
  mobile_image_url: string | null;
  link_url: string | null;
  link_target: '_self' | '_blank' | null;
  position_order: number;
  price_tag: string | null;
  event_date: string | null;
}

/**
 * API response for fetching banners
 */
export interface BannersResponse {
  success: boolean;
  data: Banner[];
  location: string;
}
