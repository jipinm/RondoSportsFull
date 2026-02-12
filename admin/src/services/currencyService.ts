/**
 * Currency API Service
 * Handles all currency-related API operations for the admin panel
 */

import { apiClient } from './api-client';
import type {
  Currency,
  CurrencyCreate,
  CurrencyUpdate,
  CurrencyFilters,
  CurrenciesResponse,
  CurrencyResponse,
  CurrencyDeleteResponse,
  CurrencyStatsResponse
} from '../types/currencies';

/** Frankfurter API supported currencies cache */
let _supportedCurrenciesCache: Record<string, string> | null = null;

class CurrencyService {
  private baseUrl = '/admin/currencies';

  /**
   * Fetch supported currencies from the Frankfurter API.
   * Returns a map of currency code → currency name.
   * Results are cached for the session.
   */
  async getSupportedCurrencies(): Promise<Record<string, string>> {
    if (_supportedCurrenciesCache) {
      return _supportedCurrenciesCache;
    }

    try {
      console.log('🌐 Fetching supported currencies from Frankfurter API');
      const response = await fetch('https://api.frankfurter.dev/v1/currencies');

      if (!response.ok) {
        throw new Error(`Frankfurter API error: ${response.status}`);
      }

      const data: Record<string, string> = await response.json();
      _supportedCurrenciesCache = data;
      console.log('✅ Supported currencies fetched:', Object.keys(data).length);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching supported currencies:', error);
      throw error;
    }
  }

  /**
   * Get all currencies with filtering and pagination
   */
  async getCurrencies(
    filters: CurrencyFilters = {},
    page = 1,
    perPage = 50
  ): Promise<CurrenciesResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      console.log('🔍 Fetching currencies with params:', params.toString());

      const response = await apiClient.get<CurrenciesResponse>(`${this.baseUrl}?${params}`);
      
      if (!response.success) {
        throw new Error('Failed to fetch currencies');
      }

      console.log('✅ Currencies fetched successfully:', {
        count: response.data?.length || 0,
        total: response.pagination?.total || 0
      });

      return response;
    } catch (error: any) {
      console.error('❌ Error fetching currencies:', error);
      throw error;
    }
  }

  /**
   * Get a single currency by ID
   */
  async getCurrency(id: number): Promise<Currency> {
    try {
      console.log('🔍 Fetching currency with ID:', id);

      const response = await apiClient.get<CurrencyResponse>(`${this.baseUrl}/${id}`);
      
      if (!response.success) {
        throw new Error('Failed to fetch currency');
      }

      console.log('✅ Currency fetched successfully:', response.data.code);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching currency:', error);
      throw error;
    }
  }

  /**
   * Create a new currency
   */
  async createCurrency(currencyData: CurrencyCreate): Promise<Currency> {
    try {
      console.log('🔨 Creating currency:', currencyData.code);

      const response = await apiClient.post<CurrencyResponse>(this.baseUrl, currencyData);
      
      if (!response.success) {
        throw new Error('Failed to create currency');
      }

      console.log('✅ Currency created successfully:', response.data.code);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating currency:', error);
      throw error;
    }
  }

  /**
   * Update an existing currency
   */
  async updateCurrency(id: number, currencyData: CurrencyUpdate): Promise<Currency> {
    try {
      console.log('📝 Updating currency:', id);

      const response = await apiClient.put<CurrencyResponse>(`${this.baseUrl}/${id}`, currencyData);
      
      if (!response.success) {
        throw new Error('Failed to update currency');
      }

      console.log('✅ Currency updated successfully:', response.data.code);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating currency:', error);
      throw error;
    }
  }

  /**
   * Delete a currency
   */
  async deleteCurrency(id: number): Promise<void> {
    try {
      console.log('🗑️ Deleting currency:', id);

      const response = await apiClient.delete<CurrencyDeleteResponse>(`${this.baseUrl}/${id}`);
      
      if (!response.success) {
        throw new Error('Failed to delete currency');
      }

      console.log('✅ Currency deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting currency:', error);
      throw error;
    }
  }

  /**
   * Set a currency as the default
   */
  async setAsDefault(id: number): Promise<Currency> {
    try {
      console.log('⭐ Setting currency as default:', id);

      const response = await apiClient.patch<CurrencyResponse>(`${this.baseUrl}/${id}/set-default`);
      
      if (!response.success) {
        throw new Error('Failed to set currency as default');
      }

      console.log('✅ Currency set as default successfully:', response.data.code);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error setting currency as default:', error);
      throw error;
    }
  }

  /**
   * Toggle currency active status
   */
  async toggleActive(id: number): Promise<Currency> {
    try {
      console.log('🔄 Toggling currency active status:', id);

      const response = await apiClient.patch<CurrencyResponse>(`${this.baseUrl}/${id}/toggle-active`);
      
      if (!response.success) {
        throw new Error('Failed to toggle currency status');
      }

      console.log('✅ Currency status toggled successfully:', response.data.code, 'is now', response.data.is_active ? 'active' : 'inactive');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error toggling currency status:', error);
      throw error;
    }
  }

  /**
   * Get currency statistics
   */
  async getStats(): Promise<CurrencyStatsResponse> {
    try {
      console.log('📊 Fetching currency stats');

      const response = await apiClient.get<CurrencyStatsResponse>(`${this.baseUrl}/stats`);
      
      if (!response.success) {
        throw new Error('Failed to fetch currency stats');
      }

      console.log('✅ Currency stats fetched successfully');
      return response;
    } catch (error: any) {
      console.error('❌ Error fetching currency stats:', error);
      throw error;
    }
  }
}

export const currencyService = new CurrencyService();
export type { Currency, CurrencyCreate, CurrencyUpdate, CurrencyFilters };
