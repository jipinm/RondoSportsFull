/**
 * Team Credentials API Service
 * Handles all team credentials-related API operations
 */

import { apiClient } from './api-client';

// Types for team credentials data - matching the backend response structure
export interface TeamCredential {
  id: number;
  sport_type: 'soccer';
  tournament_id: string;
  team_id: string;
  team_name?: string;
  tournament_name?: string;
  short_description?: string;
  logo_filename?: string;
  banner_filename?: string;
  logo_url?: string;
  banner_url?: string;
  status: 'active' | 'inactive';
  is_featured: number; // 0 = not featured, 1 = featured
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  updated_by_name?: string;
}

export interface TeamCredentialCreate {
  tournament_id: string;
  team_id: string;
  team_name?: string;
  tournament_name?: string;
  short_description?: string;
  status?: 'active' | 'inactive';
}

export interface TeamCredentialUpdate {
  team_name?: string;
  tournament_name?: string;
  short_description?: string;
  status?: 'active' | 'inactive';
}

export interface TeamCredentialsFilters {
  search?: string;
  status?: 'active' | 'inactive';
  tournament_id?: string;
  team_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export interface TeamCredentialsPagination {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface TeamCredentialsListResponse {
  success: boolean;
  data: TeamCredential[];
  pagination: {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
}

export interface TeamCredentialResponse {
  success: boolean;
  data: TeamCredential;
}

export interface TeamCredentialCreateResponse {
  success: boolean;
  message?: string;
  data?: TeamCredential;
  errors?: Record<string, string>;
  uploads?: {
    logo?: {
      success: boolean;
      filename: string;
      url: string;
      path: string;
    };
    banner?: {
      success: boolean;
      filename: string;
      url: string;
      path: string;
    };
  };
}

export interface TeamCredentialsStatsData {
  total_credentials: number;
  active_credentials: number;
  inactive_credentials: number;
  with_logo: number;
  with_banner: number;
  unique_tournaments: number;
  unique_teams: number;
}

export interface TeamCredentialsStatsResponse {
  success: boolean;
  data: TeamCredentialsStatsData;
}

export interface TournamentTeamsResponse {
  success: boolean;
  data: TeamCredential[];
  count: number;
}

export interface ApiTeamData {
  id: string;
  name: string;
  short_name?: string;
  logo?: string;
  country?: string;
  city?: string;
}

export interface ApiTournamentData {
  id: string;
  name: string;
  short_name?: string;
  logo?: string;
  sport_type: string;
  season?: string;
  country?: string;
}

export interface ApiDataResponse {
  success: boolean;
  data: {
    team: ApiTeamData | null;
    tournament: ApiTournamentData | null;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

export class TeamCredentialsService {
  private readonly basePath = '/admin/team-credentials';

  /**
   * Get team credentials list with optional filters or pagination
   */
  async getTeamCredentials(params?: TeamCredentialsFilters | TeamCredentialsPagination): Promise<TeamCredentialsListResponse> {
    const urlParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          urlParams.append(key, value.toString());
        }
      });
    }

    const queryString = urlParams.toString();
    const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;

    return await apiClient.get<TeamCredentialsListResponse>(endpoint);
  }

  /**
   * Get single team credential by ID
   */
  async getTeamCredentialById(id: number): Promise<TeamCredentialResponse> {
    return await apiClient.get<TeamCredentialResponse>(`${this.basePath}/${id}`);
  }

  /**
   * Get team credential by tournament and team ID
   */
  async getTeamCredentialByTeam(tournamentId: string, teamId: string): Promise<TeamCredentialResponse> {
    return await apiClient.get<TeamCredentialResponse>(
      `${this.basePath}/tournament/${encodeURIComponent(tournamentId)}/team/${encodeURIComponent(teamId)}`
    );
  }

  /**
   * Create new team credential
   */
  async createTeamCredential(
    data: TeamCredentialCreate,
    files?: { logo?: File; banner?: File }
  ): Promise<TeamCredentialCreateResponse> {
    try {
      console.log('=== CREATE TEAM CREDENTIAL DEBUG ===');
      console.log('Data:', data);
      console.log('Files:', files);
      
      const formData = new FormData();

      // Add form data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
          console.log(`Added form field: ${key} = ${value}`);
        }
      });

      // Add files if provided
      if (files?.logo) {
        formData.append('logo', files.logo);
        console.log('Added logo file:', files.logo.name, files.logo.size, 'bytes');
        // Also try alternate field name in case backend expects it
        // formData.append('logo_file', files.logo); // Uncomment if backend expects this
      }
      if (files?.banner) {
        formData.append('banner', files.banner);
        console.log('Added banner file:', files.banner.name, files.banner.size, 'bytes');
        // Also try alternate field name in case backend expects it
        // formData.append('banner_file', files.banner); // Uncomment if backend expects this
      }

