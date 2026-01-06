import { customerApiClient } from './customerApiClient';

 // Custom error class for API validation errors
export class ApiValidationError extends Error {
  public fieldErrors: Record<string, string>;
  
  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiValidationError';
    this.fieldErrors = fieldErrors;
  }
}

// Customer authentication interfaces
export interface CustomerRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  country_code?: string;  // Changed from 'country' to 'country_code'
  city?: string;
  street?: string;
  house_number?: string;  // Database field name
  locality?: string;
  zipcode?: string;  // Database field name
}

export interface CustomerLoginData {
  email: string;
  password: string;
}

export interface CustomerAuthResponse {
  success: boolean;
  data?: {
    customer: {
      id: number;
      customer_id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
      status: string;
      email_verified: boolean;
    };
    tokens: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  };
  message?: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data?: {
    tokens: {
      access_token: string;
      expires_in: number;
    };
  };
}

export interface ForgotPasswordData {
  email: string;
}

export interface Customer {
  id: number;
  customer_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  status: string;
  email_verified: boolean;
}

export interface CustomerProfile {
  id: number;
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country_code?: string;
  date_of_birth?: string;
  gender?: string;
  street?: string;
  house_number?: string;
  zipcode?: string;
  city?: string;
  country?: string;
  preferred_language?: string;
  timezone?: string;
  status: string;
  email_verified: boolean;
  marketing_consent: boolean;
  sms_consent: boolean;
  two_factor_enabled: boolean;
  profile_completed: boolean;
  last_active?: string;
  failed_login_attempts: number;
  account_type: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  country_code?: string;
  preferred_language?: string;
  timezone?: string;
  marketing_consent?: boolean;
  sms_consent?: boolean;
}

export interface AddressUpdateData {
  street?: string;
  house_number?: string;
  address_line_1?: string; // Maps to house_number for backward compatibility
  zipcode?: string;
  postcode?: string; // Maps to zipcode for backward compatibility
  city?: string;
  country_code?: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

// Customer authentication service class
class CustomerAuthService {
  private readonly API_BASE_URL = import.meta.env.VITE_CUSTOMER_API_BASE_URL || 'http://localhost';
  private readonly TOKEN_KEY = 'customer_access_token';
  private readonly REFRESH_TOKEN_KEY = 'customer_refresh_token';
  private readonly CUSTOMER_KEY = 'customer_data';
  private onAutoLogout?: () => void;

  constructor() {
    // 🔍 LOG CUSTOMER AUTH CONFIGURATION
    
    // Set up automatic logout on 401 errors
    customerApiClient.setUnauthorizedCallback(() => {
      this.handleUnauthorizedResponse();
    });
  }

  /**
   * Set callback for when user is automatically logged out due to token expiration
   */
  setAutoLogoutCallback(callback: () => void) {
    this.onAutoLogout = callback;
  }

  /**
   * Handle unauthorized responses - automatically logout and redirect
   */
  private handleUnauthorizedResponse() {
    
    // Clear tokens and customer data immediately
    this.clearAuthData();
    
    // Notify the UI that user has been logged out
    if (this.onAutoLogout) {
      this.onAutoLogout();
    } else {
      // Fallback: redirect to login page
      window.location.href = '/login';
    }
  }

  /**
   * Register a new customer
   */
  async register(data: CustomerRegistrationData): Promise<CustomerAuthResponse> {
    try {

      // Transform data to match backend API expectations
      const apiData: any = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        confirm_password: data.password, // Backend requires password confirmation
        accept_terms: true // Required by backend
      };

      // Add optional fields only if they have values
      if (data.phone) {
        apiData.phone = data.phone;
      }

      // Add country code if provided
      if (data.country_code) {
        apiData.country_code = data.country_code;
      }

      // Add address fields from the new interface
      if (data.street) {
        apiData.street = data.street;
      }

      if (data.house_number) {
        apiData.house_number = data.house_number; // Direct database field mapping
      }

      if (data.city) {
        apiData.city = data.city;
      }

      if (data.zipcode) {
        apiData.zipcode = data.zipcode; // Direct database field mapping
      }


      // 🔍 LOG REGISTRATION REQUEST
      const registrationUrl = `${this.API_BASE_URL}/api/v1/customers/auth/register`;

      const response = await fetch(registrationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        return responseData;
      }

      // Handle non-success responses
      if (responseData.details && typeof responseData.details === 'object') {
        const validationDetails = responseData.details;
        
        // Create field-specific error mapping
        const fieldErrors: Record<string, string> = {};
        
        // Extract all field errors
        for (const [field, message] of Object.entries(validationDetails)) {
          if (typeof message === 'string' && message.trim()) {
            fieldErrors[field] = message;
          }
        }
        
        if (Object.keys(fieldErrors).length > 0) {
          const generalMessage = Object.keys(fieldErrors).length === 1 
            ? Object.values(fieldErrors)[0]  // Use the actual error message
            : `Validation errors: ${Object.values(fieldErrors).join(', ')}`;
          
          throw new ApiValidationError(generalMessage, fieldErrors);
        }
      }
      
      // Handle other error formats
      const errorMessage = responseData.message || responseData.error || 'Registration failed';
      throw new Error(errorMessage);

    } catch (error: any) {
      console.error('❌ Customer Registration Error:', error);
      
      // If it's already our custom error, re-throw it
      if (error instanceof ApiValidationError) {
        throw error;
      }
      
      // Network error
      throw new Error('Network error. Please check your connection and try again.');
    }
  }

