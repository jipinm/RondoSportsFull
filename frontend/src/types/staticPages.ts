/**
 * Static Page Interface
 */
export interface StaticPage {
  id: number;
  page_key: string;
  title: string;
  content: string;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  status: 'active' | 'inactive';
  is_published: boolean;
  slug: string;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * API Response for Static Pages
 */
export interface StaticPageResponse {
  success: boolean;
  data?: StaticPage;
  error?: string;
}
