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

export interface PublicTicketHospitality {
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
}

/**
 * Get all hospitalities assigned to tickets in an event (PUBLIC API)
 */
export const getPublicEventHospitalities = async (eventId: string): Promise<PublicTicketHospitality[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/events/${eventId}/hospitalities`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch event hospitalities');
  }
  
  const data = await response.json();
  return data.data || [];
};

/**
 * Get hospitalities for a specific ticket (PUBLIC API)
 */
export const getPublicTicketHospitalities = async (eventId: string, ticketId: string): Promise<PublicTicketHospitality[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/tickets/${ticketId}/hospitalities?event_id=${eventId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch ticket hospitalities');
  }
  
  const data = await response.json();
  return data.data?.hospitalities || [];
};

/**
 * Get all active hospitality services (PUBLIC API)
 */
export const getPublicActiveHospitalities = async (): Promise<Hospitality[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/hospitalities`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch active hospitalities');
  }
  
  const data = await response.json();
  return data.data || [];
};
