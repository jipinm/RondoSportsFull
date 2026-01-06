/**
 * XS2Event API Client
 * 
 * This module provides a centralized API client for XS2Event REST+JSON API.
 * Handles authentication, error handling, and request/response processing.
 */

// API Configuration from environment variables
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://testapi.xs2event.com',
  apiKey: import.meta.env.VITE_XS2EVENT_API_KEY,
};

// API Error Types
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

// Request Options Interface
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
}

/**
 * XS2Event API Client Class
 * Provides authenticated HTTP client with error handling
 */
export class XS2EventAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.baseUrl = baseUrl || API_CONFIG.baseUrl;
    this.apiKey = apiKey || API_CONFIG.apiKey;

    // 🔍 LOG API CONFIGURATION

    if (!this.apiKey) {
      throw new Error('XS2Event API key is required. Please check your environment configuration.');
    }

    if (!this.baseUrl) {
      throw new Error('XS2Event base URL is required. Please check your environment configuration.');
    }
  }

  /**
   * Make authenticated API request
   * @param endpoint - API endpoint (without base URL)
   * @param options - Request options
   * @returns Promise with API response
   */
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params = {}
    } = options;

    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    // 🔍 LOG EVERY API REQUEST
    if (params && Object.keys(params).length > 0) {
    }

    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'X-Api-Key': this.apiKey,
      ...headers,
    };

    // Add Content-Type for POST/PUT/PATCH requests with body
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    try {
      // Log the request details for debugging
      if (method === 'POST' && endpoint.includes('bookings')) {
      }

      const response = await fetch(url.toString(), {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Log the response details for debugging
      if (method === 'POST' && endpoint.includes('bookings')) {
        
        // Clone response to read text without consuming it
        const responseClone = response.clone();
        try {
          await responseClone.text();
        } catch (textError) {
        }
      }

      // Handle different response status codes
      if (!response.ok) {
        // Clone the response to avoid consuming the body stream
        const errorResponse = response.clone();
        await this.handleErrorResponse(errorResponse);
      }

      // Parse JSON response
      let data;
      try {
        // First, let's check what we're actually getting
        const responseText = await response.text();
        
        // Try to parse as JSON
        data = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error(`Invalid JSON response from API`);
      }

      return {
        data,
        status: response.status,
        message: response.statusText,
      };

    } catch (error) {
      // Handle network errors or other exceptions
      if (error instanceof Error && error.name === 'ApiError') {
        throw error; // Re-throw API errors
      }

      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle API error responses
   * @param response - Fetch Response object
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = response.statusText;
    let errorDetails: any = null;

    try {
      const errorData = await response.json();
      
      // Check for XS2Event out-of-stock error format
      if (errorData.items && Array.isArray(errorData.items) && errorData.items.length > 0) {
        const item = errorData.items[0];
        if (item.error && item.error.detail) {
          // Extract the specific error message like "We do not have enough tickets in stock"
          errorMessage = item.error.detail;
          if (item.error.available !== undefined) {
            errorMessage += ` (Available: ${item.error.available}, Requested: ${item.error.quantity || item.quantity})`;
          }
        }
      } else {
        errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
      }
      
      errorDetails = errorData;
      
      // Special logging for 500 errors on booking endpoint
      if (response.status === 500 && response.url.includes('bookings')) {
      }
    } catch (jsonError) {
      // If JSON parsing fails, use status text
      if (response.status === 500) {
      }
    }

    const apiError: ApiError = {
      status: response.status,
      message: this.getErrorMessage(response.status, errorMessage),
      details: errorDetails,
    };

    // Create a custom error that can be caught and handled
    const error = new Error(apiError.message) as Error & { apiError: ApiError };
    error.name = 'ApiError';
    error.apiError = apiError;

    throw error;
  }

  /**
   * Get user-friendly error messages based on status codes
   * @param status - HTTP status code
   * @param originalMessage - Original error message
   * @returns User-friendly error message
   */
  private getErrorMessage(status: number, originalMessage: string): string {
    // Check for specific out-of-stock error
    if (status === 422 && originalMessage.toLowerCase().includes('not enough tickets')) {
      return originalMessage; // Use the specific stock error message
    }
    
    switch (status) {
      case 400:
        return 'Bad request. Please check your input data.';
      case 401:
        return 'Authentication failed. Please check your API key.';
      case 403:
        return 'Access forbidden. You do not have permission for this resource.';
      case 404:
        return 'Resource not found. The requested item may no longer be available.';
      case 422:
        return originalMessage || 'Invalid data provided. Please check your request parameters.';
      case 429:
        return 'Too many requests. Please wait a moment before trying again.';
      case 500:
        return 'Internal server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Rate limit may have been exceeded.';
      default:
        return originalMessage || `Request failed with status ${status}`;
    }
  }

  // Convenience methods for common HTTP verbs
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T = any>(endpoint: string, body?: any, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, params });
  }

  async put<T = any>(endpoint: string, body?: any, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, params });
  }

  async patch<T = any>(endpoint: string, body?: any, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body, params });
  }

  async delete<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', params });
  }
}

