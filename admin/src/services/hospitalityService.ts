/**
 * Hospitality API Service
 * Handles all hospitality services operations for the admin panel
 * 
 * Supports hierarchical assignment at 5 levels (additive, most-specific wins):
 *   ticket > event > team > tournament > sport
 */

import { apiClient } from './api-client';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AssignmentLevel = 'sport' | 'tournament' | 'team' | 'event' | 'ticket';

export interface Hospitality {
  id: number;
  name: string;
  description: string | null;
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
  is_active?: boolean;
  sort_order?: number;
}

/** Hierarchical assignment record */
export interface HospitalityAssignment {
  id: number;
  hospitality_id: number;
  sport_type: string | null;
  tournament_id: string | null;
  team_id: string | null;
  event_id: string | null;
  ticket_id: string | null;
  level: AssignmentLevel;
  sport_name: string | null;
  tournament_name: string | null;
  team_name: string | null;
  event_name: string | null;
  ticket_name: string | null;
  is_active: boolean | number;
  hospitality_name?: string;
  hospitality_description?: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

/** Scope for creating/querying assignments */
export interface HospitalityAssignmentScope {
  sport_type: string;
  tournament_id?: string | null;
  team_id?: string | null;
  event_id?: string | null;
  ticket_id?: string | null;
  sport_name?: string | null;
  tournament_name?: string | null;
  team_name?: string | null;
  event_name?: string | null;
  ticket_name?: string | null;
}

/** Input for creating a single assignment */
export interface HospitalityAssignmentInput extends HospitalityAssignmentScope {
  hospitality_id: number;
}

/** Input for batch/replace assignments */
export interface HospitalityBatchAssignmentInput extends HospitalityAssignmentScope {
  hospitality_ids: number[];
}

/** Resolved hospitality (from hierarchical resolution) */
export interface ResolvedHospitality {
  hospitality_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  level: AssignmentLevel;
  source: 'hierarchical' | 'legacy';
  assignment_id?: number;
}

/** Legacy ticket-hospitality assignment */
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
  legacy_assignments?: number;
  assignments_by_level?: Record<string, number>;
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

// ============================================================================
// API Response Types
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  count?: number;
  pagination?: {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_more: boolean;
  };
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
  private assignmentsUrl = '/admin/hospitality-assignments';

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
  // Hierarchical Assignment Operations (NEW)
  // ==========================================================================

  /**
   * Create or update a single hospitality assignment at a scope level
   */
  async createAssignment(data: HospitalityAssignmentInput): Promise<ApiResponse<HospitalityAssignment>> {
    try {
      console.log('🔗 Creating hospitality assignment:', data.hospitality_id, 'at scope');

      const response = await apiClient.post<ApiResponse<HospitalityAssignment>>(
        this.assignmentsUrl,
        data
      );

      if (!response.success) {
        throw new Error('Failed to create hospitality assignment');
      }

      console.log('✅ Created hospitality assignment');
      return response;
    } catch (error) {
      console.error('❌ Error creating hospitality assignment:', error);
      throw error;
    }
  }

  /**
   * Batch assign multiple hospitality services at a scope level
   */
  async batchCreateAssignments(data: HospitalityBatchAssignmentInput): Promise<ApiResponse<{ inserted_count: number; message: string }>> {
    try {
      console.log('🔨 Batch assigning hospitalities:', data.hospitality_ids.length);

      const response = await apiClient.post<ApiResponse<{ inserted_count: number; message: string }>>(
        `${this.assignmentsUrl}/batch`,
        data
      );

      if (!response.success) {
        throw new Error('Failed to batch assign hospitalities');
      }

      console.log('✅ Batch assignment successful');
      return response;
    } catch (error) {
      console.error('❌ Error batch assigning hospitalities:', error);
      throw error;
    }
  }

  /**
   * Replace all assignments at a scope level (delete existing + insert new)
   */
  async replaceAssignmentsAtScope(data: HospitalityBatchAssignmentInput): Promise<ApiResponse<{ deleted_count: number; inserted_count: number; message: string }>> {
    try {
      console.log('🔄 Replacing assignments at scope');

      const response = await apiClient.put<ApiResponse<{ deleted_count: number; inserted_count: number; message: string }>>(
        `${this.assignmentsUrl}/scope`,
        data
      );

      if (!response.success) {
        throw new Error('Failed to replace assignments');
      }

      console.log('✅ Replaced assignments:', response.data.message);
      return response;
    } catch (error) {
      console.error('❌ Error replacing assignments:', error);
      throw error;
    }
  }

