import { customerApiClient } from './customerApiClient';
import type { Banner, BannersResponse } from '../types/banners';

/**
 * Service for fetching public banner data
 */
export class BannersService {
  /**
   * Get banners by location
   * @param location - Banner location (e.g., 'homepage_hero')
   * @param limit - Maximum number of banners to fetch (default: 10)
   */
  async getBannersByLocation(location: string, limit: number = 10): Promise<Banner[]> {
    try {
      const response = await customerApiClient.get<BannersResponse>(
        `/api/v1/banners/${location}?limit=${limit}`
      );
      
      if (response.data.success) {
        return response.data.data;
      } else {
        console.error('Failed to fetch banners:', response.data);
        return [];
      }
    } catch (error: any) {
      console.error('Error fetching banners:', error.message);
      // Return empty array instead of throwing to gracefully handle errors
      return [];
    }
  }

  /**
   * Get homepage hero banners
   */
  async getHomepageHeroBanners(): Promise<Banner[]> {
    return this.getBannersByLocation('homepage_hero', 10);
  }

  /**
   * Get homepage secondary banners
   */
  async getHomepageSecondaryBanners(): Promise<Banner[]> {
    return this.getBannersByLocation('homepage_secondary', 10);
  }
}

// Export singleton instance
export const bannersService = new BannersService();
