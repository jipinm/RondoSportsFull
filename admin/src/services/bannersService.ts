/**
 * Banners API Service
 * Handles all banner-related API operations for the admin panel
 */

import { apiClient } from './api-client';
import type {
  Banner,
  BannerCreate,
  BannerUpdate,
  BannersFilters,
  BannersResponse,
  BannerUploadResponse,
  PublicBannersResponse,
  BannerStatsResponse,
  BannerError
} from '../types/banners';

export class BannersService {
  private baseUrl = '/admin/banners';

  /**
   * Get all banners with filtering and pagination
   */
  async getBanners(
    filters: BannersFilters = {},
    page = 1,
    perPage = 20
  ): Promise<BannersResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      console.log('🔍 Fetching banners with params:', params.toString());

      const response = await apiClient.get<BannersResponse>(`${this.baseUrl}?${params}`);
      
      if (!response.success) {
        throw new Error('Failed to fetch banners');
      }

      console.log('✅ Banners fetched successfully:', {
        count: response.data?.length || 0,
        total: response.pagination?.total || 0,
        filters: response.filters_applied
      });

      return response;
    } catch (error: any) {
      console.error('❌ Error fetching banners:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get a single banner by ID
   */
  async getBanner(id: number): Promise<Banner> {
    try {
      console.log('🔍 Fetching banner with ID:', id);

      const response = await apiClient.get<{ success: boolean; data: Banner; error?: string }>(`${this.baseUrl}/${id}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch banner');
      }

      console.log('✅ Banner fetched successfully:', response.data.title);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching banner:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create a new banner
   */
  async createBanner(bannerData: BannerCreate): Promise<Banner> {
    try {
      console.log('🔨 Creating banner:', bannerData.title);

      // Extract the file for separate upload
      const imageFile = bannerData.image;
      
      // Create banner data without the file
      const cleanData = { ...bannerData };
      if ('image' in cleanData) {
        delete (cleanData as any).image; // Remove file object
      }

      // Create the banner first
      const response = await apiClient.post<{ success: boolean; data: Banner; error?: string }>(this.baseUrl, cleanData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create banner');
      }

      console.log('✅ Banner created successfully:', response.data.id);
      
      // If there's an image file, upload it
      if (imageFile && imageFile instanceof File) {
        try {
          console.log('📤 Uploading image for banner:', response.data.id);
          const uploadResult = await this.uploadBannerImage(response.data.id, imageFile);
          console.log('✅ Image uploaded successfully:', uploadResult.image_url);
          
          // Return the updated banner with the new image
          return uploadResult;
        } catch (uploadError: any) {
          console.warn('⚠️ Banner created but image upload failed:', uploadError.message);
          // Return the banner even if image upload fails
          return response.data;
        }
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating banner:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing banner
   */
  async updateBanner(id: number, bannerData: BannerUpdate): Promise<Banner> {
    try {
      console.log('🔧 Updating banner:', id);

      // Extract the file for separate upload
      const imageFile = bannerData.image;
      
      // Create update data without the file
      const cleanData = { ...bannerData };
      if ('image' in cleanData) {
        delete (cleanData as any).image; // Remove file object
      }

      // Update the banner first
      const response = await apiClient.put<{ success: boolean; data: Banner; error?: string }>(`${this.baseUrl}/${id}`, cleanData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update banner');
      }

      console.log('✅ Banner updated successfully:', response.data.title);
      
      // If there's an image file, upload it
      if (imageFile && imageFile instanceof File) {
        try {
          console.log('📤 Uploading new image for banner:', id);
          const uploadResult = await this.uploadBannerImage(id, imageFile);
          console.log('✅ Image uploaded successfully:', uploadResult.image_url);
          
          // Return the updated banner with the new image
          return uploadResult;
        } catch (uploadError: any) {
          console.warn('⚠️ Banner updated but image upload failed:', uploadError.message);
          // Return the banner even if image upload fails
          return response.data;
        }
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating banner:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a banner
   */
  async deleteBanner(id: number): Promise<void> {
    try {
      console.log('🗑️ Deleting banner:', id);

      const response = await apiClient.delete<{ success: boolean; message?: string; error?: string }>(`${this.baseUrl}/${id}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete banner');
      }

      console.log('✅ Banner deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting banner:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Upload banner image
   */
  async uploadBannerImage(
    bannerId: number,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<Banner> {
    try {
      console.log('📤 Uploading image for banner:', bannerId, 'File:', file.name);

      // Validate file before upload
      this.validateImageFile(file);

      const formData = new FormData();
      formData.append('image', file);

      // Use postFormData method from API client
      const response = await apiClient.postFormData<BannerUploadResponse>(
        `${this.baseUrl}/${bannerId}/upload`,
        formData
      );

      if (!response.success) {
        const errorMsg = 'error' in response ? String(response.error) : 'Failed to upload banner image';
        throw new Error(errorMsg);
      }

      console.log('✅ Banner image uploaded successfully:', response.data.filename);
      if (onProgress) {
        onProgress(100);
      }

      // Fetch and return the latest banner data
      return await this.getBanner(bannerId);
    } catch (error: any) {
      console.error('❌ Error uploading banner image:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update banner positions
   */
  async updateBannerPositions(positions: Record<number, number>): Promise<void> {
    try {
      console.log('🔄 Updating banner positions:', positions);

      const response = await apiClient.put<{ success: boolean; message?: string; error?: string }>(`${this.baseUrl}/positions`, { positions });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update banner positions');
      }

      console.log('✅ Banner positions updated successfully');
    } catch (error: any) {
      console.error('❌ Error updating banner positions:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get public banners by location (for frontend preview)
   */
  async getPublicBanners(location: string, limit = 10): Promise<PublicBannersResponse> {
    try {
      console.log('🌐 Fetching public banners for location:', location);

      const response = await apiClient.get<PublicBannersResponse>(`/api/v1/banners/${location}?limit=${limit}`);
      
      if (!response.success) {
        const errorMsg = 'error' in response ? String(response.error) : 'Failed to fetch public banners';
        throw new Error(errorMsg);
      }

      console.log('✅ Public banners fetched successfully:', response.data.length);
      return response;
    } catch (error: any) {
      console.error('❌ Error fetching public banners:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get banner statistics (if endpoint exists)
   */
  async getBannerStats(): Promise<BannerStatsResponse['data']> {
    try {
      console.log('📊 Fetching banner statistics');

      const response = await apiClient.get<BannerStatsResponse>(`${this.baseUrl}/stats`);
      
      if (!response.success) {
        const errorMsg = 'error' in response ? String(response.error) : 'Failed to fetch banner statistics';
        throw new Error(errorMsg);
      }

      console.log('✅ Banner statistics fetched successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching banner statistics:', error);
      // Return mock data if stats endpoint doesn't exist
      return {
        total_banners: 0,
        active_banners: 0,
        total_clicks: 0,
        total_impressions: 0,
        top_performing: []
      };
    }
  }

  /**
   * Track banner click (for testing/preview)
   */
  async trackBannerClick(bannerId: number): Promise<void> {
    try {
      await apiClient.post<{ success: boolean }>(`/api/v1/banners/${bannerId}/click`);
      console.log('📊 Banner click tracked:', bannerId);
    } catch (error: any) {
      console.warn('⚠️ Failed to track banner click:', error.message);
      // Don't throw error for tracking failures
    }
  }

  /**
   * Track banner impression (for testing/preview)
   */
  async trackBannerImpression(bannerId: number): Promise<void> {
    try {
      await apiClient.post<{ success: boolean }>(`/api/v1/banners/${bannerId}/impression`);
      console.log('📊 Banner impression tracked:', bannerId);
    } catch (error: any) {
      console.warn('⚠️ Failed to track banner impression:', error.message);
      // Don't throw error for tracking failures
    }
  }

  /**
   * Validate image file before upload
   */
  private validateImageFile(file: File): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/svg+xml',
      'image/webp',
      'image/avif'
    ];

    if (file.size > maxSize) {
      throw new Error('File size exceeded. Maximum allowed size is 10MB');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file format. Allowed formats: JPEG, JPG, PNG, SVG, WebP, AVIF');
    }

    // Check file extension as additional validation
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'svg', 'webp', 'avif'];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new Error('Invalid file extension. Allowed extensions: .jpg, .jpeg, .png, .svg, .webp, .avif');
    }
  }

  /**
   * Handle API errors with proper error formatting
   */
  private handleError(error: any): Error {
    if (error.response?.data) {
      const errorData = error.response.data as BannerError;
      
      if (errorData.field_errors && errorData.field_errors.length > 0) {
        // Create validation error with field details
        const fieldMessages = errorData.field_errors
          .map(fe => `${fe.field}: ${fe.message}`)
          .join(', ');
        
        const validationError = new Error(`Validation failed: ${fieldMessages}`) as any;
        validationError.fieldErrors = Object.fromEntries(
          errorData.field_errors.map(fe => [fe.field, fe.message])
        );
        validationError.isValidationError = true;
        
        return validationError;
      }
      
      return new Error(errorData.error || 'An error occurred');
    }

    if (error.message) {
      return new Error(error.message);
    }

    return new Error('An unexpected error occurred');
  }

  /**
   * Generate preview URL for banner image
   */
  generatePreviewUrl(imageUrl: string): string {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // Assume relative URLs are from our API
    return `https://apix2.redberries.ae${imageUrl}`;
  }

  /**
   * Format date for banner scheduling
   */
  formatDateForApi(date: Date | string): string {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * Parse API date to local date
   */
  parseApiDate(dateString: string): Date {
    return new Date(dateString.replace(' ', 'T') + 'Z');
  }

  /**
   * Get available banner locations for dropdown
   */
  getBannerLocations() {
    return [
      { value: 'homepage_hero', label: 'Homepage Hero' },
      { value: 'homepage_secondary', label: 'Homepage Secondary' },
      { value: 'category_page', label: 'Category Page' },
      { value: 'event_page', label: 'Event Page' }
    ];
  }

  /**
   * Get available banner statuses for dropdown
   */
  getBannerStatuses() {
    return [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ];
  }

  /**
   * Get link target options for dropdown
   */
  getLinkTargets() {
    return [
      { value: '_self', label: 'Same Window' },
      { value: '_blank', label: 'New Window' }
    ];
  }
}

// Export singleton instance
export const bannersService = new BannersService();
export default bannersService;