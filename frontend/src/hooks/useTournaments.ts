import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS, ApiUtils, type Tournament, type TournamentsResponse } from '../services/apiRoutes';

interface UseTournamentsResult {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
}

export const useTournaments = (sportType?: string): UseTournamentsResult => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, any> = {
          date_stop: `ge:${ApiUtils.getCurrentDateForFilter()}`, // Only future events
        };

        if (sportType) {
          params.sport_type = sportType;
        }

        const response = await apiClient.get<TournamentsResponse>(API_ENDPOINTS.TOURNAMENTS, params);
        
        setTournaments(response.data.tournaments);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tournaments';
        setError(errorMessage);
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [sportType]);

  useEffect(() => {
    // State updated
  }, [tournaments, loading, error, sportType]);

  return { tournaments, loading, error };
};
