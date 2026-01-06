import { useState, useEffect } from 'react';
import { apiClient, type Event, API_ENDPOINTS } from '../services/apiRoutes';

interface UseEventDetailsResult {
  event: Event | null;
  loading: boolean;
  error: string | null;
}

export const useEventDetails = (eventId: string | undefined): UseEventDetailsResult => {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await apiClient.request<Event>(API_ENDPOINTS.EVENT_DETAILS(eventId));
        setEvent(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch event details');
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  return {
    event,
    loading,
    error,
  };
};
