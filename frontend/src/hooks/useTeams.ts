import { useState, useCallback } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import { apiCache } from '../utils/apiCache';
import type { Team, TeamsResponse, Tournament } from '../services/apiRoutes';

interface UseTeamsState {
  teams: Team[];
  loading: boolean;
  error: string | null;
}

interface UseTeamsHook extends UseTeamsState {
  getTeamsForTournament: (tournamentId: string) => Team[];
  preloadTeamsForTournaments: (tournaments: Tournament[]) => Promise<void>;
  clearTeamsCache: () => void;
}

/**
 * Custom hook for managing teams data with caching
 * Preloads teams for all tournaments and provides instant access
 */
export const useTeams = (): UseTeamsHook => {
  const [state, setState] = useState<UseTeamsState>({
    teams: [],
    loading: false,
    error: null,
  });

  const fetchTeamsForTournament = useCallback(async (tournamentId: string): Promise<Team[]> => {
    const cacheKey = apiCache.getTeamsKey(tournamentId);
    
    // Check cache first
    const cachedData = apiCache.get<Team[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      
      const teamsUrl = `${API_ENDPOINTS.TEAMS}?club_logo=true&sport_type=soccer&tournament_id=${tournamentId}&popular=true`;
      const response = await apiClient.get<TeamsResponse>(
        teamsUrl
      );
      
      // Extract teams array from response
      const teams = response.data.teams || [];
      
      // Cache teams for 15 minutes
      apiCache.set(cacheKey, teams, 15);
      
      return teams;

    } catch (error) {
      // Return empty array on error, but don't cache it
      return [];
    }
  }, []);

  const preloadTeamsForTournaments = useCallback(async (tournaments: Tournament[]) => {
    if (tournaments.length === 0) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {

      // Fetch teams for all tournaments in parallel
      const teamPromises = tournaments.map(tournament => 
        fetchTeamsForTournament(tournament.tournament_id)
      );

      await Promise.all(teamPromises);

      setState(prev => ({ ...prev, loading: false }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to preload teams';
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
    }
  }, [fetchTeamsForTournament]);

  const getTeamsForTournament = useCallback((tournamentId: string): Team[] => {
    const cacheKey = apiCache.getTeamsKey(tournamentId);
    return apiCache.get<Team[]>(cacheKey) || [];
  }, []);

  const clearTeamsCache = useCallback(() => {
    // Get all cache keys and remove team-related ones
    const stats = apiCache.getStats();
    const teamKeys = stats.keys.filter(key => key.startsWith('teams_'));
    
    teamKeys.forEach(key => apiCache.delete(key));
    
    setState({
      teams: [],
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    getTeamsForTournament,
    preloadTeamsForTournaments,
    clearTeamsCache,
  };
};
