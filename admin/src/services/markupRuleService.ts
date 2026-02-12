/**
 * Markup Rules API Service
 * Handles all hierarchical markup rule operations for the admin panel
 * 
 * Supports markup at 5 levels (most-specific wins):
 *   ticket > event > team > tournament > sport
 */

import { apiClient } from './api-client';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type MarkupType = 'fixed' | 'percentage';
export type MarkupLevel = 'sport' | 'tournament' | 'team' | 'event' | 'ticket';

export interface MarkupRule {
  id: number;
  sport_type: string | null;
  tournament_id: string | null;
  team_id: string | null;
  event_id: string | null;
  ticket_id: string | null;
  markup_type: MarkupType;
  markup_amount: number;
  sport_name: string | null;
  tournament_name: string | null;
  team_name: string | null;
  event_name: string | null;
  ticket_name: string | null;
  level: MarkupLevel;
  is_active: boolean | number;
  created_by: number | null;
  updated_by: number | null;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface MarkupRuleInput {
  sport_type: string;
  tournament_id?: string | null;
  team_id?: string | null;
  event_id?: string | null;
  ticket_id?: string | null;
  markup_type: MarkupType;
  markup_amount: number;
  sport_name?: string | null;
  tournament_name?: string | null;
  team_name?: string | null;
  event_name?: string | null;
  ticket_name?: string | null;
  is_active?: boolean | number;
}

export interface MarkupRuleUpdateInput {
  markup_type: MarkupType;
  markup_amount: number;
  is_active?: boolean | number;
}

export interface ResolveMarkupInput {
  sport_type: string;
  tournament_id?: string | null;
  team_id?: string | null;
  event_id: string;
  ticket_id: string;
}

export interface ResolvedMarkup {
  level: MarkupLevel;
  source: 'legacy' | 'markup_rules';
  markup_type: MarkupType;
  markup_amount: number;
  markup_price_usd?: number;
  markup_percentage?: number | null;
  base_price_usd?: number;
  final_price_usd?: number;
  rule_id?: number;
  sport_name?: string | null;
  tournament_name?: string | null;
  team_name?: string | null;
  event_name?: string | null;
  ticket_name?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_more: boolean;
  };
}

// ============================================================================
// Markup Rules Service
// ============================================================================

export class MarkupRuleService {
  private baseUrl = '/admin/markup-rules';

  /**
   * Create or update a markup rule
   */
  async createOrUpdateRule(data: MarkupRuleInput): Promise<MarkupRule> {
    try {
      const response = await apiClient.post<ApiResponse<MarkupRule>>(
        this.baseUrl,
        data
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create/update markup rule');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error creating/updating markup rule:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get all markup rules with optional filters
   */
  async getAllRules(filters: {
    level?: MarkupLevel;
    sport_type?: string;
    tournament_id?: string;
    team_id?: string;
    event_id?: string;
    is_active?: boolean;
    page?: number;
    per_page?: number;
  } = {}): Promise<ApiResponse<MarkupRule[]>> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const queryString = params.toString();
      const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

      const response = await apiClient.get<ApiResponse<MarkupRule[]>>(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch markup rules');
      }

      return response;
    } catch (error: any) {
      console.error('Error fetching markup rules:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get a markup rule by ID
   */
  async getRuleById(id: number): Promise<MarkupRule> {
    try {
      const response = await apiClient.get<ApiResponse<MarkupRule>>(
        `${this.baseUrl}/${id}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch markup rule');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching markup rule:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update a markup rule
   */
  async updateRule(id: number, data: MarkupRuleUpdateInput): Promise<MarkupRule> {
    try {
      const response = await apiClient.put<ApiResponse<MarkupRule>>(
        `${this.baseUrl}/${id}`,
        data
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update markup rule');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error updating markup rule:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a markup rule
   */
  async deleteRule(id: number): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<null>>(
        `${this.baseUrl}/${id}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete markup rule');
      }
    } catch (error: any) {
      console.error('Error deleting markup rule:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get rules by sport type
   */
  async getRulesBySport(sportType: string): Promise<MarkupRule[]> {
    try {
      const response = await apiClient.get<ApiResponse<MarkupRule[]>>(
        `${this.baseUrl}/sport/${sportType}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sport rules');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching sport rules:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Resolve effective markup for a ticket (preview/testing)
   */
  async resolveMarkup(data: ResolveMarkupInput): Promise<ResolvedMarkup | null> {
    try {
      const response = await apiClient.post<ApiResponse<ResolvedMarkup | null>>(
        `${this.baseUrl}/resolve`,
        data
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to resolve markup');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error resolving markup:', error);
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
export const markupRuleService = new MarkupRuleService();
