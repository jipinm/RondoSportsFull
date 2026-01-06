import { CustomerAPIClient } from './customerApiClient';

// TypeScript Interfaces
export interface CancellationRequest {
  request_id: number;
  booking_id: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  request_date: string;
  cancellation_reason: string;
  customer_notes?: string;
  admin_notes?: string;
  reviewed_date?: string;
  refund_amount?: number;
  refund_status?: 'not_applicable' | 'pending' | 'processed' | 'failed';
}

export interface CancellationRequestData {
  cancellation_reason: string;
  customer_notes?: string;
}

export interface CancellationResponse {
  success: boolean;
  message: string;
  data?: CancellationRequest | any;
  error?: string;
}

/**
 * Service for handling cancellation requests
 */
export class CancellationService {
  private apiClient: CustomerAPIClient;

  constructor() {
    this.apiClient = new CustomerAPIClient();
  }

  /**
   * Request cancellation for a booking
   * @param bookingId - Booking ID
   * @param data - Cancellation request data
   * @returns Promise with cancellation response
   */
  async requestCancellation(
    bookingId: number,
    data: CancellationRequestData
  ): Promise<CancellationResponse> {
    try {
      console.log('🔄 Requesting cancellation for booking:', bookingId, data);

      const response = await this.apiClient.request<CancellationResponse>(
        `/api/v1/customers/bookings/${bookingId}/cancel-request`,
        {
          method: 'POST',
          body: data
        }
      );

      console.log('✅ Cancellation request submitted:', response);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to request cancellation:', error);
      
      return {
        success: false,
        message: 'Failed to submit cancellation request',
        error: error.response?.data?.error || error.message || 'Unknown error'
      };
    }
  }

  /**
   * Get cancellation request status for a booking
   * @param bookingId - Booking ID
   * @returns Promise with cancellation request data
   */
  async getCancellationStatus(bookingId: number): Promise<CancellationResponse> {
    try {
      console.log('🔍 Fetching cancellation status for booking:', bookingId);

      const response = await this.apiClient.request<CancellationResponse>(
        `/api/v1/customers/bookings/${bookingId}/cancel-request`,
        {
          method: 'GET'
        }
      );

      console.log('✅ Cancellation status fetched:', response);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch cancellation status:', error);

      // If 404, it means no cancellation request exists (not an error)
      if (error.response?.status === 404) {
        return {
          success: false,
          message: 'No cancellation request found',
          data: null
        };
      }

      return {
        success: false,
        message: 'Failed to fetch cancellation status',
        error: error.response?.data?.error || error.message || 'Unknown error'
      };
    }
  }

  /**
   * Cancel a cancellation request (customer cancels their own request)
   * @param bookingId - Booking ID
   * @returns Promise with cancellation response
   */
  async cancelCancellationRequest(bookingId: number): Promise<CancellationResponse> {
    try {
      console.log('🔄 Cancelling cancellation request for booking:', bookingId);

      const response = await this.apiClient.request<CancellationResponse>(
        `/api/v1/customers/bookings/${bookingId}/cancel-request`,
        {
          method: 'DELETE'
        }
      );

      console.log('✅ Cancellation request cancelled:', response);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to cancel cancellation request:', error);

      return {
        success: false,
        message: 'Failed to cancel cancellation request',
        error: error.response?.data?.error || error.message || 'Unknown error'
      };
    }
  }

  /**
   * Get status badge color based on cancellation status
   * @param status - Cancellation status
   * @returns Color class name
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warning'; // Yellow
      case 'approved':
        return 'info'; // Blue
      case 'rejected':
        return 'error'; // Red
      case 'completed':
        return 'success'; // Green
      case 'cancelled':
        return 'default'; // Gray
      default:
        return 'default';
    }
  }

  /**
   * Get human-readable status text
   * @param status - Cancellation status
   * @returns Formatted status text
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  /**
   * Get refund status text
   * @param refundStatus - Refund status
   * @returns Formatted refund status text
   */
  getRefundStatusText(refundStatus: string): string {
    switch (refundStatus) {
      case 'not_applicable':
        return 'Not Applicable';
      case 'pending':
        return 'Pending';
      case 'processed':
        return 'Processed';
      case 'failed':
        return 'Failed';
      default:
        return refundStatus;
    }
  }

  /**
   * Format currency amount
   * @param amount - Amount to format
   * @param currency - Currency code (default: EUR)
   * @returns Formatted currency string
   */
  formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Format date string
   * @param dateString - ISO date string
   * @returns Formatted date string
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Validate cancellation reason
   * @param reason - Cancellation reason
   * @returns Validation result
   */
  validateReason(reason: string): { valid: boolean; error?: string } {
    if (!reason || reason.trim().length === 0) {
      return { valid: false, error: 'Cancellation reason is required' };
    }

    if (reason.trim().length < 10) {
      return { valid: false, error: 'Reason must be at least 10 characters' };
    }

    if (reason.length > 1000) {
      return { valid: false, error: 'Reason is too long (max 1000 characters)' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const cancellationService = new CancellationService();
export default cancellationService;
