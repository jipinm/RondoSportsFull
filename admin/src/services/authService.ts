/**
 * Authentication Service
 *
 * Handles JWT authentication with the Rondo Sports API
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status?: string;
  two_fa_enabled?: boolean;
  last_login_at?: string;
  created_at?: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: AuthUser;
  };
  error?: string;
}

export interface RefreshResponse {
  success: boolean;
  data?: {
    access_token: string;
    expires_in: number;
  };
  error?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: AuthUser;
  error?: string;
}

class AuthService {
  private readonly API_BASE_URL = import.meta.env.VITE_API_URL;
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store tokens and user data
        this.setTokens(data.data.access_token, data.data.refresh_token);
        this.setUserData(data.data.user);

        return data;
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<RefreshResponse> {
    try {
      const refreshToken = this.getRefreshToken();

      if (!refreshToken) {
        return {
          success: false,
          error: 'No refresh token available',
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update access token
        this.setAccessToken(data.data.access_token);
        return data;
      }

      // If refresh fails, clear all stored data
      if (response.status === 401) {
        this.logout();
      }

      return data;
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Network error during token refresh',
      };
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const accessToken = this.getAccessToken();

      if (!accessToken) {
        return {
          success: false,
          error: 'No access token available',
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update stored user data
        this.setUserData(data.data.user);
        return data;
      }

      // If token is invalid, try to refresh
      if (response.status === 401) {
        const refreshResult = await this.refreshToken();

        if (refreshResult.success) {
          // Retry the request with new token
          return this.getCurrentUser();
        }
      }

      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      return {
        success: false,
        error: 'Network error while fetching user profile',
      };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const accessToken = this.getAccessToken();

      if (accessToken) {
        // Call logout endpoint
        await fetch(`${this.API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      this.clearStoredData();
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const user = this.getUserData();

    if (!token || !user) {
      return false;
    }

    // Check if token is expired (with 5-minute buffer)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > (currentTime + 300); // 5-minute buffer
    } catch {
      return false;
    }
  }

  /**
   * Get stored access token
   */
  public getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  getUserData(): AuthUser | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Set tokens in localStorage
   */
  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Set access token only
   */
  private setAccessToken(accessToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
  }

  /**
   * Set user data in localStorage
   */
  private setUserData(user: AuthUser): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Clear all stored authentication data
   */
  clearStoredData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const accessToken = this.getAccessToken();

      if (!accessToken) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Api-Key': 'e417f1be53494f5f9fbc5b350b1a5850'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data;
      }

      // If token is invalid, try to refresh
      if (response.status === 401) {
        const refreshResult = await this.refreshToken();

        if (refreshResult.success) {
          // Retry the request with new token
          return this.changePassword(currentPassword, newPassword);
        }
      }

      return data;
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'Network error while changing password',
      };
    }
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): string {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : '';
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
