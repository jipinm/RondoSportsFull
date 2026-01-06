/**
 * Bookings Service
 * Enhanced service for all XS2Event booking operations
 * Complements the existing useBooking hook with additional endpoints
 */

import { apiClient } from './apiRoutes';
import type {
  BookingsResponse,
  Booking,
  BookingsQueryParams,
  BookingService
} from '../types/xs2event';

/**
 * Bookings Service Class
 * Provides methods for all XS2Event booking endpoints
 */
class BookingsServiceImpl implements BookingService {

  /**
   * Get bookings list
   * GET /v1/bookings/
   */
  async getBookings(params?: BookingsQueryParams): Promise<BookingsResponse> {
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

      const response = await apiClient.get<BookingsResponse>(
        '/v1/bookings',
        queryParams
      );


      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch bookings:', error);
      throw new Error(error.message || 'Failed to fetch bookings');
    }
  }

  /**
   * Get single booking
   * GET /v1/bookings/{booking_id}
   */
  async getBooking(bookingId: string): Promise<Booking> {
    try {
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }


      const response = await apiClient.get<Booking>(
        `/v1/bookings/${bookingId}`
      );


      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch booking:', error);
      throw new Error(error.message || 'Failed to fetch booking');
    }
  }

  /**
   * Get bookings by reservation ID
   * GET /v1/bookings/reservation/{reservation_id}
   */
  async getBookingsByReservation(reservationId: string, sorting?: string): Promise<Booking> {
    try {
      if (!reservationId) {
        throw new Error('Reservation ID is required');
      }


      // Build query parameters
      const queryParams: Record<string, any> = {};
      if (sorting) {
        queryParams.sorting = sorting;
      }

      const response = await apiClient.get<Booking>(
        `/v1/bookings/reservation/${reservationId}`,
        queryParams
      );


      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch bookings by reservation:', error);
      throw new Error(error.message || 'Failed to fetch bookings by reservation');
    }
  }

  /**
   * Helper method to calculate total amount for a booking
   */
  calculateBookingTotal(booking: Booking): number {
    return booking.items.reduce((total, item) => {
      return total + (item.salesprice * item.quantity);
    }, 0);
  }

  /**
   * Helper method to get booking status display
   */
  getBookingStatusDisplay(booking: Booking): {
    status: string;
    color: 'success' | 'warning' | 'error' | 'info';
    description: string;
  } {
    const financialStatus = booking.distributorfinancial_status?.toLowerCase();
    const logisticStatus = booking.logistic_status?.toLowerCase();

    // Determine overall status
    if (logisticStatus === 'completed' && financialStatus === 'paid') {
      return {
        status: 'Completed',
        color: 'success',
        description: 'Booking is fully processed and paid'
      };
    }

    if (logisticStatus === 'completed' && financialStatus === 'open') {
      return {
        status: 'Awaiting Payment',
        color: 'warning',
        description: 'Booking confirmed, payment pending'
      };
    }

    if (logisticStatus === 'processing') {
      return {
        status: 'Processing',
        color: 'info',
        description: 'Booking is being processed'
      };
    }

    if (booking.deleted) {
      return {
        status: 'Cancelled',
        color: 'error',
        description: 'Booking has been cancelled'
      };
    }

    return {
      status: 'Unknown',
      color: 'info',
      description: 'Status unclear'
    };
  }

  /**
   * Helper method to format booking for display
   */
  formatBookingForDisplay(booking: Booking): {
    title: string;
    subtitle: string;
    totalAmount: number;
    currency: string;
    ticketCount: number;
    eventNames: string[];
  } {
    const totalAmount = this.calculateBookingTotal(booking);
    const ticketCount = booking.items.reduce((total, item) => total + item.quantity, 0);
    const eventNames = [...new Set(booking.items.map(item => item.event_name))];
    const currency = booking.items[0]?.currency || 'EUR';

    const title = booking.booking_code || booking.booking_reference || 'Unknown Booking';
    const subtitle = eventNames.length === 1 
      ? eventNames[0] 
      : `${eventNames.length} events`;

    return {
      title,
      subtitle,
      totalAmount,
      currency,
      ticketCount,
      eventNames
    };
  }

  /**
   * Helper method to check if booking has e-tickets available
   */
  hasETickets(booking: Booking): boolean {
    return booking.items.some(item => {
      // Check if any items are e-tickets (based on common naming conventions)
      return item.ticket_name?.toLowerCase().includes('eticket') ||
             item.ticket_name?.toLowerCase().includes('e-ticket') ||
             // Check logistic status suggests digital delivery
             booking.logistic_status === 'COMPLETED';
    });
  }

  /**
   * Helper method to validate booking query parameters
   */
  validateQueryParams(params: BookingsQueryParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Page size validation
    if (params.page_size !== undefined) {
      if (params.page_size < 1 || params.page_size > 500) {
        errors.push('Page size must be between 1 and 500');
      }
    }

    // Page validation
    if (params.page !== undefined && params.page < 1) {
      errors.push('Page number must be greater than 0');
    }

    // Compare mode validation
    if (params.compare_mode && !['AND', 'OR'].includes(params.compare_mode)) {
      errors.push('Compare mode must be either AND or OR');
    }

    // Email validation (basic)
    if (params.booking_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(params.booking_email)) {
        errors.push('Invalid email format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper method to build optimized query for common use cases
   */
  buildQuickFilters(): {
    today: BookingsQueryParams;
    thisWeek: BookingsQueryParams;
    thisMonth: BookingsQueryParams;
    pending: BookingsQueryParams;
    completed: BookingsQueryParams;
  } {

    return {
      today: {
        page_size: 50,
        sorting: '-created'
      },
      thisWeek: {
        page_size: 100,
        sorting: '-created'
      },
      thisMonth: {
        page_size: 200,
        sorting: '-created'
      },
      pending: {
        page_size: 50,
        sorting: '-created'
      },
      completed: {
        page_size: 50,
        sorting: '-created'
      }
    };
  }
}

// Export singleton instance
export const bookingsService = new BookingsServiceImpl();