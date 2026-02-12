/**
 * Hospitality Service
 * 
 * Service for managing hospitality services and ticket-hospitality assignments
 */

const API_BASE_URL = import.meta.env.VITE_XS2EVENT_BASE_URL || 'http://localhost:8080';

export interface Hospitality {
  id: number;
  name: string;
  description: string | null;
  price_usd: number;
  is_active: boolean;
  sort_order: number;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface TicketHospitality {
  id: number;
  event_id: string;
  ticket_id: string;
  hospitality_id: number;
  custom_price_usd: number | null;
  created_by: number | null;
  created_at: string;
  // Joined data
  hospitality_name?: string;
  hospitality_description?: string | null;
  hospitality_price_usd?: number;
  hospitality_is_active?: boolean;
}

export interface HospitalityStats {
  total_services: number;
  active_services: number;
  inactive_services: number;
  total_assignments: number;
}

/**
 * Get authorization headers
 */
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('adminToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Get all hospitality services
 */
export const getAllHospitalities = async (activeOnly: boolean = false): Promise<Hospitality[]> => {
  const params = activeOnly ? '?active=true' : '';
  
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities${params}`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch hospitalities');
  }
  
  const data = await response.json();
  return data.data;
};

/**
 * Get a single hospitality service by ID
 */
export const getHospitalityById = async (id: number): Promise<Hospitality> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities/${id}`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch hospitality');
  }
  
  const data = await response.json();
  return data.data;
};

/**
 * Create a new hospitality service
 */
export const createHospitality = async (data: {
  name: string;
  description?: string;
  price_usd: number;
  is_active?: boolean;
  sort_order?: number;
}): Promise<Hospitality> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create hospitality');
  }
  
  const result = await response.json();
  return result.data;
};

/**
 * Update an existing hospitality service
 */
export const updateHospitality = async (id: number, data: {
  name?: string;
  description?: string;
  price_usd?: number;
  is_active?: boolean;
  sort_order?: number;
}): Promise<Hospitality> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update hospitality');
  }
  
  const result = await response.json();
  return result.data;
};

/**
 * Delete a hospitality service
 */
export const deleteHospitality = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete hospitality');
  }
};

/**
 * Get hospitality statistics
 */
export const getHospitalityStats = async (): Promise<HospitalityStats> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities/stats`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch hospitality stats');
  }
  
  const data = await response.json();
  return data.data;
};

/**
 * Get hospitalities assigned to a specific ticket
 */
export const getTicketHospitalities = async (eventId: string, ticketId: string): Promise<TicketHospitality[]> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities/ticket/${eventId}/${ticketId}`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch ticket hospitalities');
  }
  
  const data = await response.json();
  return data.data;
};

/**
 * Get all hospitality assignments for an event
 */
export const getEventHospitalities = async (eventId: string): Promise<{
  data: TicketHospitality[];
  grouped_by_ticket: Record<string, TicketHospitality[]>;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities/event/${eventId}`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch event hospitalities');
  }
  
  const data = await response.json();
  return {
    data: data.data,
    grouped_by_ticket: data.grouped_by_ticket
  };
};

/**
 * Assign hospitalities to a ticket
 */
export const assignTicketHospitalities = async (
  eventId: string, 
  ticketId: string, 
  hospitalityIds: number[]
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities/ticket/${eventId}/${ticketId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ hospitality_ids: hospitalityIds })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to assign hospitalities');
  }
  
  const data = await response.json();
  return data.data;
};

/**
 * Batch assign hospitalities to multiple tickets in an event
 */
export const batchAssignHospitalities = async (
  eventId: string,
  tickets: Record<string, number[]>
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities/batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      event_id: eventId,
      tickets
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to batch assign hospitalities');
  }
  
  const data = await response.json();
  return data.data;
};

/**
 * Remove all hospitalities from a ticket
 */
export const removeTicketHospitalities = async (eventId: string, ticketId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities/ticket/${eventId}/${ticketId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove ticket hospitalities');
  }
};

/**
 * Remove all hospitalities from an event
 */
export const removeEventHospitalities = async (eventId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/hospitalities/event/${eventId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove event hospitalities');
  }
};

// ============================================================================
// PUBLIC API FUNCTIONS (No authentication required)
// ============================================================================

/**
 * Resolved hospitality item returned by the hierarchical public API.
 * No pricing fields — hospitality is now inclusive with the ticket.
 */
export interface ResolvedHospitality {
  hospitality_id: number;
  hospitality_name: string;
  hospitality_description: string | null;
  level: 'sport' | 'tournament' | 'team' | 'event' | 'ticket';
  source: 'hospitality_assignments' | 'legacy';
}

/**
 * Get hierarchically resolved hospitality services for all tickets in an event.
 * Uses the 5-level hierarchy: sport > tournament > team > event > ticket.
 * Returns a map of ticket_id → resolved hospitality list (no pricing).
 *
 * @param eventId - The event ID
 * @param sportType - Sport type for hierarchical context
 * @param ticketIds - Comma-separated ticket IDs
 * @param tournamentId - Optional tournament ID
 * @param teamId - Optional team (home team) ID
 */
export const getResolvedEventHospitalities = async (
  eventId: string,
  sportType: string,
  ticketIds: string[],
  tournamentId?: string | null,
  teamId?: string | null
): Promise<Record<string, ResolvedHospitality[]>> => {
  const params = new URLSearchParams();
  if (sportType) params.append('sport_type', sportType);
  if (tournamentId) params.append('tournament_id', tournamentId);
  if (teamId) params.append('team_id', teamId);
  if (ticketIds.length > 0) params.append('ticket_ids', ticketIds.join(','));

  const url = `${API_BASE_URL}/v1/events/${eventId}/effective-hospitalities?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch resolved event hospitalities');
  }

  const data = await response.json();
  return data.data?.hospitalities || {};
};
