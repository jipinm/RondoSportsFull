/**
 * Customer API Client
 * Handles communication with the local customer management API
 */

// API Configuration for local customer API
const CUSTOMER_API_CONFIG = {
  baseUrl: import.meta.env.VITE_CUSTOMER_API_BASE_URL || 'http://localhost',
};

// API Error Types
export interface CustomerApiError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

export interface CustomerApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

// Request Options Interface
export interface CustomerRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
}

/**
 * Customer API Client Class
 * Provides HTTP client for customer management operations
 */
export class CustomerAPIClient {
  private baseUrl: string;
  private onUnauthorized?: () => void;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || CUSTOMER_API_CONFIG.baseUrl;
    
    // 🔍 LOG CUSTOMER API CONFIGURATION
  }

  /**
   * Set callback for unauthorized (401) responses
   * @param callback - Function to call when 401 error occurs
   */
  setUnauthorizedCallback(callback: () => void) {
    this.onUnauthorized = callback;
  }

  /**
   * Make API request to customer management endpoints
   * @param endpoint - API endpoint (without base URL)
   * @param options - Request options
   * @returns Promise with API response
   */
  async request<T = any>(endpoint: string, options: CustomerRequestOptions = {}): Promise<CustomerApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params = {}
    } = options;

    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    // 🔍 LOG CUSTOMER API REQUEST
    if (params && Object.keys(params).length > 0) {
    }

    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      ...headers,
    };

    // Add JWT Authorization header if token exists
    const token = localStorage.getItem('customer_access_token');
    
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      // Debug what's actually in localStorage
    }

    // Add Content-Type for POST/PUT/PATCH requests with body
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    try {

      const response = await fetch(url.toString(), {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }


      if (!response.ok) {
        // Handle 401 Unauthorized responses - token expired or invalid
        if (response.status === 401 && this.onUnauthorized) {
          this.onUnauthorized();
          // Throw a special error that can be caught to prevent showing error messages
          const error = new Error('AUTHENTICATION_EXPIRED');
          (error as any).isAuthExpired = true;
          (error as any).status = 401;
          throw error;
        }

        const error = new Error(responseData?.message || responseData?.error || `HTTP error! status: ${response.status}`);
        // Attach the full response data to the error for detailed handling
        (error as any).responseData = responseData;
        (error as any).status = response.status;
        throw error;
      }

      return {
        data: responseData,
        status: response.status,
        message: responseData?.message
      };

    } catch (error: any) {
      console.error('❌ Customer API Error:', {
        endpoint,
        method,
        error: error.message,
        responseData: error.responseData,
        stack: error.stack
      });

      // Preserve the original error with responseData attached
      // Don't create a new Error that would lose the responseData
      if (error.responseData) {
        throw error; // Throw the original error with responseData intact
      }
      
      throw new Error(error.message || 'Customer API request failed');
    }
  }

  /**
   * Convenience methods for common HTTP methods
   */
  async get<T = any>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<CustomerApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<CustomerApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  async put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<CustomerApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  async patch<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<CustomerApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }

  async delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<CustomerApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

// Export singleton instance
export const customerApiClient = new CustomerAPIClient();

export default customerApiClient;