// Create default API client instance
export const apiClient = new XS2EventAPI();

// API Endpoints Constants
export const API_ENDPOINTS = {
  // Sports & Tournaments
  SPORTS: '/v1/sports',
  TOURNAMENTS: '/v1/tournaments',
  TEAMS: '/v1/teams',
  TEAM_DETAILS: (teamId: string) => `/v1/teams/${teamId}`,
  TEAM_CREDENTIALS: (tournamentId: string, teamId: string) => `/v1/team-credentials/tournament/${tournamentId}/team/${teamId}`,
  
  // Events & Venues
  EVENTS: '/v1/events',
  EVENT_DETAILS: (eventId: string) => `/v1/events/${eventId}`,
  VENUES: '/v1/venues',
  
  // Tickets & Categories
  CATEGORIES: '/v1/categories',
  TICKETS: '/v1/tickets',
  
  // Reservations & Bookings
  RESERVATIONS: '/v1/reservations',
  BOOKINGS: '/v1/bookings',
  BOOKING_BY_ID: (bookingId: string) => `/v1/bookings/${bookingId}`,
  BOOKINGS_BY_RESERVATION: (reservationId: string) => `/v1/bookings/reservation/${reservationId}`,
  GUEST_DATA: (ticketId: string) => `/v1/tickets/${ticketId}/guestdata`,
  EVENT_GUEST_REQUIREMENTS: (eventId: string) => `/v1/events/${eventId}/guestdata`,
  
  // Booking Orders
  BOOKING_ORDERS_LIST: '/v1/bookingorders/list',
  BOOKING_ORDER_BY_ID: (bookingOrderId: string) => `/v1/bookingorders/${bookingOrderId}`,
  BOOKING_ORDER_GUEST_DATA: (bookingOrderId: string) => `/v1/bookingorders/${bookingOrderId}/guestdata`,
  BOOKING_ORDER_SINGLE_GUEST: (bookingOrderId: string, guestId: string) => 
    `/v1/bookingorders/${bookingOrderId}/guestdata/${guestId}`,
  
  // E-tickets
  ETICKETS_LIST: '/v1/etickets',
  ETICKET_ZIP_URL: (bookingOrderId: string) => `/v1/etickets/download/zip/${bookingOrderId}`,
  ETICKET_DOWNLOAD: (bookingOrderId: string, orderItemId: string, url: string) => 
    `/v1/etickets/download/${bookingOrderId}/${orderItemId}/url/${url}`,
} as const;

// Type definitions for API responses
export interface Sport {
  sport_id: string;
  name?: string;
  description?: string;
  icon?: string;
  event_count?: number;
  country_count?: number;
}

export interface Tournament {
  tournament_id: string;
  sport_type: string;
  official_name: string;
  season?: string;
  tournament_type?: 'league' | 'cup';
  region?: string;
  number_events?: number;
  date_start?: string;
  date_stop?: string;
  created?: string;
  updated?: string;
  slug?: string;
  // Deprecated fields for backwards compatibility
  name?: string;
  event_count?: number;
  status?: string;
}

export interface Team {
  team_id: string;
  official_name: string;
  popular_team: boolean;
  sport_type: string;
  slug: string;
  iso_country: string;
  wikipedia_slug?: string;
  wikipedia_snippet?: string | null;
  venue_id?: string | null;
  team_slug: string;
  logo_filename: string;
}

export interface TeamCredentials {
  id: number;
  tournament_id: string;
  team_id: string;
  team_name: string;
  tournament_name: string;
  short_description?: string | null;
  logo_filename?: string | null;
  banner_filename?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  event_id: string;
  event_name: string;
  date_start: string;
  date_stop: string;
  event_status: string;
  tournament_id: string;
  tournament_name: string;
  venue_id: string;
  venue_name: string;
  location_id: string;
  city: string;
  iso_country: string;
  latitude: string;
  longitude: string;
  sport_type: string;
  season: string;
  tournament_type: string;
  date_confirmed: boolean;
  date_start_main_event?: string | null;
  date_stop_main_event?: string | null;
  hometeam_id: string;
  hometeam_name: string;
  visiting_id: string;
  visiting_name: string;
  created: string;
  updated: string;
  event_description?: string | null;
  min_ticket_price_eur: number | null;
  max_ticket_price_eur: number | null;
  slug: string;
  number_of_tickets: number | null;
  sales_periods: any[];
  is_popular: boolean;
}

export interface Venue {
  venue_id: string;
  name: string;
  city: string;
  country: string;
  capacity?: number;
  gps_lat?: number;
  gps_lng?: number;
  address?: string;
  facilities?: string[];
}

