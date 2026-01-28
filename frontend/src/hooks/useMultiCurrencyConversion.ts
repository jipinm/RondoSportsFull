import { useState, useEffect, useCallback } from 'react';

/**
 * Currency conversion response from Frankfurter API
 */
interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: {
    [currency: string]: number;
  };
}

/**
 * Multi-currency conversion result
 */
export interface MultiCurrencyConversionResult {
  exchangeRates: Map<string, number>;
  isLoading: boolean;
  error: string | null;
  convertAmount: (amount: number, fromCurrency: string) => number;
  getExchangeRate: (currency: string) => number;
  hasConversion: (currency: string) => boolean;
}

/**
 * Hook for real-time multi-currency conversion using Frankfurter API
 * Fetches exchange rates for multiple source currencies to USD
 * 
 * @param currencies - Array of source currency codes (e.g., ['EUR', 'GBP'])
 * @param toCurrency - Target currency code (default: 'USD')
 * @returns Multi-currency conversion utilities and state
 * 
 * @example
 * const { convertAmount, getExchangeRate, hasConversion } = useMultiCurrencyConversion(['EUR', 'GBP'], 'USD');
 * const usdPriceFromEur = convertAmount(100, 'EUR');
 * const usdPriceFromGbp = convertAmount(100, 'GBP');
 */
export const useMultiCurrencyConversion = (
  currencies: string[],
  toCurrency: string = 'USD'
): MultiCurrencyConversionResult => {
  const [exchangeRates, setExchangeRates] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Filter out empty currencies and USD (no conversion needed for USD to USD)
    const uniqueCurrencies = [...new Set(currencies.filter(c => c && c !== toCurrency))];

    if (uniqueCurrencies.length === 0) {
      // No conversion needed - set USD rate to 1
      const rates = new Map<string, number>();
      rates.set(toCurrency, 1);
      setExchangeRates(rates);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Fetch exchange rates for all unique currencies
    const fetchExchangeRates = async () => {
      setIsLoading(true);
      setError(null);

      const rates = new Map<string, number>();
      // USD to USD is always 1
      rates.set(toCurrency, 1);

      try {
        // Fetch all exchange rates in parallel
        const fetchPromises = uniqueCurrencies.map(async (currency) => {
          try {
            const response = await fetch(
              `https://api.frankfurter.app/latest?from=${currency}&to=${toCurrency}`
            );

            if (!response.ok) {
              console.warn(`Failed to fetch exchange rate for ${currency}: ${response.status}`);
              return { currency, rate: null };
            }

            const data: FrankfurterResponse = await response.json();
            const rate = data.rates[toCurrency];
            
            return { currency, rate };
          } catch (err) {
            console.warn(`Error fetching exchange rate for ${currency}:`, err);
            return { currency, rate: null };
          }
        });

        const results = await Promise.all(fetchPromises);

        // Populate the rates map
        results.forEach(({ currency, rate }) => {
          if (rate !== null) {
            rates.set(currency, rate);
          }
        });

        setExchangeRates(rates);
        setError(null);
      } catch (err) {
        console.error('Error fetching exchange rates:', err);
        setError('Failed to load exchange rates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExchangeRates();
  }, [currencies.join(','), toCurrency]); // Re-fetch when currencies change

  /**
   * Convert an amount from a specific currency to target currency
   */
  const convertAmount = useCallback((amount: number, fromCurrency: string): number => {
    if (!fromCurrency || fromCurrency === toCurrency) {
      return amount;
    }

    const rate = exchangeRates.get(fromCurrency);
    if (rate === undefined) {
      // No rate available, return original amount
      return amount;
    }

    return amount * rate;
  }, [exchangeRates, toCurrency]);

  /**
   * Get exchange rate for a specific currency
   */
  const getExchangeRate = useCallback((currency: string): number => {
    if (!currency || currency === toCurrency) {
      return 1;
    }
    return exchangeRates.get(currency) || 1;
  }, [exchangeRates, toCurrency]);

  /**
   * Check if conversion is available for a currency
   */
  const hasConversion = useCallback((currency: string): boolean => {
    if (!currency || currency === toCurrency) {
      return true;
    }
    return exchangeRates.has(currency);
  }, [exchangeRates, toCurrency]);

  return {
    exchangeRates,
    isLoading,
    error,
    convertAmount,
    getExchangeRate,
    hasConversion,
  };
};

export default useMultiCurrencyConversion;
