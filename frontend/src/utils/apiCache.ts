/**
 * Cache utility for storing API responses
 * Provides memory-based caching with TTL (time-to-live) support
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ApiCache {
  private cache = new Map<string, CacheItem<any>>();

  /**
   * Set data in cache with TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttlMinutes - Time to live in minutes (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    const ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get data from cache if not expired
   * @param key - Cache key
   * @returns Cached data or null if expired/not found
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const isExpired = Date.now() - item.timestamp > item.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    
    return item.data;
  }

  /**
   * Check if key exists and is not expired
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove specific key from cache
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear teams cache entries only
   */
  clearTeamsCache(): void {
    const stats = this.getStats();
    const teamKeys = stats.keys.filter(key => key.startsWith('teams_'));
    teamKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Generate cache key for tournaments
   * @param season - Season string (e.g., "25/26")
   * @returns Cache key
   */
  getTournamentsKey(season: string): string {
    return `tournaments_soccer_${season}`;
  }

  /**
   * Generate cache key for teams
   * @param tournamentId - Tournament ID
   * @returns Cache key
   */
  getTeamsKey(tournamentId: string): string {
    return `teams_${tournamentId}`;
  }

  /**
   * Generate cache key for complete menu hierarchy
   * @param season - Season string (e.g., "25/26")
   * @returns Cache key
   */
  getMenuHierarchyKey(season: string): string {
    return `menu_hierarchy_soccer_${season}`;
  }

  /**
   * Generate cache key for navigation links
   * @param tournamentId - Tournament ID
   * @param teamId - Team ID
   * @param season - Season string
   * @returns Cache key
   */
  getNavigationLinksKey(tournamentId: string, teamId: string, season: string): string {
    return `nav_links_${tournamentId}_${teamId}_${season}`;
  }
}

// Export singleton instance
export const apiCache = new ApiCache();

// Add to window object for debugging (only in development)
if (import.meta.env.DEV) {
  (window as any).clearTeamsCache = () => {
    apiCache.clearTeamsCache();
  };
  (window as any).clearAllCache = () => {
    apiCache.clear();
  };
  (window as any).getCacheStats = () => {
    const stats = apiCache.getStats();
    return stats;
  };
}

export default apiCache;
