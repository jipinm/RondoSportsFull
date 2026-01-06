/**
 * Refund API Service
 * Handles all refund-related API operations
 */

import { apiClient } from './api-client';

// Types for refund data - matching the backend response structure
export interface RefundUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface RefundRequest {
  id: string;
  bookingId: string;
  userId: string;
  user: RefundUser;
  amount: number;
  reason: string;
  requestDate: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'processed' | 'completed' | 'cancelled';
  // Additional fields from backend
  refundReference: string;
  refundType: 'full' | 'partial';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  approvedAmount?: number;
  processingFee?: number;
  netRefundAmount?: number;
  adminNotes?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  approvedAt?: string;
  processedAt?: string;
  completedAt?: string;
  // Booking details for display
  eventName?: string;
  eventDate?: string;
  totalTickets?: number;
  originalAmount?: number;
}

export interface RefundStats {
  totalRefunds: number;
  totalRefundAmount: number;
  pendingRefunds: number;
  approvedRefunds: number;
  rejectedRefunds: number;
  processedRefunds: number;
  averageProcessingTime: string;
}

export interface ApiPagination {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface RefundsApiResponse {
  success: boolean;
  data: RefundRequest[];
  pagination: ApiPagination;
}

export interface RefundsResponse {
  refunds: RefundRequest[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  stats?: RefundStats;
}

export interface RefundFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  priority?: string;
  refund_type?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface RefundStatusUpdateRequest {
  status: RefundRequest['status'];
  admin_notes?: string;
  rejection_reason?: string;
  approved_amount?: number;
  processing_fee?: number;
}

class RefundService {
  private readonly baseEndpoint = '/admin/refunds';

  /**
   * Get all refund requests with optional filters
   */
  async getRefunds(filters: RefundFilters = {}): Promise<RefundsResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.baseEndpoint}?${queryString}` : this.baseEndpoint;

    const apiResponse = await apiClient.get<RefundsApiResponse>(endpoint);

    // Transform API response to expected format
    return {
      refunds: apiResponse.data,
      total: apiResponse.pagination.total_items,
      page: apiResponse.pagination.current_page,
      perPage: apiResponse.pagination.per_page,
      totalPages: apiResponse.pagination.total_pages,
    };
  }

  /**
   * Get a single refund request by ID
   */
  async getRefund(id: string): Promise<RefundRequest> {
    const apiResponse = await apiClient.get<{ success: boolean; data: RefundRequest }>(`${this.baseEndpoint}/${id}`);
    return apiResponse.data;
  }

  /**
   * Update refund status
   */
  async updateRefundStatus(
    id: string, 
    statusUpdate: RefundStatusUpdateRequest
  ): Promise<{ success: boolean; message: string }> {
    return await apiClient.put<{ success: boolean; message: string }>(
      `${this.baseEndpoint}/${id}/status`,
      statusUpdate
    );
  }

  /**
   * Get refund statistics
   */
  async getRefundStats(): Promise<RefundStats> {
    const apiResponse = await apiClient.get<{ success: boolean; data: RefundStats }>(`${this.baseEndpoint}/stats`);
    return apiResponse.data;
  }

  /**
   * Export refunds to CSV
   */
  async exportRefunds(filters: RefundFilters = {}): Promise<string> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.baseEndpoint}/export?${queryString}` : `${this.baseEndpoint}/export`;

    // This endpoint returns CSV data as text
    const response = await fetch(`${apiClient.getBaseUrl()}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Accept': 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  }

  /**
   * Download refunds as CSV file
   */
  async downloadRefundsCSV(filters: RefundFilters = {}, filename = 'refunds.csv'): Promise<void> {
    try {
      const csvData = await this.exportRefunds(filters);
      
      // Create blob and download
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      throw error;
    }
  }

  /**
   * Get refunds by customer
   */
  async getRefundsByCustomer(customerId: string): Promise<RefundRequest[]> {
    const apiResponse = await apiClient.get<{ success: boolean; data: RefundRequest[] }>(
      `${this.baseEndpoint}?customer_id=${customerId}&per_page=100`
    );
    return apiResponse.data;
  }

  /**
   * Bulk update refund status (if needed in future)
   */
  async bulkUpdateRefundStatus(
    refundIds: string[],
    statusUpdate: RefundStatusUpdateRequest
  ): Promise<{ success: boolean; message: string; updated: number }> {
    return await apiClient.put<{ success: boolean; message: string; updated: number }>(
      `${this.baseEndpoint}/bulk-update`,
      {
        refund_ids: refundIds,
        ...statusUpdate
      }
    );
  }
}

// Export singleton instance
export const refundService = new RefundService();
export default refundService;