import { useState, useEffect } from 'react';

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
 * Currency conversion result
 */
export interface CurrencyConversionResult {
  originalCurrency: string;
  targetCurrency: string;
  exchangeRate: number | null;
  isLoading: boolean;
  error: string | null;
  convertAmount: (amount: number) => number;
  hasConversion: boolean;
}

/**
 * Hook for real-time currency conversion using Frankfurter API
 * 
 * @param fromCurrency - Source currency code (e.g., 'EUR', 'GBP')
 * @param toCurrency - Target currency code (default: 'USD')
 * @returns Currency conversion utilities and state
 * 
 * @example
 * const { convertAmount, hasConversion, isLoading } = useCurrencyConversion('EUR', 'USD');
 * const usdPrice = convertAmount(100); // Converts 100 EUR to USD
 */
export const useCurrencyConversion = (
  fromCurrency?: string,
  toCurrency: string = 'USD'
): CurrencyConversionResult => {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state if no source currency
    if (!fromCurrency) {
      setExchangeRate(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // If currencies are the same, no conversion needed
    if (fromCurrency === toCurrency) {
      setExchangeRate(1);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Fetch exchange rate from Frankfurter API
    const fetchExchangeRate = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://api.frankfurter.dev/v1/latest?from=${fromCurrency}&to=${toCurrency}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch exchange rate: ${response.status}`);
        }

        const data: FrankfurterResponse = await response.json();

        // Extract the exchange rate for the target currency
        const rate = data.rates[toCurrency];
        
        if (!rate) {
          throw new Error(`Exchange rate for ${toCurrency} not found`);
        }

        setExchangeRate(rate);
      } catch (err: any) {
        console.warn('Currency conversion failed:', err.message);
        setError(err.message);
        setExchangeRate(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExchangeRate();
  }, [fromCurrency, toCurrency]);

  /**
   * Convert an amount from original currency to target currency
   * If conversion fails or is unavailable, returns the original amount
   */
  const convertAmount = (amount: number): number => {
    if (!exchangeRate || exchangeRate === null) {
      return amount; // Return original amount if no conversion available
    }
    return amount * exchangeRate;
  };

  return {
    originalCurrency: fromCurrency || '',
    targetCurrency: toCurrency,
    exchangeRate,
    isLoading,
    error,
    convertAmount,
    hasConversion: exchangeRate !== null && !error
  };
};
