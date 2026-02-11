import { customerApiClient } from './customerApiClient';

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_default: boolean;
  sort_order: number;
}

export interface CurrencyResponse {
  success: boolean;
  data: Currency[];
  default: Currency | null;
}

// Fallback currencies when API is not available
const FALLBACK_CURRENCIES: Currency[] = [
  { id: 1, code: 'USD', name: 'US Dollar', symbol: '$', is_default: true, sort_order: 1 },
  { id: 2, code: 'EUR', name: 'Euro', symbol: '€', is_default: false, sort_order: 2 },
  { id: 3, code: 'GBP', name: 'British Pound', symbol: '£', is_default: false, sort_order: 3 },
  { id: 4, code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', is_default: false, sort_order: 4 },
];

/**
 * Service for fetching currency data
 */
export class CurrencyService {
  private cachedCurrencies: Currency[] | null = null;
  private cachedDefault: Currency | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all active currencies
   */
  async getActiveCurrencies(): Promise<{ currencies: Currency[]; defaultCurrency: Currency | null }> {
    // Check cache
    const now = Date.now();
    if (this.cachedCurrencies && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return { currencies: this.cachedCurrencies, defaultCurrency: this.cachedDefault };
    }

    try {
      const response = await customerApiClient.get<CurrencyResponse>('/api/v1/currencies');
      
      if (response.data.success) {
        this.cachedCurrencies = response.data.data;
        this.cachedDefault = response.data.default;
        this.lastFetchTime = now;
        return { currencies: response.data.data, defaultCurrency: response.data.default };
      } else {
        throw new Error('Failed to fetch currencies');
      }
    } catch (error: any) {
      console.warn('Currencies API not available, using fallback data:', error.message);
      
      // Return fallback data
      const defaultFallback = FALLBACK_CURRENCIES.find(c => c.is_default) || FALLBACK_CURRENCIES[0];
      return { currencies: FALLBACK_CURRENCIES, defaultCurrency: defaultFallback };
    }
  }

  /**
   * Get the default currency
   */
  async getDefaultCurrency(): Promise<Currency> {
    const { defaultCurrency, currencies } = await this.getActiveCurrencies();
    return defaultCurrency || currencies[0] || FALLBACK_CURRENCIES[0];
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cachedCurrencies = null;
    this.cachedDefault = null;
    this.lastFetchTime = 0;
  }
}

// Export a singleton instance
export const currencyService = new CurrencyService();
