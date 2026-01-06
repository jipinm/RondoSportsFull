/**
 * E-Ticket Service
 * Handles ticket status checking and downloading for customer bookings
 */

import { CustomerAPIClient } from './customerApiClient';

// Ticket Status Response Interface
export interface TicketStatus {
  available: boolean;
  status: string; // 'pending' | 'processing' | 'available' | 'failed'
  eticket_available_date?: string;
  download_count?: number;
  ticket_urls?: TicketUrl[];
  zip_download_url?: string;
  message?: string;
}

export interface TicketUrl {
  order_item_id: string;
  download_url: string;
  sha_checksum?: string;
  ticket_number?: string;
}

export interface CustomerTicket {
  booking_id: number;
  booking_reference: string;
  event_name: string;
  event_date: string;
  eticket_status: string;
  eticket_available: boolean;
  download_count: number;
  ticket_urls?: TicketUrl[];
}

/**
 * E-Ticket Service Class
 * Manages e-ticket operations for authenticated customers
 */
export class ETicketService {
  private apiClient: CustomerAPIClient;

  constructor() {
    this.apiClient = new CustomerAPIClient();
  }

  /**
   * Set unauthorized callback (for redirecting to login on 401)
   */
  setUnauthorizedCallback(callback: () => void) {
    this.apiClient.setUnauthorizedCallback(callback);
  }

  /**
   * Get ticket status for a specific booking
   * @param bookingId - Local booking ID
   * @returns Promise with ticket status
   */
  async getTicketStatus(bookingId: number): Promise<TicketStatus> {
    try {
      const response = await this.apiClient.request<TicketStatus>(
        `/api/v1/customers/bookings/${bookingId}/tickets/status`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get ticket status:', error);
      throw new Error(error.message || 'Failed to retrieve ticket status');
    }
  }

  /**
   * Get all tickets for logged-in customer
   * @returns Promise with array of customer tickets
   */
  async getMyTickets(): Promise<CustomerTicket[]> {
    try {
      const response = await this.apiClient.request<CustomerTicket[]>(
        '/api/v1/customers/tickets',
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get customer tickets:', error);
      throw new Error(error.message || 'Failed to retrieve tickets');
    }
  }

  /**
   * Download a single ticket
   * @param bookingId - Local booking ID
   * @param orderItemId - XS2Event order item ID
   * @param downloadUrl - Direct download URL from XS2Event
   */
  async downloadSingleTicket(
    bookingId: number,
    orderItemId: string,
    downloadUrl: string
  ): Promise<void> {
    try {

      // Build URL with query parameters
      const url = new URL(
        `${this.apiClient['baseUrl']}/api/v1/customers/bookings/${bookingId}/tickets/download`
      );
      url.searchParams.append('order_item_id', orderItemId);
      url.searchParams.append('download_url', downloadUrl);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download ticket');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = this.extractFilename(contentDisposition) || `ticket-${orderItemId}.pdf`;

      // Download file
      const blob = await response.blob();
      this.handleFileDownload(blob, filename);

    } catch (error: any) {
      console.error('❌ Failed to download ticket:', error);
      throw new Error(error.message || 'Failed to download ticket');
    }
  }

  /**
   * Get E-Tickets Zip Download URL (XS2Event API)
   * GET /v1/etickets/download/zip/{bookingorder_id}
   * @param bookingOrderId - XS2Event booking order ID
   * @returns Promise with zip download URL
   */
  async getETicketZipUrl(bookingOrderId: string): Promise<string> {
    try {

      const response = await fetch(`${this.apiClient['baseUrl']}/v1/etickets/download/zip/${bookingOrderId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': import.meta.env.VITE_XS2EVENT_API_KEY || ''
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get zip download URL');
      }

      const zipUrl = await response.json() as string;

      return zipUrl;
    } catch (error: any) {
      console.error('❌ Failed to get e-ticket zip URL:', error);
      throw new Error(error.message || 'Failed to get e-ticket zip URL');
    }
  }

  /**
   * Download E-Ticket PDF directly (XS2Event API)
   * GET /v1/etickets/download/{bookingorder_id}/{orderitem_id}/url/{url}
   * @param bookingOrderId - XS2Event booking order ID
   * @param orderItemId - XS2Event order item ID
   * @param downloadUrl - The download URL from e-ticket data
   */
  async downloadETicketDirect(
    bookingOrderId: string,
    orderItemId: string,
    downloadUrl: string
  ): Promise<void> {
    try {

      const response = await fetch(`${this.apiClient['baseUrl']}/v1/etickets/download/${bookingOrderId}/${orderItemId}/url/${encodeURIComponent(downloadUrl)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf,application/octet-stream,*/*',
          'X-Api-Key': import.meta.env.VITE_XS2EVENT_API_KEY || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download e-ticket');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = this.extractFilename(contentDisposition) || `e-ticket-${bookingOrderId}-${orderItemId}.pdf`;

      // Download file
      const blob = await response.blob();
      this.handleFileDownload(blob, filename);

    } catch (error: any) {
      console.error('❌ Failed to download e-ticket:', error);
      throw new Error(error.message || 'Failed to download e-ticket');
    }
  }

  /**
   * Download all tickets as ZIP file
   * @param bookingId - Local booking ID
   */
  async downloadTicketZip(bookingId: number): Promise<void> {
    try {

      const url = `${this.apiClient['baseUrl']}/api/v1/customers/bookings/${bookingId}/tickets/zip`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download tickets');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = this.extractFilename(contentDisposition) || `tickets-booking-${bookingId}.zip`;

      // Download file
      const blob = await response.blob();
      this.handleFileDownload(blob, filename);

    } catch (error: any) {
      console.error('❌ Failed to download ticket ZIP:', error);
      throw new Error(error.message || 'Failed to download tickets');
    }
  }

  /**
   * Force check ticket availability (refresh from XS2Event API)
   * @param bookingId - Local booking ID
   * @returns Promise with updated ticket status
   */
  async checkAvailability(bookingId: number): Promise<TicketStatus> {
    try {

      const response = await this.apiClient.request<{ success: boolean; data: TicketStatus; message?: string }>(
        `/api/v1/customers/bookings/${bookingId}/tickets/check-availability`,
        {
          method: 'POST',
          headers: this.getAuthHeaders()
        }
      );

      // Extract the nested data field from the API response
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Failed to check ticket availability:', error);
      throw new Error(error.message || 'Failed to check ticket availability');
    }
  }

  /**
   * Get authentication headers with JWT token
   * @private
   */
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('customer_access_token');
    
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Extract filename from Content-Disposition header
   * @private
   */
  private extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;

    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
    if (matches && matches[1]) {
      return matches[1].replace(/['"]/g, '');
    }

    return null;
  }

  /**
   * Handle file download by creating a temporary anchor element
   * @private
   */
  private handleFileDownload(blob: Blob, filename: string): void {
    // Create blob URL
    const blobUrl = window.URL.createObjectURL(blob);

    // Create temporary anchor element
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL after a delay
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
  }
}

// Export singleton instance
export const eTicketService = new ETicketService();
