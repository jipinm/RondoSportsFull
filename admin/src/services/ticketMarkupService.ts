/**
 * Ticket Markup API Service
 * Handles all ticket markup pricing operations for the admin panel
 */

import { apiClient } from './api-client';

// ============================================================================
// Types & Interfaces
// ============================================================================

// Markup type: fixed (USD amount) or percentage (% of base price)
export type MarkupType = 'fixed' | 'percentage';

export interface TicketMarkup {
  id: number;
  event_id: string;
  ticket_id: string;
  markup_price_usd: number;
  markup_type: MarkupType;
  markup_percentage: number | null;
  base_price_usd: number;
  final_price_usd: number;
  created_by: number | null;
  updated_by: number | null;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketMarkupInput {
  ticket_id: string;
  markup_price_usd: number;
  markup_type: MarkupType;
  markup_percentage?: number | null;
  base_price_usd: number;
  final_price_usd: number;
}

export interface BatchMarkupRequest {
  event_id: string;
  tickets: TicketMarkupInput[];
}

export interface BatchMarkupResponse {
  success: boolean;
  data: {
    success: boolean;
    affected_count: number;
    message: string;
  };
  message: string;
}

export interface MarkupResponse {
  success: boolean;
  data: TicketMarkup;
  message?: string;
}

export interface MarkupsResponse {
  success: boolean;
  data: TicketMarkup[];
  count?: number;
  pagination?: {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_more: boolean;
  };
}

export interface DeleteMarkupResponse {
  success: boolean;
  message: string;
  deleted_count?: number;
}

// ============================================================================
// Ticket Markup Service
// ============================================================================

export class TicketMarkupService {
  private baseUrl = '/admin/ticket-markups';

  /**
   * Batch create or update markups for all tickets in an event
   * This is the primary method for applying markup to event tickets
   */
  async batchUpsertMarkups(request: BatchMarkupRequest): Promise<BatchMarkupResponse> {
    try {
      console.log('🔨 Batch upserting markups for event:', request.event_id);
      console.log('📊 Tickets count:', request.tickets.length);

      const response = await apiClient.post<BatchMarkupResponse>(
        `${this.baseUrl}/batch`,
        request
      );

      if (!response.success) {
        throw new Error('Failed to batch upsert markups');
      }

      console.log('✅ Batch upsert successful:', response.data.message);
      return response;
    } catch (error: any) {
      console.error('❌ Error batch upserting markups:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get all markups for a specific event
   */
  async getMarkupsByEvent(eventId: string): Promise<TicketMarkup[]> {
    try {
      console.log('🔍 Fetching markups for event:', eventId);

      const response = await apiClient.get<MarkupsResponse>(
        `${this.baseUrl}/event/${eventId}`
      );

      if (!response.success) {
        throw new Error('Failed to fetch markups for event');
      }

      console.log('✅ Markups fetched:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching markups by event:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get markup for a specific ticket
   */
  async getMarkupByTicket(ticketId: string): Promise<TicketMarkup> {
    try {
      console.log('🔍 Fetching markup for ticket:', ticketId);

      const response = await apiClient.get<MarkupResponse>(
        `${this.baseUrl}/ticket/${ticketId}`
      );

      if (!response.success) {
        throw new Error('Failed to fetch markup for ticket');
      }

      console.log('✅ Markup fetched for ticket');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching markup by ticket:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get markup by ID
   */
  async getMarkupById(id: number): Promise<TicketMarkup> {
    try {
      console.log('🔍 Fetching markup with ID:', id);

      const response = await apiClient.get<MarkupResponse>(
        `${this.baseUrl}/${id}`
      );

      if (!response.success) {
        throw new Error('Failed to fetch markup');
      }

      console.log('✅ Markup fetched successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching markup by ID:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get all markups with pagination
   */
  async getAllMarkups(page = 1, perPage = 50): Promise<MarkupsResponse> {
    try {
      console.log('🔍 Fetching all markups - Page:', page);

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });

      const response = await apiClient.get<MarkupsResponse>(
        `${this.baseUrl}?${params}`
      );

      if (!response.success) {
        throw new Error('Failed to fetch markups');
      }

      console.log('✅ Markups fetched:', {
        count: response.data.length,
        total: response.pagination?.total_records || 0,
      });

      return response;
    } catch (error: any) {
      console.error('❌ Error fetching all markups:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update a single markup
   */
  async updateMarkup(
    id: number,
    data: Omit<TicketMarkupInput, 'ticket_id'>
  ): Promise<TicketMarkup> {
    try {
      console.log('✏️ Updating markup with ID:', id);

      const response = await apiClient.put<MarkupResponse>(
        `${this.baseUrl}/${id}`,
        data
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to update markup');
      }

      console.log('✅ Markup updated successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating markup:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete markup by ID
   */
  async deleteMarkupById(id: number): Promise<void> {
    try {
      console.log('🗑️ Deleting markup with ID:', id);

      const response = await apiClient.delete<DeleteMarkupResponse>(
        `${this.baseUrl}/${id}`
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete markup');
      }

      console.log('✅ Markup deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting markup:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete markup by ticket ID
   */
  async deleteMarkupByTicket(ticketId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting markup for ticket:', ticketId);

      const response = await apiClient.delete<DeleteMarkupResponse>(
        `${this.baseUrl}/ticket/${ticketId}`
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete markup');
      }

      console.log('✅ Markup deleted for ticket');
    } catch (error: any) {
      console.error('❌ Error deleting markup by ticket:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete all markups for an event
   */
  async deleteMarkupsByEvent(eventId: string): Promise<number> {
    try {
      console.log('🗑️ Deleting all markups for event:', eventId);

      const response = await apiClient.delete<DeleteMarkupResponse>(
        `${this.baseUrl}/event/${eventId}`
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete markups');
      }

      const deletedCount = response.deleted_count || 0;
      console.log('✅ Deleted markups for event:', deletedCount);
      return deletedCount;
    } catch (error: any) {
      console.error('❌ Error deleting markups by event:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (error.message) {
      return new Error(error.message);
    }
    return new Error('An unexpected error occurred');
  }
}

// Export singleton instance
export const ticketMarkupService = new TicketMarkupService();
