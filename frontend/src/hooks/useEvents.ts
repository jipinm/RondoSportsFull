import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import type { Event, EventsResponse } from '../services/apiRoutes';

interface EventsParams {
  sport_type?: string;
  tournament_id?: string;
  team_id?: string;
  date?: string;
}

export const useEvents = (params?: EventsParams) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Build API parameters with default pagination
        const apiParams: any = {
          sport_type: params?.sport_type,
          tournament_id: params?.tournament_id,
          team_id: params?.team_id,
          // Default pagination parameters
          page_size: 50,
          page: 1
        };

        // If date is provided, add both date_start and date_stop with the same value
        if (params?.date) {
          apiParams.date_start = params.date;
          apiParams.date_stop = params.date;
        }

        console.log('🌐 useEvents API Request:', {
          endpoint: API_ENDPOINTS.EVENTS,
          params: apiParams,
          fullUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://rondoapi.local'}${API_ENDPOINTS.EVENTS}?${new URLSearchParams(Object.entries(apiParams).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()}`
        });

        const response = await apiClient.get<EventsResponse>(API_ENDPOINTS.EVENTS, apiParams);
        
        console.log('📦 useEvents API Response received:', {
          status: 'success',
          eventsCount: response.data.events?.length || 0,
          pagination: response.data.pagination,
          responseData: response.data
        });

        console.log('🎯 Events sample (first 3):', 
          response.data.events?.slice(0, 3).map(e => ({
            id: e.event_id,
            name: e.event_name,
            date: e.date_start,
            venue: e.venue_name
          }))
        );
        
        setEvents(response.data.events);
        setPagination(response.data.pagination);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
        console.error('❌ useEvents API Error:', {
          error: err,
          message: errorMessage,
          params: params
        });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (params) {
      fetchEvents();
    }
  }, [params?.sport_type, params?.tournament_id, params?.team_id, params?.date]);

  return { events, loading, error, pagination };
};
