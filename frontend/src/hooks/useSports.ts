import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS, type Sport, type SportsResponse } from '../services/apiRoutes';

export interface SportsData {
  sports: Sport[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook for fetching sports data from XS2Event API
 * Includes caching, error handling, and loading states
 */
export const useSports = (): SportsData => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<SportsResponse>(API_ENDPOINTS.SPORTS);
      setSports(response.data.sports || []);
    } catch (err: any) {
      
      // Handle different error types
      if (err.name === 'ApiError') {
        const apiError = err.apiError;
        
        switch (apiError.status) {
          case 401:
            setError('Authentication failed. Please check API configuration.');
            break;
          case 503:
            setError('Service temporarily unavailable. Please try again later.');
            break;
          case 404:
            setError('Sports data not found.');
            break;
          default:
            setError(apiError.message || 'Failed to load sports data.');
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSports();
  }, []);

  return {
    sports,
    loading,
    error,
    refetch: fetchSports,
  };
};
