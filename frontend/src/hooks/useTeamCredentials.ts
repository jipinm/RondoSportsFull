import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import type { TeamCredentials } from '../services/apiRoutes';

export const useTeamCredentials = (tournamentId?: string, teamId?: string) => {
  const [teamCredentials, setTeamCredentials] = useState<TeamCredentials | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!tournamentId || !teamId) {
      setTeamCredentials(null);
      setLoading(false);
      setError(null);
      setNotFound(false);
      return;
    }

    const fetchTeamCredentials = async () => {
      const endpoint = API_ENDPOINTS.TEAM_CREDENTIALS(tournamentId, teamId);
      
      setLoading(true);
      setError(null);
      setNotFound(false);
      
      try {
        const response = await apiClient.get<{success: boolean; data: TeamCredentials}>(endpoint);
        
        
        // Extract the actual team credentials data from the nested structure
        setTeamCredentials(response.data.data);
        setNotFound(false);
      } catch (err: any) {
        // Check if it's a 404 error (team credentials not found)
        // The error might be wrapped in different ways depending on the API client
        const status = err.apiError?.status || err.response?.status || err.status;
        
        if (status === 404) {
          setTeamCredentials(null);
          setNotFound(true);
          setError(null); // Don't treat 404 as an error
        } else {
          const errorMessage = err.apiError?.message || err.message || 'Failed to fetch team credentials';
          console.error('❌ Team Credentials API: Error', {
            endpoint,
            error: errorMessage,
            errorDetails: err,
            status: status,
            apiError: err.apiError
          });
          setError(errorMessage);
          setNotFound(false);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTeamCredentials();
  }, [tournamentId, teamId]);

  return { teamCredentials, loading, error, notFound };
};