import { authService } from './authService';

export interface StaticPage {
  id: number;
  page_key: string;
  title: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  status: 'active' | 'inactive';
  is_published: boolean;
  slug: string;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

export interface StaticPageResponse {
  success: boolean;
  data?: StaticPage | StaticPage[];
  count?: number;
  message?: string;
  error?: string;
}

export interface CreateStaticPageData {
  page_key: string;
  title: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  status?: 'active' | 'inactive';
  is_published?: boolean;
  slug: string;
}

export interface UpdateStaticPageData {
  title?: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  status?: 'active' | 'inactive';
  is_published?: boolean;
  slug?: string;
}

/**
 * Static Pages Service
 * 
 * Handles API calls for static pages content management
 */
class StaticPagesService {
  private readonly API_BASE_URL = import.meta.env.VITE_API_URL;
  private readonly API_KEY = 'e417f1be53494f5f9fbc5b350b1a5850';

  /**
   * Get all static pages (Admin only)
   */
  async getAllPages(): Promise<StaticPageResponse> {
    try {
      const accessToken = authService.getAccessToken();
      
      if (!accessToken) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/admin/static-pages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Api-Key': this.API_KEY
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data;
      }

      // Handle 401 by trying to refresh token
      if (response.status === 401) {
        const refreshResult = await authService.refreshToken();
        
        if (refreshResult.success) {
          // Retry the request with new token
          return this.getAllPages();
        }
      }

      return data;
    } catch (error) {
      console.error('Get all pages error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get a static page by ID (Admin only)
   */
  async getPageById(id: number): Promise<StaticPageResponse> {
    try {
      const accessToken = authService.getAccessToken();
      
      if (!accessToken) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/admin/static-pages/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Api-Key': this.API_KEY
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data;
      }

      // Handle 401 by trying to refresh token
      if (response.status === 401) {
        const refreshResult = await authService.refreshToken();
        
        if (refreshResult.success) {
          // Retry the request with new token
          return this.getPageById(id);
        }
      }

      return data;
    } catch (error) {
      console.error('Get page by ID error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Update a static page (Admin only)
   */
  async updatePage(id: number, data: UpdateStaticPageData): Promise<StaticPageResponse> {
    try {
      const accessToken = authService.getAccessToken();
      
      if (!accessToken) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/admin/static-pages/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Api-Key': this.API_KEY
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        return responseData;
      }

      // Handle 401 by trying to refresh token
      if (response.status === 401) {
        const refreshResult = await authService.refreshToken();
        
        if (refreshResult.success) {
          // Retry the request with new token
          return this.updatePage(id, data);
        }
      }

      return responseData;
    } catch (error) {
      console.error('Update page error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Create a new static page (Admin only)
   */
  async createPage(data: CreateStaticPageData): Promise<StaticPageResponse> {
    try {
      const accessToken = authService.getAccessToken();
      
      if (!accessToken) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/admin/static-pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Api-Key': this.API_KEY
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        return responseData;
      }

      // Handle 401 by trying to refresh token
      if (response.status === 401) {
        const refreshResult = await authService.refreshToken();
        
        if (refreshResult.success) {
          // Retry the request with new token
          return this.createPage(data);
        }
      }

      return responseData;
    } catch (error) {
      console.error('Create page error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Delete a static page (Admin only)
   */
  async deletePage(id: number): Promise<StaticPageResponse> {
    try {
      const accessToken = authService.getAccessToken();
      
      if (!accessToken) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/admin/static-pages/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Api-Key': this.API_KEY
        }
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        return responseData;
      }

      // Handle 401 by trying to refresh token
      if (response.status === 401) {
        const refreshResult = await authService.refreshToken();
        
        if (refreshResult.success) {
          // Retry the request with new token
          return this.deletePage(id);
        }
      }

      return responseData;
    } catch (error) {
      console.error('Delete page error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get published pages (Public API - for frontend display)
   */
  async getPublishedPages(): Promise<StaticPageResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/v1/static-pages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.API_KEY
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data;
      }

      return data;
    } catch (error) {
      console.error('Get published pages error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get a published page by key (Public API - for frontend display)
   */
  async getPublishedPageByKey(key: string): Promise<StaticPageResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/v1/static-pages/${key}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.API_KEY
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data;
      }

      return data;
    } catch (error) {
      console.error('Get published page by key error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  }
}

// Export singleton instance
export const staticPagesService = new StaticPagesService();
export default staticPagesService;