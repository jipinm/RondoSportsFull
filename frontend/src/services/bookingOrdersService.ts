/**
 * Booking Orders Service
 * Handles all booking order operations including guest data management
 * Implements all XS2Event /v1/bookingorders endpoints
 */

import { apiClient } from './apiRoutes';
import type {
  BookingOrdersResponse,
  BookingOrder,
  BookingOrdersQueryParams,
  GuestDataResponse,
  UpdateGuestDataRequest,
  GuestData,
  BookingOrderService
} from '../types/xs2event';

/**
 * Booking Orders Service Class
 * Provides methods for all XS2Event booking order endpoints
 */
class BookingOrdersServiceImpl implements BookingOrderService {

  /**
   * Get booking orders list
   * GET /v1/bookingorders/list
   */
  async getBookingOrders(params?: BookingOrdersQueryParams): Promise<BookingOrdersResponse> {
    try {

      // Build query parameters
      const queryParams: Record<string, any> = {};
      
      if (params) {
        // Add all valid parameters
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams[key] = value;
          }
        });
      }

      const response = await apiClient.get<BookingOrdersResponse>(
        '/v1/bookingorders/list',
        queryParams
      );


      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch booking orders:', error);
      throw new Error(error.message || 'Failed to fetch booking orders');
    }
  }

  /**
   * Get single booking order
   * GET /v1/bookingorders/{bookingorder_id}
   */
  async getBookingOrder(bookingOrderId: string): Promise<BookingOrder> {
    try {
      if (!bookingOrderId) {
        throw new Error('Booking order ID is required');
      }


      const response = await apiClient.get<BookingOrder>(
        `/v1/bookingorders/${bookingOrderId}`
      );


      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch booking order:', error);
      throw new Error(error.message || 'Failed to fetch booking order');
    }
  }

  /**
   * Get booking order guest data
   * GET /v1/bookingorders/{bookingorder_id}/guestdata
   */
  async getGuestData(bookingOrderId: string): Promise<GuestDataResponse> {
    try {
      if (!bookingOrderId) {
        throw new Error('Booking order ID is required');
      }


      const response = await apiClient.get<GuestDataResponse>(
        `/v1/bookingorders/${bookingOrderId}/guestdata`
      );


      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch guest data:', error);
      throw new Error(error.message || 'Failed to fetch guest data');
    }
  }

  /**
   * Update booking order guest data
   * PUT /v1/bookingorders/{bookingorder_id}/guestdata
   */
  async updateGuestData(
    bookingOrderId: string, 
    guestData: UpdateGuestDataRequest
  ): Promise<GuestDataResponse> {
    try {
      if (!bookingOrderId) {
        throw new Error('Booking order ID is required');
      }

      if (!guestData || !guestData.items || guestData.items.length === 0) {
        throw new Error('Guest data is required');
      }


      const response = await apiClient.put<GuestDataResponse>(
        `/v1/bookingorders/${bookingOrderId}/guestdata`,
        guestData
      );


      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to update guest data:', error);
      throw new Error(error.message || 'Failed to update guest data');
    }
  }

  /**
   * Get single guest data from booking order
   * GET /v1/bookingorders/{bookingorder_id}/guestdata/{guest_id}
   */
  async getSingleGuestData(bookingOrderId: string, guestId: string): Promise<GuestData> {
    try {
      if (!bookingOrderId) {
        throw new Error('Booking order ID is required');
      }

      if (!guestId) {
        throw new Error('Guest ID is required');
      }


      const response = await apiClient.get<GuestData>(
        `/v1/bookingorders/${bookingOrderId}/guestdata/${guestId}`
      );


      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch single guest data:', error);
      throw new Error(error.message || 'Failed to fetch guest data');
    }
  }

  /**
   * Update single guest data in booking order
   * PUT /v1/bookingorders/{bookingorder_id}/guestdata/{guest_id}
   */
  async updateSingleGuestData(
    bookingOrderId: string,
    guestId: string,
    guestData: GuestData
  ): Promise<GuestData> {
    try {
      if (!bookingOrderId) {
        throw new Error('Booking order ID is required');
      }

      if (!guestId) {
        throw new Error('Guest ID is required');
      }

      if (!guestData) {
        throw new Error('Guest data is required');
      }


      const response = await apiClient.put<GuestData>(
        `/v1/bookingorders/${bookingOrderId}/guestdata/${guestId}`,
        guestData
      );


      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to update single guest data:', error);
      throw new Error(error.message || 'Failed to update guest data');
    }
  }

  /**
   * Helper method to validate guest data before sending
   */
  validateGuestData(guestData: GuestData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!guestData.first_name?.trim()) {
      errors.push('First name is required');
    }

    if (!guestData.last_name?.trim()) {
      errors.push('Last name is required');
    }

    if (!guestData.contact_email?.trim()) {
      errors.push('Contact email is required');
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestData.contact_email)) {
        errors.push('Invalid email format');
      }
    }

    // Date of birth validation (if provided)
    if (guestData.date_of_birth) {
      const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobRegex.test(guestData.date_of_birth)) {
        errors.push('Date of birth must be in YYYY-MM-DD format');
      }
    }

    // Gender validation (if provided)
    if (guestData.gender && !['male', 'female', 'other'].includes(guestData.gender)) {
      errors.push('Gender must be male, female, or other');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper method to format guest data for display
   */
  formatGuestForDisplay(guest: GuestData): string {
    const parts: string[] = [];
    
    if (guest.first_name || guest.last_name) {
      parts.push(`${guest.first_name || ''} ${guest.last_name || ''}`.trim());
    }
    
    if (guest.contact_email) {
      parts.push(guest.contact_email);
    }
    
    if (guest.lead_guest) {
      parts.push('(Lead Guest)');
    }
    
    return parts.join(' - ');
  }

  /**
   * Helper method to check if booking order requires guest data
   */
  requiresGuestData(bookingOrder: BookingOrder): boolean {
    // Check if any items require guest data based on ticket type
    return bookingOrder.items.some(item => {
      // Usually e-tickets require guest data, physical tickets might not
      return item.type_ticket === 'eticket' || bookingOrder.guestdata_status !== 'completed';
    });
  }

  /**
   * Helper method to get guest data completion status
   */
  getGuestDataCompletionStatus(guestDataResponse: GuestDataResponse): {
    completed: number;
    total: number;
    percentage: number;
    isComplete: boolean;
  } {
    let completed = 0;
    let total = 0;

    guestDataResponse.items.forEach(item => {
      total += item.quantity;
      if (item.guests) {
        completed += item.guests.filter(guest => 
          guest.first_name && guest.last_name && guest.contact_email
        ).length;
      }
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      total,
      percentage,
      isComplete: completed === total
    };
  }
}

// Export singleton instance
export const bookingOrdersService = new BookingOrdersServiceImpl();