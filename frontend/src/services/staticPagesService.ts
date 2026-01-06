import { customerApiClient } from './customerApiClient';
import type { StaticPage, StaticPageResponse } from '../types/staticPages';

/**
 * Service for fetching static pages content
 */
export class StaticPagesService {
  /**
   * Get a static page by its key
   * @param pageKey - The page key (e.g., 'privacy', 'terms')
   */
  async getPageByKey(pageKey: string): Promise<StaticPage | null> {
    try {
      const response = await customerApiClient.get<StaticPageResponse>(
        `/api/v1/static-pages/${pageKey}`
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        console.error('Failed to fetch static page:', response.data);
        return null;
      }
    } catch (error: any) {
      console.error('Error fetching static page:', error.message);
      return null;
    }
  }

  /**
   * Get privacy policy page
   */
  async getPrivacyPolicy(): Promise<StaticPage | null> {
    return this.getPageByKey('privacy');
  }

  /**
   * Get terms and conditions page
   */
  async getTermsAndConditions(): Promise<StaticPage | null> {
    return this.getPageByKey('terms');
  }
}

// Export singleton instance
export const staticPagesService = new StaticPagesService();
