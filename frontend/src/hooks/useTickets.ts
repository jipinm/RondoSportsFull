import { useState, useEffect } from 'react';
import { apiClient, type Ticket, type TicketsResponse, API_ENDPOINTS } from '../services/apiRoutes';

interface UseTicketsParams {
  event_id?: string;
}

interface UseTicketsResult {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
}

export const useTickets = (params: UseTicketsParams): UseTicketsResult => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!params.event_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const queryParams = new URLSearchParams();
        if (params.event_id) queryParams.set('event_id', params.event_id);

        const endpoint = `${API_ENDPOINTS.TICKETS}?${queryParams.toString()}`;
        const response = await apiClient.request<TicketsResponse>(endpoint);
        
        setTickets(response.data.tickets || []);
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to fetch tickets';
        setError(errorMessage);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [params.event_id]);

  return {
    tickets,
    loading,
    error,
  };
};
