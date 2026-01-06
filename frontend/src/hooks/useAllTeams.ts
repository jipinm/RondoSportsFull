import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import type { Team, TeamsResponse } from '../services/apiRoutes';

interface UseAllTeamsParams {
  tournament_id?: string;
  sport_type?: string;
  page_size?: number;
  page?: number;
}

interface UseAllTeamsReturn {
  teams: Team[];
  loading: boolean;
  error: string | null;
  pagination: {
    total_size: number;
    page_size: number;
    current_page: number;
    has_next: boolean;
    has_previous: boolean;
  } | null;
}

/**
 * Custom hook for fetching all teams (not just popular ones)
 * NO CACHING - Always fetches fresh data from API
 */
export const useAllTeams = (params: UseAllTeamsParams = {}): UseAllTeamsReturn => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    total_size: number;
    page_size: number;
    current_page: number;
    has_next: boolean;
    has_previous: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Build API parameters according to documentation
        const apiParams: Record<string, any> = {
          sport_type: params.sport_type || 'soccer',
          tournament_id: params.tournament_id,
          page_size: params.page_size || 50,
          page: params.page || 1,
        };

        // Remove undefined values
        Object.keys(apiParams).forEach(key => {
          if (apiParams[key] === undefined) {
            delete apiParams[key];
          }
        });

        // Add cache-busting parameter to ensure fresh data
        const cacheBustParams = {
          ...apiParams,
          _t: Date.now() // Cache buster
        };


        const response = await apiClient.get<TeamsResponse>(API_ENDPOINTS.TEAMS, cacheBustParams);


        // Just use what the API returns - no additional logic
        setTeams(response.data.teams);
        setPagination({
          total_size: response.data.pagination.total_size,
          page_size: response.data.pagination.page_size,
          current_page: response.data.pagination.page_number,
          has_next: !!response.data.pagination.next_page,
          has_previous: !!response.data.pagination.previous_page
        });
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teams';
        setError(errorMessage);
        setTeams([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have required parameters
    if (params.tournament_id && params.sport_type) {
      fetchTeams();
    } else {
      setLoading(false);
    }
  }, [params.tournament_id, params.sport_type, params.page_size, params.page]);

  return { 
    teams, 
    loading, 
    error, 
    pagination
  };
};