export interface Category {
  category_name: string;
  category_id: string;
  venue_id: string;
  sport_type: string;
  venue_name: string;
  created: string;
  on_svg: boolean;
  description: {
    [languageCode: string]: string | null;
  };
  options: {
    videowall: boolean;
    covered_seat: boolean;
    numbered_seat: boolean;
  };
  category_type: string;
  ticket_delivery_days: number;
  party_size_together: number;
  distribution_channel: string;
  highlight_type: string | null;
  files: any[];
  sports_enabled: string[];
  sports_disabled: string[];
}

export interface Ticket {
  ticket_id: string;
  event_id: string;
  category_id: string;
  category_name: string;
  ticket_title: string;
  ticket_targetgroup: string;
  sub_category: string;
  ticket_validity: string;
  ticket_status: 'available' | 'sold_out' | 'unavailable' | 'disabled';
  type_ticket: string;
  category_type?: string | null;
  category_information_available: boolean;
  net_rate: number;
  face_value: number;
  description_supplier: string;
  information_shipping: string;
  currency_code: string;
  ticket_validuntil: string;
  ticket_validfrom: string;
  min_order: number;
  stock: number;
  supplier_id: string;
  external_ticket_id: string;
  created: string;
  updated: string;
  supplier_terms: string;
  supplier_role: string;
  eventdays: string;
  is_xs2event_supplier: boolean;
  options: {
    pairs_only: boolean;
    videowall: boolean;
    covered_seat: boolean;
    numbered_seat: boolean;
    customer_details_required: string;
  };
  sales_periods: any[];
  local_rates: {
    face_value_eur: number;
  };
  vat_category: string;
  flags: any[];
}

export interface Guest {
  first_name: string;
  last_name: string;
  contact_email: string;
  date_of_birth: string;
  gender?: 'male' | 'female' | 'other';
  country_of_residence?: string;
  lead_guest: boolean;
}

export interface GuestRequirement {
  field: string;
  required: boolean;
  condition?: 'pre_checkout' | 'pre_download';
  scope?: 'lead_guest' | 'all_persons';
  type?: 'string' | 'email' | 'date' | 'enum';
  validation?: {
    format?: string;
    options?: string[];
  };
}

export interface EventGuestRequirements {
  event_id: string;
  requirements: GuestRequirement[];
  estimated_per_ticket_fields?: number;
  estimated_total_fields?: number;
}

export interface EventGuestRequirementsApiResponse {
  guest_data_requirements: string[];
}

export interface Reservation {
  client_id: string;
  reservation_id: string;
  status: string;
  notify_client: boolean;
  notes: string | null;
  valid_until: string;
  created: string;
  updated: string;
  parent_allocation_id: string | null;
  items: Array<{
    ticket_id: string;
    quantity: number;
  }>;
  // Optional fields that might be included in responses
  tickets?: Array<{
    ticket_id: string;
    quantity: number;
  }>;
  guests?: Guest[];
  total_price?: number; // in cents
  expires_at?: string;
}

export interface Booking {
  booking_id: string;
  reservation_id: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  total_price: number; // in cents
  payment_status: string;
  confirmation_code: string;
}

// API Response wrapper types
export interface SportsResponse {
  sports: Sport[];
}

export interface TournamentsResponse {
  tournaments: Tournament[];
}

export interface TeamsResponse {
  teams: Team[];
  pagination: {
    total_size: number;
    page_size: number;
    page_number: number;
    next_page?: string;
    previous_page?: string;
  };
}

export interface EventsResponse {
  events: Event[];
  pagination: {
    total_size: number;
    page_size: number;
    next_page?: string;
    previous_page?: string;
  };
}

export interface VenuesResponse {
  venues: Venue[];
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface TicketsResponse {
  tickets: Ticket[];
}

// Utility functions for common operations
export const ApiUtils = {
  /**
   * Convert price from cents to display format
   * @param priceInCents - Price in integer cents
   * @returns Formatted price string
   */
  formatPrice(priceInCents: number): string {
    return `€${(priceInCents / 100).toFixed(2)}`;
  },

  /**
   * Convert price from display format to cents
   * @param priceString - Price as string (e.g., "50.00")
   * @returns Price in integer cents
   */
  priceTocents(priceString: string): number {
    return Math.round(parseFloat(priceString) * 100);
  },

  /**
   * Format date for API queries
   * @param date - Date object or ISO string
   * @returns Formatted date string (YYYY-MM-DD)
   */
  formatDateForApi(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  },

  /**
   * Get current date for filtering future events
   * @returns Current date in API format
   */
  getCurrentDateForFilter(): string {
    return this.formatDateForApi(new Date());
  },

  /**
   * Group tickets by event, category and sub_category
   * @param tickets - Array of tickets
   * @returns Grouped tickets
   */
  groupTickets(tickets: Ticket[]): Record<string, Ticket[]> {
    return tickets.reduce((groups, ticket) => {
      const key = `${ticket.event_id}_${ticket.category_id}_${ticket.sub_category}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ticket);
      return groups;
    }, {} as Record<string, Ticket[]>);
  },
};

export default apiClient;
