/**
 * Tournament Types
 * TypeScript interfaces for tournament typeahead search functionality
 */

export interface Tournament {
  tournament_id: string;
  official_name: string;
  sport_type: string;
}

export interface TournamentsResponse {
  tournaments?: Tournament[];
  // Add other response fields if needed
}

export interface TournamentSearchParams {
  season?: string;
  sport_type?: string;
  query?: string;
}
