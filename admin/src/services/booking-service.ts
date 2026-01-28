/**
 * Booking API Service
 * Handles all booking-related API operations
 */

import { apiClient } from './api-client';

// Types for booking data
export interface BookingUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface BookingHospitality {
  id: number;
  hospitality_id: number;
  hospitality_name: string;
  price_usd: number;
  quantity: number;
  total_usd: number;
  ticket_id?: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  api_booking_id?: string;
  api_reservation_id?: string;
  customer_user_id: string;
  event_id?: string;
  event_name: string;
  event_date: string;
  event_time?: string;
  venue_id?: string;
  venue_name?: string;
  sport_type?: string;
  tournament_name?: string;
  customer_id: string;
  user: BookingUser;
  booking_date: string;
  number_of_tickets: number;
  ticket_count: number;
  ticket_price: number;
  total_amount: number;
  hospitality_total?: number;
  hospitalities?: BookingHospitality[];
  currency: string;
  payment_method?: string;
  payment_reference?: string;
  stripe_session_id?: string;
  payment_intent_id?: string;
  commission_amount?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'expired';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  seat_info?: any;
  ticket_info?: any;
  api_data?: any;
  category_name?: string;
  confirmed_at?: string;
  cancelled_at?: string;
  event_start_time?: string;
  source?: string;
  customer_notes?: string;
  admin_notes?: string;
  last_sync_at?: string;
  modified_by?: number;
  modified_by_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // XS2Event Integration Fields
  xs2event_booking_status?: string;
  xs2event_logistic_status?: string;
  xs2event_distribution_channel?: string;
  xs2event_booking_code?: string;
  xs2event_response_data?: string | any;
  xs2event_synced_at?: string;
  xs2event_sync_attempts?: number;
  xs2event_last_error?: string;
  // E-Ticket Fields
  eticket_status?: string;
  eticket_available_date?: string;
  eticket_urls?: string;
  zip_download_url?: string;
  last_download_attempt?: string;
  download_count?: number;
  first_downloaded_at?: string;
  ticket_expiry_date?: string;
  download_error_message?: string;
  // Stripe Payment Fields
  stripe_payment_method_id?: string;
  stripe_customer_id?: string;
  stripe_charge_id?: string;
  payment_gateway_response?: string;
  payment_gateway_fee?: number;
  payment_completed_at?: string;
  // Refund Fields
  refund_id?: string;
  refund_amount?: number;
  refund_reason?: string;
  refunded_at?: string;
  // Cancellation Fields
  cancellation_status?: 'none' | 'requested' | 'approved' | 'declined' | 'cancelled';
  cancellation_date?: string;
  // Legacy Cancellation Request Fields (may be deprecated)
  cancellation_request_id?: string;
  cancellation_request_status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  cancellation_request_date?: string;
  cancellation_reason?: string;
  cancellation_customer_notes?: string;
  cancellation_admin_notes?: string;
  cancellation_reviewed_date?: string;
  cancellation_refund_amount?: number;
  cancellation_refund_status?: 'not_applicable' | 'pending' | 'processed' | 'failed';
}

export interface BookingStats {
  totalBookings: number;
  totalRevenue: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  refundedBookings: number;
}

export interface ApiPagination {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface BookingsApiResponse {
  success: boolean;
  data: Booking[];
  pagination: ApiPagination;
}

export interface BookingsResponse {
  bookings: Booking[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  stats?: BookingStats;
}

export interface BookingFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  payment_status?: string;
  cancellation_status?: string;
  sport_type?: string;
  start_date?: string;
  end_date?: string;
}

class BookingService {
  private readonly baseEndpoint = '/admin/bookings';

  /**
   * Get all bookings with optional filters
   */
  async getBookings(filters: BookingFilters = {}): Promise<BookingsResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.baseEndpoint}?${queryString}` : this.baseEndpoint;

    const apiResponse = await apiClient.get<BookingsApiResponse>(endpoint);

    // Transform API response to expected format
    return {
      bookings: apiResponse.data,
      total: apiResponse.pagination.total_items,
      page: apiResponse.pagination.current_page,
      perPage: apiResponse.pagination.per_page,
      totalPages: apiResponse.pagination.total_pages,
    };
  }

  /**
   * Get a single booking by ID
   */
  async getBooking(id: string): Promise<Booking> {
    const apiResponse = await apiClient.get<{ success: boolean; data: Booking }>(`${this.baseEndpoint}/${id}`);
    return apiResponse.data;
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(id: string, status: Booking['status'], notes?: string): Promise<{ success: boolean; message: string }> {
    const apiResponse = await apiClient.put<{ 
      success: boolean; 
      message: string; 
      data: { booking_id: number; old_status: string; new_status: string } 
    }>(`${this.baseEndpoint}/${id}/status`, {
      status,
      reason: notes
    });
    
    return {
      success: apiResponse.success,
      message: apiResponse.message
    };
  }

  /**
   * Get booking statistics
   */
  async getBookingStats(): Promise<BookingStats> {
    return apiClient.get<BookingStats>(`${this.baseEndpoint}/stats`);
  }

  /**
   * Export bookings as CSV
   */
  async exportBookings(filters: BookingFilters = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    queryParams.append('export', 'csv');
    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.baseEndpoint}?${queryString}` : `${this.baseEndpoint}?export=csv`;

    // For file downloads, we need to handle the response differently
    const response = await fetch(`${apiClient['baseURL']}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }
  
  /**
   * Sync booking with XS2Event API (manual trigger)
   */
  async syncWithXS2Event(bookingId: string): Promise<{ success: boolean; message: string; data?: any }> {
    return apiClient.post(`${this.baseEndpoint}/${bookingId}/sync-xs2event`, {});
  }
  
  /**
   * Check ticket availability for a booking
   */
  async checkTicketStatus(bookingId: string): Promise<{ success: boolean; message: string; data?: any }> {
    return apiClient.post(`${this.baseEndpoint}/${bookingId}/check-tickets`, {});
  }
  
  /**
   * Get bookings without XS2Event sync (missing api_booking_id)
   */
  async getUnsyncedBookings(): Promise<Booking[]> {
    const response = await apiClient.get<{ success: boolean; data: Booking[] }>(`${this.baseEndpoint}/without-api-id`);
    return response.data;
  }
  
  /**
   * Process refund for a booking
   */
  async processRefund(
    bookingId: string, 
    amount?: number, 
    reason?: string,
    adminNotes?: string
  ): Promise<{ 
    success: boolean; 
    message: string; 
    data?: {
      refund_id: string;
      refund_amount: number;
      refund_status: string;
      payment_status: string;
      currency: string;
      total_refunded: number;
    }
  }> {
    const payload: any = {};
    
    if (amount !== undefined && amount !== null) {
      payload.amount = amount;
    }
    
    if (reason) {
      payload.reason = reason;
    }
    
    if (adminNotes) {
      payload.admin_notes = adminNotes;
    }

    return apiClient.post(`${this.baseEndpoint}/${bookingId}/refund`, payload);
  }
}

// Export singleton instance
export const bookingService = new BookingService();
export default bookingService;