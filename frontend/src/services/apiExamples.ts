/**
 * Example usage of XS2Event API Client
 * 
 * This file demonstrates how to use the API client for different operations.
 * Remove this file after understanding the usage patterns.
 */

import { apiClient, API_ENDPOINTS, ApiUtils, type SportsResponse, type TournamentsResponse } from './apiRoutes';

// Example: Fetch all sports
export async function fetchSports() {
  try {
    const response = await apiClient.get<SportsResponse>(API_ENDPOINTS.SPORTS);
    return response.data.sports;
  } catch (error) {
    throw error;
  }
}

// Example: Fetch tournaments with filters
export async function fetchTournaments(sportType?: string) {
  try {
    const params: Record<string, any> = {
      date_stop: `ge:${ApiUtils.getCurrentDateForFilter()}`, // Only future events
    };

    if (sportType) {
      params.sport_type = sportType;
    }

    const response = await apiClient.get<TournamentsResponse>(API_ENDPOINTS.TOURNAMENTS, params);
    return response.data.tournaments;
  } catch (error) {
    throw error;
  }
}

// Example: Fetch multiple sports using 'in' operator
export async function fetchMultipleSports(sportTypes: string[]) {
  try {
    const params = {
      sport_type: `in:[${sportTypes.join(',')}]`,
      date_stop: `ge:${ApiUtils.getCurrentDateForFilter()}`,
    };

    const response = await apiClient.get<TournamentsResponse>(API_ENDPOINTS.TOURNAMENTS, params);
    return response.data.tournaments;
  } catch (error) {
    throw error;
  }
}

// Example: Error handling with custom logic
export async function fetchSportsWithErrorHandling() {
  try {
    const response = await apiClient.get<SportsResponse>(API_ENDPOINTS.SPORTS);
    return response.data.sports;
  } catch (error: any) {
    // Check if it's an API error
    if (error.name === 'ApiError') {
      const apiError = error.apiError;
      
      switch (apiError.status) {
        case 401:
          // Authentication failed - check your API key
          // Redirect to login or show API key configuration
          break;
        case 503:
          // Rate limit exceeded - implementing retry logic
          // Implement exponential backoff retry
          break;
        case 422:
          // Invalid parameters
          // Show user-friendly validation errors
          break;
        default:
          // API Error
          break;
      }
    } else {
      // Network or other error
    }
    
    throw error;
  }
}

// Example: Working with prices
export function priceExamples() {
  const priceInCents = 5000; // €50.00
  const displayPrice = ApiUtils.formatPrice(priceInCents);

  const userInputPrice = "50.00";
  const centsValue = ApiUtils.priceTocents(userInputPrice);
  
  return { displayPrice, centsValue };
}

// Example: Date formatting for API
export function dateExamples() {
  const today = new Date();
  const apiDate = ApiUtils.formatDateForApi(today);

  const filterDate = ApiUtils.getCurrentDateForFilter();
  
  return { apiDate, filterDate };
}