  /**
   * Get assignments at a specific scope (exact match)
   */
  async getAssignmentsAtScope(scope: Partial<HospitalityAssignmentScope>): Promise<ApiResponse<HospitalityAssignment[]>> {
    try {
      const params = new URLSearchParams();
      Object.entries(scope).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const queryString = params.toString();
      const url = queryString ? `${this.assignmentsUrl}/scope?${queryString}` : `${this.assignmentsUrl}/scope`;

      const response = await apiClient.get<ApiResponse<HospitalityAssignment[]>>(url);

      if (!response.success) {
        throw new Error('Failed to fetch assignments at scope');
      }

      return response;
    } catch (error) {
      console.error('❌ Error fetching assignments at scope:', error);
      throw error;
    }
  }

  /**
   * Get all assignments with optional filters
   */
  async getAllAssignments(filters: {
    level?: AssignmentLevel;
    sport_type?: string;
    tournament_id?: string;
    team_id?: string;
    event_id?: string;
    hospitality_id?: number;
    is_active?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<HospitalityAssignment[]>> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const queryString = params.toString();
      const url = queryString ? `${this.assignmentsUrl}?${queryString}` : this.assignmentsUrl;

      const response = await apiClient.get<ApiResponse<HospitalityAssignment[]>>(url);

      if (!response.success) {
        throw new Error('Failed to fetch assignments');
      }

      return response;
    } catch (error) {
      console.error('❌ Error fetching assignments:', error);
      throw error;
    }
  }

  /**
   * Get a single assignment by ID
   */
  async getAssignmentById(id: number): Promise<ApiResponse<HospitalityAssignment>> {
    try {
      const response = await apiClient.get<ApiResponse<HospitalityAssignment>>(
        `${this.assignmentsUrl}/${id}`
      );

      if (!response.success) {
        throw new Error('Failed to fetch assignment');
      }

      return response;
    } catch (error) {
      console.error('❌ Error fetching assignment:', error);
      throw error;
    }
  }

  /**
   * Delete a specific assignment by ID
   */
  async deleteAssignment(id: number): Promise<ApiResponse<null>> {
    try {
      console.log('🗑️ Deleting assignment:', id);

      const response = await apiClient.delete<ApiResponse<null>>(
        `${this.assignmentsUrl}/${id}`
      );

      if (!response.success) {
        throw new Error('Failed to delete assignment');
      }

      console.log('✅ Deleted assignment:', id);
      return response;
    } catch (error) {
      console.error('❌ Error deleting assignment:', error);
      throw error;
    }
  }

  /**
   * Remove all assignments at a scope level
   */
  async removeAssignmentsAtScope(scope: Partial<HospitalityAssignmentScope>): Promise<DeleteResponse> {
    try {
      console.log('🗑️ Removing assignments at scope');

      const params = new URLSearchParams();
      Object.entries(scope).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const queryString = params.toString();
      const url = queryString ? `${this.assignmentsUrl}/scope?${queryString}` : `${this.assignmentsUrl}/scope`;

      const response = await apiClient.delete<DeleteResponse>(url);

      if (!response.success) {
        throw new Error('Failed to remove assignments at scope');
      }

      console.log('✅ Removed assignments at scope');
      return response;
    } catch (error) {
      console.error('❌ Error removing assignments at scope:', error);
      throw error;
    }
  }

  /**
   * Resolve effective hospitalities for a ticket (admin preview)
   */
  async resolveForTicket(data: {
    sport_type: string;
    tournament_id?: string | null;
    team_id?: string | null;
    event_id: string;
    ticket_id: string;
  }): Promise<ApiResponse<ResolvedHospitality[]>> {
    try {
      console.log('🔍 Resolving hospitalities for ticket:', data.ticket_id);

      const response = await apiClient.post<ApiResponse<ResolvedHospitality[]>>(
        `${this.assignmentsUrl}/resolve`,
        data
      );

      if (!response.success) {
        throw new Error('Failed to resolve hospitalities');
      }

      console.log('✅ Resolved hospitalities:', response.count || response.data?.length);
      return response;
    } catch (error) {
      console.error('❌ Error resolving hospitalities:', error);
      throw error;
    }
  }

  // ==========================================================================
  // Legacy Ticket-Hospitality Assignment Operations (Backward Compatible)
  // ==========================================================================

  /**
   * Get hospitalities assigned to tickets in an event (legacy)
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
   * Get hospitalities assigned to a specific ticket (legacy)
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
   * Assign hospitalities to a specific ticket (legacy)
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
   * Batch assign hospitalities to multiple tickets in an event (legacy)
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
   * Remove all hospitalities from a ticket (legacy)
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
   * Remove all hospitalities from an event (legacy)
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
