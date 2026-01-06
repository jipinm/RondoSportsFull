/**
 * Tournaments Service
 * Handles tournament API operations for typeahead search
 */

import { apiClient } from './apiRoutes';
import type { Tournament } from '../types/tournaments';

/**
 * Tournaments Service Class
 * Provides methods for tournament search operations
 */
class TournamentsServiceImpl {
  private cachedTournaments: Tournament[] = [];
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Fetch all tournaments for typeahead search
   * GET /v1/tournaments?season=25/26
   */
  async getAllTournaments(season: string = '25/26'): Promise<Tournament[]> {
    try {
      // Check if we have cached data that's still valid
      if (this.cachedTournaments.length > 0 && Date.now() < this.cacheExpiry) {
        console.log('🏆 Using cached tournaments data:', this.cachedTournaments.length);
        return this.cachedTournaments;
      }

      console.log('🌐 API Request:', {
        endpoint: '/v1/tournaments',
        params: { season },
        fullUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://rondoapi.local'}/v1/tournaments?season=${season}`
      });

      const response = await apiClient.get<any>(
        '/v1/tournaments',
        { season }
      );

      console.log('📦 API Response received:', {
        status: 'success',
        responseData: response.data,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : []
      });

      // Handle different response structures
      let tournaments: Tournament[] = [];
      
      if (Array.isArray(response.data)) {
        // Direct array response
        tournaments = response.data;
        console.log('✅ Parsed as direct array:', tournaments.length, 'tournaments');
      } else if (response.data && Array.isArray(response.data.tournaments)) {
        // Nested tournaments array
        tournaments = response.data.tournaments;
        console.log('✅ Parsed as nested array:', tournaments.length, 'tournaments');
      } else if (response.data && typeof response.data === 'object') {
        // Response is an object, might need to extract tournaments
        console.log('⚠️ Response is object but no tournaments array found');
        console.log('📋 Response structure:', JSON.stringify(response.data, null, 2));
        tournaments = [];
      }

      console.log('🎯 Final tournaments array:', {
        count: tournaments.length,
        sample: tournaments.slice(0, 3).map(t => ({ id: t.tournament_id, name: t.official_name }))
      });

      // Cache the results
      this.cachedTournaments = tournaments;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return this.cachedTournaments;
    } catch (error: any) {
      console.error('❌ Failed to fetch tournaments:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        responseData: error.responseData
      });
      // Return cached data if available, otherwise empty array
      return this.cachedTournaments.length > 0 ? this.cachedTournaments : [];
    }
  }

  /**
   * Search tournaments by name for typeahead (client-side filtering)
   */
  async searchTournaments(query: string, season: string = '25/26'): Promise<Tournament[]> {
    const allTournaments = await this.getAllTournaments(season);
    
    // Filter tournaments by query client-side
    if (query && query.length >= 2) {
      return allTournaments.filter(tournament => 
        tournament.official_name.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    return [];
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cachedTournaments = [];
    this.cacheExpiry = 0;
  }
}

// Export singleton instance
export const tournamentsService = new TournamentsServiceImpl();
export default tournamentsService;