  /**
   * Login customer
   */
  async login(data: CustomerLoginData): Promise<CustomerAuthResponse> {
    try {

      const response = await fetch(`${this.API_BASE_URL}/api/v1/customers/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success && responseData.data) {
        // Store tokens and customer data
        this.setTokens(responseData.data.tokens.access_token, responseData.data.tokens.refresh_token);
        this.setCustomerData(responseData.data.customer);
        

        return responseData;
      }

      // Handle non-success responses (like 401 Unauthorized)
      const errorMessage = responseData.message || responseData.error || 'Login failed. Please check your credentials.';
      throw new Error(errorMessage);
    } catch (error: any) {
      console.error('❌ Customer Login Error:', error);
      
      // If it's our thrown error with a specific message, preserve it
      if (error.message && error.message !== 'Network error. Please check your connection and try again.') {
        return {
          success: false,
          message: error.message,
        };
      }
      
      // Network/other errors
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await customerApiClient.post<RefreshTokenResponse>('/api/v1/customers/auth/refresh', {
        refresh_token: refreshToken
      });

      if (response.data.success && response.data.data) {
        // Update access token
        localStorage.setItem(this.TOKEN_KEY, response.data.data.tokens.access_token);
        
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Token Refresh Error:', error);
      // If refresh fails, logout the user
      this.logout();
      throw new Error(error.apiError?.message || error.message || 'Token refresh failed');
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(data: ForgotPasswordData): Promise<{ success: boolean; message: string }> {
    try {

      const response = await customerApiClient.post('/api/v1/customers/auth/forgot-password', data);

      return response.data;
    } catch (error: any) {
      console.error('❌ Password Reset Error:', error);
      throw new Error(error.apiError?.message || error.message || 'Password reset request failed');
    }
  }

  /**
   * Logout customer
   */
  async logout(): Promise<void> {
    try {
      const token = this.getAccessToken();
      if (token) {
        // Call logout endpoint to invalidate token on server
        await customerApiClient.post('/api/v1/customers/logout', {});
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear local storage
      this.clearAuthData();
    }
  }

  /**
   * Set tokens in localStorage
   */
  private setTokens(accessToken: string, refreshToken: string): void {
    
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Set customer data in localStorage
   */
  private setCustomerData(customer: Customer): void {
    
    localStorage.setItem(this.CUSTOMER_KEY, JSON.stringify(customer));
  }

  /**
   * Clear authentication data from localStorage
   */
  clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.CUSTOMER_KEY);
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get customer data
   */
  getCustomerData(): Customer | null {
    const customerData = localStorage.getItem(this.CUSTOMER_KEY);
    if (customerData) {
      try {
        return JSON.parse(customerData);
      } catch (error) {
        console.error('Error parsing customer data:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Check if customer is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const customer = this.getCustomerData();
    
    
    if (!token || !customer) {
      return false;
    }

    // Check if token is expired (with 5-minute buffer)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const isValid = payload.exp > (currentTime + 300); // 5-minute buffer
      
      
      return isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get authorization header for API calls
   */
  getAuthHeader(): string | null {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }

  /**
   * Get full customer profile
   */
  async getProfile(): Promise<CustomerProfile> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await customerApiClient.request<{success: boolean, data?: CustomerProfile, message?: string}>('/api/v1/customers/profile', {
        method: 'GET'
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get profile');
      }

      if (!response.data.data) {
        throw new Error('Profile data not found');
      }

      return response.data.data;
    } catch (error: any) {
      // Don't show error for authentication expiry - user will be redirected
      if (error.isAuthExpired) {
        throw new Error('AUTHENTICATION_EXPIRED');
      }
      throw error;
    }
  }

  /**
   * Update customer profile
   */
  async updateProfile(data: ProfileUpdateData): Promise<CustomerProfile> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await customerApiClient.request<{success: boolean, data?: CustomerProfile, message?: string}>('/api/v1/customers/profile', {
        method: 'PUT',
        body: data
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update profile');
      }

      if (!response.data.data) {
        throw new Error('Updated profile data not found');
      }

      return response.data.data;
    } catch (error: any) {
      // Don't show error for authentication expiry - user will be redirected
      if (error.isAuthExpired) {
        throw new Error('AUTHENTICATION_EXPIRED');
      }
      throw error;
    }
  }

  /**
   * Update customer address
   */
  async updateAddress(data: AddressUpdateData): Promise<CustomerProfile> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await customerApiClient.request<{success: boolean, data?: CustomerProfile, message?: string}>('/api/v1/customers/profile/address', {
        method: 'PUT',
        body: data
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update address');
      }

      if (!response.data.data) {
        throw new Error('Updated address data not found');
      }

      return response.data.data;
    } catch (error: any) {
      // Don't show error for authentication expiry - user will be redirected
      if (error.isAuthExpired) {
        throw new Error('AUTHENTICATION_EXPIRED');
      }
      throw error;
    }
  }

  /**
   * Change customer password
   */
  async changePassword(data: PasswordChangeData): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await customerApiClient.request<{success: boolean, message: string}>('/api/v1/customers/profile/password', {
        method: 'PUT',
        body: data
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to change password');
      }
    } catch (error: any) {
      // Don't show error for authentication expiry - user will be redirected
      if (error.isAuthExpired) {
        throw new Error('AUTHENTICATION_EXPIRED');
      }
      throw error;
    }
  }
}

// Auth context hook
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: CustomerLoginData) => Promise<void>;
  register: (data: CustomerRegistrationData) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  getProfile: () => Promise<CustomerProfile>;
  updateProfile: (data: ProfileUpdateData) => Promise<CustomerProfile>;
  updateAddress: (data: AddressUpdateData) => Promise<CustomerProfile>;
  changePassword: (data: PasswordChangeData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on app start
    const initAuth = () => {
      
      const savedCustomer = customerAuthService.getCustomerData();
      const isAuthValid = customerAuthService.isAuthenticated();
      
      
      if (savedCustomer && isAuthValid) {
        setCustomer(savedCustomer);
      } else {
      }
      setIsLoading(false);
    };

    // Set up automatic logout callback for token expiration
    customerAuthService.setAutoLogoutCallback(() => {
      setCustomer(null);
      
      // Show a brief notification before redirecting
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #f44336;
          color: white;
          padding: 16px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          font-weight: 500;
          max-width: 350px;
        ">
          ⚠️ Your session has expired. Redirecting to login...
        </div>
      `;
      document.body.appendChild(notification);
      
      // Redirect after a brief delay to allow user to see the message
      setTimeout(() => {
        document.body.removeChild(notification);
        window.location.href = '/login';
      }, 2000);
    });

    initAuth();
  }, []);

  const login = async (data: CustomerLoginData) => {
    setIsLoading(true);
    try {
      const response = await customerAuthService.login(data);
      if (response.success && response.data) {
        // Backend now returns first_name and last_name (not 'name')
        setCustomer(response.data.customer as Customer);
      } else {
        // If login failed, throw an error with the message
        throw new Error(response.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: CustomerRegistrationData) => {
    setIsLoading(true);
    try {
      const response = await customerAuthService.register(data);
      if (response.success) {
        // Registration successful, but user needs to login
        // Don't set customer data since registration doesn't return tokens
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await customerAuthService.logout();
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    await customerAuthService.forgotPassword({ email });
  };

  const getProfile = async (): Promise<CustomerProfile> => {
    try {
      return await customerAuthService.getProfile();
    } catch (error: any) {
      // Authentication expired errors are handled by the auto logout callback
      if (error.message === 'AUTHENTICATION_EXPIRED') {
        throw new Error('Session expired. Please log in again.');
      }
      throw error;
    }
  };

  const updateProfile = async (data: ProfileUpdateData): Promise<CustomerProfile> => {
    try {
      const updatedProfile = await customerAuthService.updateProfile(data);
      // Update the basic customer data in context if first_name, last_name or email changed
      if (customer && (data.first_name || data.last_name || updatedProfile.email !== customer.email)) {
        setCustomer({
          ...customer,
          first_name: updatedProfile.first_name,
          last_name: updatedProfile.last_name,
          email: updatedProfile.email
        });
      }
      return updatedProfile;
    } catch (error: any) {
      // Authentication expired errors are handled by the auto logout callback
      if (error.message === 'AUTHENTICATION_EXPIRED') {
        throw new Error('Session expired. Please log in again.');
      }
      throw error;
    }
  };

  const updateAddress = async (data: AddressUpdateData): Promise<CustomerProfile> => {
    try {
      return await customerAuthService.updateAddress(data);
    } catch (error: any) {
      // Authentication expired errors are handled by the auto logout callback
      if (error.message === 'AUTHENTICATION_EXPIRED') {
        throw new Error('Session expired. Please log in again.');
      }
      throw error;
    }
  };

  const changePassword = async (data: PasswordChangeData): Promise<void> => {
    try {
      await customerAuthService.changePassword(data);
    } catch (error: any) {
      // Authentication expired errors are handled by the auto logout callback
      if (error.message === 'AUTHENTICATION_EXPIRED') {
        throw new Error('Session expired. Please log in again.');
      }
      throw error;
    }
  };

  const value: AuthContextType = {
    customer,
    isAuthenticated: !!customer && customerAuthService.isAuthenticated(),
    isLoading,
    login,
    register,
    logout,
    forgotPassword,
    getProfile,
    updateProfile,
    updateAddress,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export singleton instance
export const customerAuthService = new CustomerAuthService();
export default customerAuthService;