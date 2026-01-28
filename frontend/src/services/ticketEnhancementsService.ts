/**
 * Ticket Enhancements Service
 * Handles API calls for markup pricing and hospitality services
 */

import { apiClient } from './apiRoutes';

// ============================================================================
// Type Definitions
// ============================================================================

// Markup type: fixed (USD amount) or percentage (% of base price)
export type MarkupType = 'fixed' | 'percentage';

export interface TicketMarkup {
  id?: number;
  ticket_id: string;
  event_id: string;
  markup_price_usd: number;
  markup_type: MarkupType;
  markup_percentage: number | null;
  base_price_usd: number;
  final_price_usd: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface HospitalityService {
  id: number;
  name: string;
  description: string | null;
  price_usd: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number | null;
  created_by_name?: string;
  updated_by_name?: string;
}

export interface TicketHospitality {
  id: number;
  hospitality_id: number;
  event_id: string;
  ticket_id: string;
  created_at: string;
  created_by: number;
  // Joined data
  hospitality_name?: string;
  hospitality_description?: string | null;
  hospitality_price_usd?: number;
  hospitality_is_active?: boolean;
}

export interface EventHospitalitiesResponse {
  event_id: string;
  hospitalities: TicketHospitality[];
  grouped_by_ticket: {
    [ticketId: string]: TicketHospitality[];
  };
}

// ============================================================================
// API Response Types
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ============================================================================
// Ticket Markup Pricing Functions
// ============================================================================

/**
 * Get markup pricing for all tickets in an event
 * @param eventId - XS2Event Event ID
 * @returns Promise with array of ticket markups
 */
export const getEventMarkups = async (eventId: string): Promise<TicketMarkup[]> => {
  try {
    const response = await apiClient.request<ApiResponse<{ event_id: string; markups: TicketMarkup[] }>>(
      `/v1/events/${eventId}/markups`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch event markups');
    }

    return response.data.data.markups;
  } catch (error: any) {
    console.error('Failed to get event markups:', error);
    // Return empty array if no markups exist (not an error)
    if (error.response?.status === 404 || error.message?.includes('not found')) {
      return [];
    }
    throw error;
  }
};

/**
 * Get markup pricing for a specific ticket
 * @param ticketId - XS2Event Ticket ID
 * @returns Promise with ticket markup or null if no markup exists
 */
export const getTicketMarkup = async (ticketId: string): Promise<TicketMarkup | null> => {
  try {
    const response = await apiClient.request<ApiResponse<TicketMarkup | null>>(
      `/v1/tickets/${ticketId}/markup`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch ticket markup');
    }

    return response.data.data;
  } catch (error: any) {
    console.error('Failed to get ticket markup:', error);
    // Return null if no markup exists (not an error)
    if (error.response?.status === 404 || error.message?.includes('not found')) {
      return null;
    }
    throw error;
  }
};

/**
 * Calculate markup amount based on markup type and live exchange rate
 * @param basePriceUsd - Base price already converted to USD (using live exchange rate)
 * @param markup - Markup data from API
 * @returns The markup amount in USD
 */
export const calculateMarkupAmount = (basePriceUsd: number, markup: TicketMarkup | null): number => {
  if (!markup) {
    return 0;
  }
  
  // For percentage-based markup, calculate from the live USD base price
  if (markup.markup_type === 'percentage' && markup.markup_percentage !== null) {
    return basePriceUsd * (markup.markup_percentage / 100);
  }
  
  // For fixed markup, use the stored markup amount
  return parseFloat(String(markup.markup_price_usd)) || 0;
};

/**
 * Apply markup pricing to a base price (legacy function for backward compatibility)
 * @param basePrice - Original ticket price in USD
 * @param markup - Markup data
 * @returns Final price with markup applied
 */
export const applyMarkupToPrice = (basePrice: number, markup: TicketMarkup | null): number => {
  if (!markup) {
    return basePrice;
  }
  
  const markupAmount = calculateMarkupAmount(basePrice, markup);
  return basePrice + markupAmount;
};

// ============================================================================
// Hospitality Services Functions
// ============================================================================

/**
 * Get all active hospitality services
 * @returns Promise with array of active hospitality services
 */
export const getActiveHospitalities = async (): Promise<HospitalityService[]> => {
  try {
    const response = await apiClient.request<ApiResponse<HospitalityService[]>>(
      '/v1/hospitalities'
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch hospitality services');
    }

    return response.data.data;
  } catch (error: any) {
    console.error('Failed to get active hospitalities:', error);
    return [];
  }
};

/**
 * Get hospitality services for all tickets in an event
 * @param eventId - XS2Event Event ID
 * @returns Promise with event hospitalities response
 */
export const getEventHospitalities = async (eventId: string): Promise<EventHospitalitiesResponse> => {
  try {
    const response = await apiClient.request<ApiResponse<EventHospitalitiesResponse>>(
      `/v1/events/${eventId}/hospitalities`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch event hospitalities');
    }

    return response.data.data;
  } catch (error: any) {
    console.error('Failed to get event hospitalities:', error);
    // Return empty response if no hospitalities exist
    if (error.response?.status === 404 || error.message?.includes('not found')) {
      return {
        event_id: eventId,
        hospitalities: [],
        grouped_by_ticket: {}
      };
    }
    throw error;
  }
};

/**
 * Get hospitality services for a specific ticket
 * @param eventId - XS2Event Event ID
 * @param ticketId - XS2Event Ticket ID
 * @returns Promise with array of ticket hospitalities
 */
export const getTicketHospitalities = async (
  eventId: string,
  ticketId: string
): Promise<TicketHospitality[]> => {
  try {
    const response = await apiClient.request<ApiResponse<{
      ticket_id: string;
      event_id: string;
      hospitalities: TicketHospitality[];
    }>>(
      `/v1/tickets/${ticketId}/hospitalities?event_id=${eventId}`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch ticket hospitalities');
    }

    return response.data.data.hospitalities;
  } catch (error: any) {
    console.error('Failed to get ticket hospitalities:', error);
    // Return empty array if no hospitalities exist
    if (error.response?.status === 404 || error.message?.includes('not found')) {
      return [];
    }
    throw error;
  }
};

/**
 * Calculate total hospitality price for selected services
 * @param hospitalityIds - Array of selected hospitality service IDs
 * @param allHospitalities - Array of all available hospitality services
 * @returns Total price in USD
 */
export const calculateHospitalityTotal = (
  hospitalityIds: number[],
  allHospitalities: HospitalityService[]
): number => {
  return hospitalityIds.reduce((total, id) => {
    const service = allHospitalities.find(h => h.id === id);
    return total + (service?.price_usd || 0);
  }, 0);
};

/**
 * Get hospitality services by IDs
 * @param hospitalityIds - Array of hospitality service IDs
 * @param allHospitalities - Array of all available hospitality services
 * @returns Array of hospitality services matching the IDs
 */
export const getHospitalitiesByIds = (
  hospitalityIds: number[],
  allHospitalities: HospitalityService[]
): HospitalityService[] => {
  return allHospitalities.filter(h => hospitalityIds.includes(h.id));
};

// ============================================================================
// Export default service object
// ============================================================================

export const ticketEnhancementsService = {
  // Markup Pricing
  getEventMarkups,
  getTicketMarkup,
  applyMarkupToPrice,
  
  // Hospitality Services
  getActiveHospitalities,
  getEventHospitalities,
  getTicketHospitalities,
  calculateHospitalityTotal,
  getHospitalitiesByIds,
};

export default ticketEnhancementsService;
