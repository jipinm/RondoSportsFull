import { useState, useCallback, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import { getCurrentSeason } from '../utils/dateUtils';
import { apiCache } from '../utils/apiCache';
import type { Tournament, TournamentsResponse, Team, TeamsResponse } from '../services/apiRoutes';

interface MenuHierarchy {
  tournaments: Tournament[];
  teamsMap: Record<string, Team[]>; // tournament_id -> teams
  linksMap: Record<string, string>; // team_id -> generated URL
  season: string;
  lastUpdated: number;
}

interface UseMenuHierarchyReturn {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  getTeamsForTournament: (tournamentId: string) => Team[];
  getTeamLink: (tournamentId: string, teamId: string) => string;
  refreshMenuHierarchy: () => Promise<void>;
  clearMenuCache: () => void;
}

/**
 * Custom hook for managing complete menu hierarchy with caching
 * Handles tournaments, teams, and navigation links in a unified cache
 */
export const useMenuHierarchy = (): UseMenuHierarchyReturn => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teamsMap, setTeamsMap] = useState<Record<string, Team[]>>({});
  const [linksMap, setLinksMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSeason = getCurrentSeason();

  const generateTeamLink = useCallback((tournamentId: string, teamId: string, season: string): string => {
    return `/events?tournament_id=${tournamentId}&team_id=${teamId}&season=${season}`;
  }, []);

  const loadFromCache = useCallback((): MenuHierarchy | null => {
    const cacheKey = apiCache.getMenuHierarchyKey(currentSeason);
    return apiCache.get<MenuHierarchy>(cacheKey);
  }, [currentSeason]);

  const saveToCache = useCallback((hierarchy: MenuHierarchy): void => {
    const cacheKey = apiCache.getMenuHierarchyKey(currentSeason);
    // Cache for 20 minutes since this is the complete menu structure
    apiCache.set(cacheKey, hierarchy, 20);
  }, [currentSeason]);

  const fetchCompleteHierarchy = useCallback(async (): Promise<void> => {
    // Check cache first
    const cachedHierarchy = loadFromCache();
    if (cachedHierarchy) {
      setTournaments(cachedHierarchy.tournaments);
      setTeamsMap(cachedHierarchy.teamsMap);
      setLinksMap(cachedHierarchy.linksMap);
      return;
    }

    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch tournaments
      const tournamentsUrl = `${API_ENDPOINTS.TOURNAMENTS}?page_size=50&page=1&sport_type=soccer&season=${currentSeason}`;
      const tournamentsResponse = await apiClient.get<TournamentsResponse>(
        tournamentsUrl
      );

      const allTournaments = tournamentsResponse.data.tournaments || [];
      const filteredTournaments = allTournaments.filter(tournament => 
        (tournament.number_events ?? 0) >= 1
      );

      // Step 2: Fetch teams for all tournaments in parallel
      const teamsPromises = filteredTournaments.map(async (tournament) => {
        try {
          const teamsUrl = `${API_ENDPOINTS.TEAMS}?club_logo=true&sport_type=soccer&tournament_id=${tournament.tournament_id}&popular=true`;
          const teamsResponse = await apiClient.get<TeamsResponse>(
            teamsUrl
          );
          
          const teams = teamsResponse.data.teams || [];
          return {
            tournamentId: tournament.tournament_id,
            teams
          };
        } catch (error) {
          return {
            tournamentId: tournament.tournament_id,
            teams: []
          };
        }
      });

      const teamsResults = await Promise.all(teamsPromises);

      // Step 3: Build teams map and links map
      const newTeamsMap: Record<string, Team[]> = {};
      const newLinksMap: Record<string, string> = {};

      teamsResults.forEach(({ tournamentId, teams }) => {
        newTeamsMap[tournamentId] = teams;
        
        // Generate links for all teams
        teams.forEach(team => {
          const linkKey = `${tournamentId}_${team.team_id}`;
          newLinksMap[linkKey] = generateTeamLink(tournamentId, team.team_id, currentSeason);
        });
      });

      // Step 4: Create complete hierarchy object
      const hierarchy: MenuHierarchy = {
        tournaments: filteredTournaments,
        teamsMap: newTeamsMap,
        linksMap: newLinksMap,
        season: currentSeason,
        lastUpdated: Date.now()
      };

      // Step 5: Save to cache and update state
      saveToCache(hierarchy);
      setTournaments(filteredTournaments);
      setTeamsMap(newTeamsMap);
      setLinksMap(newLinksMap);

      setLoading(false);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch menu hierarchy';
      setError(errorMessage);
      setLoading(false);
    }
  }, [loading, currentSeason, loadFromCache, saveToCache, generateTeamLink]);

  const getTeamsForTournament = useCallback((tournamentId: string): Team[] => {
    return teamsMap[tournamentId] || [];
  }, [teamsMap]);

  const getTeamLink = useCallback((tournamentId: string, teamId: string): string => {
    const linkKey = `${tournamentId}_${teamId}`;
    return linksMap[linkKey] || generateTeamLink(tournamentId, teamId, currentSeason);
  }, [linksMap, generateTeamLink, currentSeason]);

  const refreshMenuHierarchy = useCallback(async (): Promise<void> => {
    // Clear cache and refetch
    const cacheKey = apiCache.getMenuHierarchyKey(currentSeason);
    apiCache.delete(cacheKey);
    await fetchCompleteHierarchy();
  }, [currentSeason, fetchCompleteHierarchy]);

  const clearMenuCache = useCallback((): void => {
    const cacheKey = apiCache.getMenuHierarchyKey(currentSeason);
    apiCache.delete(cacheKey);
    
    setTournaments([]);
    setTeamsMap({});
    setLinksMap({});
    setError(null);
  }, [currentSeason]);

  // Load menu hierarchy on component mount
  useEffect(() => {
    fetchCompleteHierarchy();
  }, []);

  return {
    tournaments,
    loading,
    error,
    getTeamsForTournament,
    getTeamLink,
    refreshMenuHierarchy,
    clearMenuCache,
  };
};
