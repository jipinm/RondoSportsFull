import { useState, useEffect, useCallback } from 'react';
import { currencyService, type Currency } from '../services/currencyService';

interface UseCurrenciesResult {
  currencies: Currency[];
  selectedCurrency: Currency | null;
  defaultCurrency: Currency | null;
  loading: boolean;
  error: string | null;
  setSelectedCurrency: (currency: Currency) => void;
  refreshCurrencies: () => Promise<void>;
}

// Local storage key for selected currency
const SELECTED_CURRENCY_KEY = 'rondo_selected_currency';

/**
 * Hook for managing currency selection
 */
export const useCurrencies = (): UseCurrenciesResult => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load currencies on mount
  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await currencyService.getActiveCurrencies();
      setCurrencies(result.currencies);
      setDefaultCurrency(result.defaultCurrency);

      // Try to restore the previously selected currency from localStorage
      const savedCurrencyCode = localStorage.getItem(SELECTED_CURRENCY_KEY);
      if (savedCurrencyCode) {
        const savedCurrency = result.currencies.find(c => c.code === savedCurrencyCode);
        if (savedCurrency) {
          setSelectedCurrencyState(savedCurrency);
        } else {
          // Saved currency no longer available, use default
          setSelectedCurrencyState(result.defaultCurrency || result.currencies[0] || null);
        }
      } else {
        // No saved currency, use default
        setSelectedCurrencyState(result.defaultCurrency || result.currencies[0] || null);
      }
    } catch (err: any) {
      console.error('Failed to fetch currencies:', err);
      setError(err.message || 'Failed to load currencies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  // Set selected currency and persist to localStorage
  const setSelectedCurrency = useCallback((currency: Currency) => {
    setSelectedCurrencyState(currency);
    localStorage.setItem(SELECTED_CURRENCY_KEY, currency.code);
  }, []);

  return {
    currencies,
    selectedCurrency,
    defaultCurrency,
    loading,
    error,
    setSelectedCurrency,
    refreshCurrencies: fetchCurrencies
  };
};

export default useCurrencies;
