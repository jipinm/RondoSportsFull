import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { currencyService, type Currency } from '../services/currencyService';

interface CurrencyContextType {
  currencies: Currency[];
  selectedCurrency: Currency | null;
  defaultCurrency: Currency | null;
  loading: boolean;
  error: string | null;
  setSelectedCurrency: (currency: Currency) => void;
  refreshCurrencies: () => Promise<void>;
  /** The ISO currency code of the selected currency (e.g., 'USD', 'EUR') */
  selectedCurrencyCode: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Local storage key for selected currency
const SELECTED_CURRENCY_KEY = 'rondo_selected_currency';

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setSelectedCurrencyState(result.defaultCurrency || result.currencies[0] || null);
        }
      } else {
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

  const setSelectedCurrency = useCallback((currency: Currency) => {
    setSelectedCurrencyState(currency);
    localStorage.setItem(SELECTED_CURRENCY_KEY, currency.code);
  }, []);

  const selectedCurrencyCode = selectedCurrency?.code || 'USD';

  return (
    <CurrencyContext.Provider
      value={{
        currencies,
        selectedCurrency,
        defaultCurrency,
        loading,
        error,
        setSelectedCurrency,
        refreshCurrencies: fetchCurrencies,
        selectedCurrencyCode,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

/**
 * Hook to access the globally selected currency.
 * Must be used within a CurrencyProvider.
 */
export const useSelectedCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useSelectedCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export default CurrencyContext;
