/**
 * Hospitality API Service
 * Handles all hospitality services operations for the admin panel
 */

import { apiClient } from './api-client';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Hospitality {
  id: number;
  name: string;
  description: string | null;
  price_usd: number;
  is_active: boolean;
  sort_order: number;
  created_by: number | null;
  updated_by: number | null;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface HospitalityInput {
  name: string;
  description?: string | null;
  price_usd: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface TicketHospitality {
  id: number;
  event_id: string;
  ticket_id: string;
  hospitality_id: number;
  custom_price_usd: number | null;
  name: string;
  description: string | null;
  base_price_usd: number;
  effective_price_usd: number;
  is_active: boolean;
  created_by: number | null;
  created_by_name?: string;
  created_at: string;
}

export interface HospitalityStats {
  total_hospitalities: number;
  active_hospitalities: number;
  total_assignments: number;
  unique_events_with_hospitalities: number;
  top_hospitalities: Array<{
    id: number;
    name: string;
    assignment_count: number;
  }>;
}

export interface BatchAssignRequest {
  event_id: string;
  tickets: Record<string, number[]>; // ticket_id -> hospitality_ids[]
}

export interface HospitalityResponse {
  success: boolean;
  data: Hospitality;
  message?: string;
}

export interface HospitalitiesResponse {
  success: boolean;
  data: Hospitality[];
  count: number;
}

export interface TicketHospitalitiesResponse {
  success: boolean;
  data: TicketHospitality[];
  grouped_by_ticket?: Record<string, TicketHospitality[]>;
  count: number;
}

export interface StatsResponse {
  success: boolean;
  data: HospitalityStats;
}

export interface AssignmentResponse {
  success: boolean;
  data: {
    success: boolean;
    deleted_count: number;
    inserted_count: number;
    tickets_processed?: number;
    message: string;
  };
  message: string;
}

export interface DeleteResponse {
  success: boolean;
  deleted_count?: number;
  message: string;
}

// ============================================================================
// Hospitality Service
// ============================================================================

export class HospitalityService {
  private baseUrl = '/admin/hospitalities';

  // ==========================================================================
  // CRUD Operations for Hospitality Services
  // ==========================================================================

  /**
   * Get all hospitality services
   */
  async getAllHospitalities(activeOnly: boolean = false): Promise<HospitalitiesResponse> {
    try {
      console.log('📋 Fetching all hospitalities, activeOnly:', activeOnly);

      const url = activeOnly ? `${this.baseUrl}?active=true` : this.baseUrl;
      const response = await apiClient.get<HospitalitiesResponse>(url);

      if (!response.success) {
        throw new Error('Failed to fetch hospitalities');
      }

      console.log('✅ Fetched hospitalities:', response.count);
      return response;
    } catch (error) {
      console.error('❌ Error fetching hospitalities:', error);
      throw error;
    }
  }

  /**
   * Get a single hospitality service by ID
   */
  async getHospitalityById(id: number): Promise<HospitalityResponse> {
    try {
      console.log('📋 Fetching hospitality by ID:', id);

      const response = await apiClient.get<HospitalityResponse>(`${this.baseUrl}/${id}`);

      if (!response.success) {
        throw new Error('Failed to fetch hospitality');
      }

      console.log('✅ Fetched hospitality:', response.data.name);
      return response;
    } catch (error) {
      console.error('❌ Error fetching hospitality:', error);
      throw error;
    }
  }

  /**
   * Create a new hospitality service
   */
  async createHospitality(data: HospitalityInput): Promise<HospitalityResponse> {
    try {
      console.log('➕ Creating hospitality:', data.name);

      const response = await apiClient.post<HospitalityResponse>(this.baseUrl, data);

      if (!response.success) {
        throw new Error('Failed to create hospitality');
      }

      console.log('✅ Created hospitality:', response.data.id);
      return response;
    } catch (error) {
      console.error('❌ Error creating hospitality:', error);
      throw error;
    }
  }

  /**
   * Update an existing hospitality service
   */
  async updateHospitality(id: number, data: Partial<HospitalityInput>): Promise<HospitalityResponse> {
    try {
      console.log('✏️ Updating hospitality:', id);

      const response = await apiClient.put<HospitalityResponse>(`${this.baseUrl}/${id}`, data);

      if (!response.success) {
        throw new Error('Failed to update hospitality');
      }

      console.log('✅ Updated hospitality:', response.data.name);
      return response;
    } catch (error) {
      console.error('❌ Error updating hospitality:', error);
      throw error;
    }
  }

  /**
   * Delete a hospitality service
   */
  async deleteHospitality(id: number): Promise<DeleteResponse> {
    try {
      console.log('🗑️ Deleting hospitality:', id);

      const response = await apiClient.delete<DeleteResponse>(`${this.baseUrl}/${id}`);

      if (!response.success) {
        throw new Error('Failed to delete hospitality');
      }

      console.log('✅ Deleted hospitality:', id);
      return response;
    } catch (error) {
      console.error('❌ Error deleting hospitality:', error);
      throw error;
    }
  }

  /**
   * Get hospitality statistics
   */
  async getStats(): Promise<StatsResponse> {
    try {
      console.log('📊 Fetching hospitality stats');

      const response = await apiClient.get<StatsResponse>(`${this.baseUrl}/stats`);

      if (!response.success) {
        throw new Error('Failed to fetch hospitality stats');
      }

      console.log('✅ Fetched hospitality stats');
      return response;
    } catch (error) {
      console.error('❌ Error fetching hospitality stats:', error);
      throw error;
    }
  }

  // ==========================================================================
  // Ticket-Hospitality Assignment Operations
  // ==========================================================================

  /**
   * Get hospitalities assigned to tickets in an event
   */
  async getEventHospitalities(eventId: string): Promise<TicketHospitalitiesResponse> {
    try {
      console.log('📋 Fetching event hospitalities for event:', eventId);

      const response = await apiClient.get<TicketHospitalitiesResponse>(
        `${this.baseUrl}/event/${eventId}`
      );

      if (!response.success) {
        throw new Error('Failed to fetch event hospitalities');
      }

      console.log('✅ Fetched event hospitalities:', response.count);
      return response;
    } catch (error) {
      console.error('❌ Error fetching event hospitalities:', error);
      throw error;
    }
  }

  /**
   * Get hospitalities assigned to a specific ticket
   */
  async getTicketHospitalities(eventId: string, ticketId: string): Promise<TicketHospitalitiesResponse> {
    try {
      console.log('📋 Fetching ticket hospitalities:', eventId, ticketId);

      const response = await apiClient.get<TicketHospitalitiesResponse>(
        `${this.baseUrl}/ticket/${eventId}/${ticketId}`
      );

      if (!response.success) {
        throw new Error('Failed to fetch ticket hospitalities');
      }

      console.log('✅ Fetched ticket hospitalities:', response.count);
      return response;
    } catch (error) {
      console.error('❌ Error fetching ticket hospitalities:', error);
      throw error;
    }
  }

  /**
   * Assign hospitalities to a specific ticket
   */
  async assignTicketHospitalities(
    eventId: string,
    ticketId: string,
    hospitalityIds: number[]
  ): Promise<AssignmentResponse> {
    try {
      console.log('🔗 Assigning hospitalities to ticket:', ticketId);
      console.log('📊 Hospitality IDs:', hospitalityIds);

      const response = await apiClient.post<AssignmentResponse>(
        `${this.baseUrl}/ticket/${eventId}/${ticketId}`,
        { hospitality_ids: hospitalityIds }
      );

      if (!response.success) {
        throw new Error('Failed to assign hospitalities');
      }

      console.log('✅ Assigned hospitalities:', response.data.message);
      return response;
    } catch (error) {
      console.error('❌ Error assigning hospitalities:', error);
      throw error;
    }
  }

  /**
   * Batch assign hospitalities to multiple tickets in an event
   */
  async batchAssignHospitalities(request: BatchAssignRequest): Promise<AssignmentResponse> {
    try {
      console.log('🔨 Batch assigning hospitalities for event:', request.event_id);
      console.log('📊 Tickets count:', Object.keys(request.tickets).length);

      const response = await apiClient.post<AssignmentResponse>(
        `${this.baseUrl}/batch`,
        request
      );

      if (!response.success) {
        throw new Error('Failed to batch assign hospitalities');
      }

      console.log('✅ Batch assignment successful:', response.data.message);
      return response;
    } catch (error) {
      console.error('❌ Error batch assigning hospitalities:', error);
      throw error;
    }
  }

  /**
   * Remove all hospitalities from a ticket
   */
  async removeTicketHospitalities(eventId: string, ticketId: string): Promise<DeleteResponse> {
    try {
      console.log('🗑️ Removing hospitalities from ticket:', ticketId);

      const response = await apiClient.delete<DeleteResponse>(
        `${this.baseUrl}/ticket/${eventId}/${ticketId}`
      );

      if (!response.success) {
        throw new Error('Failed to remove ticket hospitalities');
      }

      console.log('✅ Removed ticket hospitalities:', response.deleted_count);
      return response;
    } catch (error) {
      console.error('❌ Error removing ticket hospitalities:', error);
      throw error;
    }
  }

  /**
   * Remove all hospitalities from an event
   */
  async removeEventHospitalities(eventId: string): Promise<DeleteResponse> {
    try {
      console.log('🗑️ Removing hospitalities from event:', eventId);

      const response = await apiClient.delete<DeleteResponse>(
        `${this.baseUrl}/event/${eventId}`
      );

      if (!response.success) {
        throw new Error('Failed to remove event hospitalities');
      }

      console.log('✅ Removed event hospitalities:', response.deleted_count);
      return response;
    } catch (error) {
      console.error('❌ Error removing event hospitalities:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const hospitalityService = new HospitalityService();
