/**
 * Cancellation Request API Service
 * Handles all cancellation request-related API operations for admin
 */

import { apiClient } from './api-client';

// Types for cancellation request data
export interface CancellationRequest {
  id: number;
  booking_id: number;
  customer_user_id: number;
  cancellation_reason: string;
  status: 'pending' | 'approved' | 'declined';
  admin_notes?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // Related booking data
  booking?: {
    id: number;
    booking_reference: string;
    api_booking_id?: string;
    api_reservation_id?: string;
    event_name: string;
    event_date: string;
    venue_name?: string;
    total_amount: number;
    currency: string;
    payment_status: string;
    status: string;
  };
  // Related customer data
  customer?: {
    id: number;
    customer_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  // Admin reviewer data
  reviewer?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CancellationRequestFilters {
  page?: number;
  per_page?: number;
  status?: 'pending' | 'approved' | 'declined' | 'all';
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface CancellationRequestsResponse {
  success: boolean;
  data: CancellationRequest[];
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface CancellationRequestStats {
  total: number;
  pending: number;
  approved: number;
  declined: number;
}

class CancellationService {
  private readonly baseEndpoint = '/admin/cancellation-requests';

  /**
   * Transform flat backend response to nested CancellationRequest structure
   */
  private transformRequest(flatRequest: any): CancellationRequest {
    return {
      id: flatRequest.id,
      booking_id: flatRequest.booking_id,
      customer_user_id: flatRequest.customer_user_id,
      cancellation_reason: flatRequest.cancellation_reason,
      status: flatRequest.status,
      admin_notes: flatRequest.admin_notes,
      reviewed_by: flatRequest.reviewed_by,
      reviewed_at: flatRequest.reviewed_at,
      created_at: flatRequest.created_at || flatRequest.request_date,
      updated_at: flatRequest.updated_at,
      booking: {
        id: flatRequest.booking_id,
        booking_reference: flatRequest.booking_reference,
        api_booking_id: flatRequest.api_booking_id,
        api_reservation_id: flatRequest.api_reservation_id,
        event_name: flatRequest.event_name,
        event_date: flatRequest.event_date,
        venue_name: flatRequest.venue_name,
        total_amount: parseFloat(flatRequest.total_amount),
        currency: flatRequest.currency || 'USD',
        payment_status: flatRequest.payment_status,
        status: flatRequest.booking_status
      },
      customer: {
        id: flatRequest.customer_id,
        customer_id: flatRequest.customer_customer_id,
        email: flatRequest.customer_email,
        first_name: flatRequest.customer_first_name,
        last_name: flatRequest.customer_last_name,
        phone: flatRequest.customer_phone
      },
      reviewer: flatRequest.admin_name ? {
        id: flatRequest.reviewed_by,
        name: flatRequest.admin_name,
        email: ''
      } : undefined
    };
  }

  /**
   * Get all cancellation requests with optional filters
   */
  async getCancellationRequests(filters: CancellationRequestFilters = {}): Promise<CancellationRequestsResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.baseEndpoint}?${queryString}` : this.baseEndpoint;

    const response = await apiClient.get<{ success: boolean; data: { requests: any[]; pagination: any } }>(endpoint);
    
    // Transform the backend response to match our expected format
    return {
      success: response.success,
      data: response.data.requests.map(req => this.transformRequest(req)),
      pagination: {
        current_page: response.data.pagination.page,
        per_page: response.data.pagination.per_page,
        total_items: response.data.pagination.total,
        total_pages: response.data.pagination.total_pages,
        has_next: response.data.pagination.page < response.data.pagination.total_pages,
        has_prev: response.data.pagination.page > 1
      }
    };
  }

  /**
   * Get a single cancellation request by ID
   */
  async getCancellationRequest(id: number): Promise<CancellationRequest> {
    const response = await apiClient.get<{ success: boolean; data: any }>(`${this.baseEndpoint}/${id}`);
    return this.transformRequest(response.data);
  }

  /**
   * Approve a cancellation request
   */
  async approveCancellationRequest(id: number, adminNotes?: string): Promise<{ success: boolean; message: string }> {
    return apiClient.patch(`${this.baseEndpoint}/${id}/approve`, {
      admin_notes: adminNotes
    });
  }

  /**
   * Decline a cancellation request
   */
  async declineCancellationRequest(id: number, adminNotes: string): Promise<{ success: boolean; message: string }> {
    return apiClient.patch(`${this.baseEndpoint}/${id}/reject`, {
      admin_notes: adminNotes
    });
  }

  /**
   * Get cancellation request statistics
   */
  async getCancellationStats(): Promise<CancellationRequestStats> {
    const response = await apiClient.get<{ success: boolean; data: CancellationRequestStats }>(`${this.baseEndpoint}/stats`);
    return response.data;
  }

  /**
   * Export cancellation requests as CSV
   */
  async exportCancellationRequests(filters: CancellationRequestFilters = {}): Promise<Blob> {
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
}

// Export singleton instance
export const cancellationService = new CancellationService();
export default cancellationService;