      // Debug: Log all FormData entries
      console.log('FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      // For multipart/form-data, we need to make a custom request
      return await apiClient.postFormData<TeamCredentialCreateResponse>(this.basePath, formData);
    } catch (error: any) {
      console.error('Create team credential error:', error);
      return {
        success: false,
        errors: { general: error.message || 'Failed to create team credential' }
      };
    }
  }

  /**
   * Update team credential
   */
  /**
   * Update team credential data (no files)
   */
  async updateTeamCredential(
    id: number,
    data: TeamCredentialUpdate
  ): Promise<TeamCredentialCreateResponse> {
    try {
      const hasData = Object.keys(data).length > 0;

      if (!hasData) {
        return {
          success: false,
          errors: { general: 'No changes detected. Please modify at least one field.' }
        };
      }

      // Use JSON for data-only updates
      return await apiClient.put<TeamCredentialCreateResponse>(`${this.basePath}/${id}`, data);
    } catch (error: any) {
      console.error('Update team credential error:', error);
      return {
        success: false,
        errors: { general: error.message || 'Failed to update team credential' }
      };
    }
  }

  /**
   * Update team credential files only
   */
  async updateTeamCredentialFiles(
    id: number,
    files: { logo?: File; banner?: File }
  ): Promise<TeamCredentialCreateResponse> {
    try {
      console.log('=== UPDATE TEAM CREDENTIAL FILES DEBUG ===');
      console.log('ID:', id);
      console.log('Files object:', files);
      console.log('Files keys:', Object.keys(files));

      const hasFiles = files && Object.values(files).some(file => file instanceof File);
      console.log('Has files check:', hasFiles);

      if (!hasFiles) {
        return {
          success: false,
          errors: { general: 'No files selected for upload.' }
        };
      }

      const formData = new FormData();

      // Add files with detailed logging
      if (files.logo) {
        console.log('Adding logo file:', {
          name: files.logo.name,
          size: files.logo.size,
          type: files.logo.type,
          lastModified: files.logo.lastModified
        });
        formData.append('logo', files.logo);
      }
      if (files.banner) {
        console.log('Adding banner file:', {
          name: files.banner.name,
          size: files.banner.size,
          type: files.banner.type,
          lastModified: files.banner.lastModified
        });
        formData.append('banner', files.banner);
      }

      // Log FormData contents
      console.log('=== FORMDATA CONTENTS ===');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      console.log('Making API call to:', `${this.basePath}/${id}/files`);
      return await apiClient.postFormData<TeamCredentialCreateResponse>(`${this.basePath}/${id}/files`, formData);
    } catch (error: any) {
      console.error('Update team credential files error:', error);
      return {
        success: false,
        errors: { general: error.message || 'Failed to update team credential files' }
      };
    }
  }

  /**
   * Get teams for a specific tournament
   */
  async getTournamentTeams(tournamentId: string): Promise<TournamentTeamsResponse> {
    return await apiClient.get<TournamentTeamsResponse>(
      `${this.basePath}/tournament/${encodeURIComponent(tournamentId)}/teams`
    );
  }

  /**
   * Get team credentials statistics
   */
  async getTeamCredentialsStats(): Promise<TeamCredentialsStatsResponse> {
    return await apiClient.get<TeamCredentialsStatsResponse>(`${this.basePath}/stats`);
  }

  /**
   * Get team data from XS2Event API
   */
  async getTeamFromApi(tournamentId: string, teamId: string): Promise<ApiDataResponse> {
    return await apiClient.get<ApiDataResponse>(
      `${this.basePath}/api/tournament/${encodeURIComponent(tournamentId)}/team/${encodeURIComponent(teamId)}`
    );
  }

  /**
   * Toggle featured status for team credential
   */
  async toggleFeaturedStatus(id: number, isFeatured: boolean): Promise<TeamCredentialResponse> {
    console.log('=== Service: toggleFeaturedStatus ===');
    console.log('ID:', id);
    console.log('isFeatured:', isFeatured);
    console.log('isFeatured type:', typeof isFeatured);
    console.log('Request payload:', { is_featured: isFeatured });
    
    try {
      const response = await apiClient.patch<TeamCredentialResponse>(
        `${this.basePath}/${id}/featured`,
        { is_featured: isFeatured }
      );
      console.log('Service response:', response);
      return response;
    } catch (error) {
      console.error('Service error:', error);
      throw error;
    }
  }

  /**
   * Delete team credential
   */
  async deleteTeamCredential(id: number): Promise<void> {
    await apiClient.delete(`/admin/team-credentials/${id}`);
  }

  /**
   * Delete individual image (logo or banner)
   */
  async deleteTeamCredentialImage(id: number, type: 'logo' | 'banner'): Promise<void> {
    await apiClient.delete(`/admin/team-credentials/${id}/image/${type}`);
  }

  /**
   * Check if team credential exists for given tournament and team
   */
  async checkTeamCredentialExists(tournamentId: string, teamId: string): Promise<boolean> {
    try {
      await this.getTeamCredentialByTeam(tournamentId, teamId);
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error; // Re-throw other errors
    }
  }

  /**
   * Validate file before upload
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file size (5MB limit to match backend)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must not exceed 5MB' };
    }

    // Check file type - support PNG, JPG, JPEG only
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Allowed formats: PNG, JPG, JPEG' };
    }

    return { valid: true };
  }

  /**
   * Generate display name for team credential
   */
  getDisplayName(credential: TeamCredential): string {
    if (credential.team_name && credential.tournament_name) {
      return `${credential.team_name} - ${credential.tournament_name}`;
    } else if (credential.team_name) {
      return credential.team_name;
    } else if (credential.tournament_name) {
      return `Team ${credential.team_id} - ${credential.tournament_name}`;
    } else {
      return `${credential.tournament_id} - ${credential.team_id}`;
    }
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): 'success' | 'secondary' | 'warning' | 'danger' {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Get full image URL by prepending API base URL if needed
   */
  getFullImageUrl(relativeUrl?: string): string | undefined {
    if (!relativeUrl) {
      return undefined;
    }
    
    // If URL is already absolute, return as is
    if (relativeUrl.startsWith('http')) {
      console.log('Image URL is already absolute:', relativeUrl);
      return relativeUrl;
    }
    
    // Prepend API base URL
    const fullUrl = `${import.meta.env.VITE_API_URL}${relativeUrl}`;
    console.log('Constructed full image URL:', fullUrl, 'from relative URL:', relativeUrl);
    return fullUrl;
  }
}

// Export a singleton instance
export const teamCredentialsService = new TeamCredentialsService();
export default teamCredentialsService;