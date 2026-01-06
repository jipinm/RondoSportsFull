/**
 * useBookingOrderGuestData Hook
 * React hook for managing booking order guest data operations
 */

import { useState, useCallback } from 'react';
import { bookingOrdersService } from '../services/bookingOrdersService';
import type {
  GuestDataResponse,
  GuestData,
  UpdateGuestDataRequest
} from '../types/xs2event';

interface UseBookingOrderGuestDataResult {
  guestData: GuestDataResponse | null;
  singleGuest: GuestData | null;
  loading: boolean;
  error: string | null;
  getGuestData: (bookingOrderId: string) => Promise<void>;
  updateGuestData: (bookingOrderId: string, data: UpdateGuestDataRequest) => Promise<void>;
  getSingleGuestData: (bookingOrderId: string, guestId: string) => Promise<void>;
  updateSingleGuestData: (bookingOrderId: string, guestId: string, data: GuestData) => Promise<void>;
  clearError: () => void;
  // Helper methods
  getGuestCompletionStatus: () => { completed: number; total: number; percentage: number; isComplete: boolean; } | null;
  validateAllGuestData: () => { isValid: boolean; errors: string[] };
  formatGuestForDisplay: (guest: GuestData) => string;
}

export const useBookingOrderGuestData = (): UseBookingOrderGuestDataResult => {
  const [guestData, setGuestData] = useState<GuestDataResponse | null>(null);
  const [singleGuest, setSingleGuest] = useState<GuestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGuestData = useCallback(async (bookingOrderId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      
      const response = await bookingOrdersService.getGuestData(bookingOrderId);
      
      setGuestData(response);
    } catch (err: any) {
      console.error('❌ Failed to fetch guest data:', err);
      setError(err.message || 'Failed to fetch guest data');
      setGuestData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGuestData = useCallback(async (
    bookingOrderId: string, 
    data: UpdateGuestDataRequest
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      
      // Validate guest data before sending
      const validationErrors: string[] = [];
      
      data.items.forEach((item, itemIndex) => {
        item.guests.forEach((guest, guestIndex) => {
          const validation = bookingOrdersService.validateGuestData(guest);
          if (!validation.isValid) {
            validation.errors.forEach(error => {
              validationErrors.push(`Item ${itemIndex + 1}, Guest ${guestIndex + 1}: ${error}`);
            });
          }
        });
      });
      
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed:\n${validationErrors.join('\n')}`);
      }
      
      const response = await bookingOrdersService.updateGuestData(bookingOrderId, data);
      
      setGuestData(response);
      
    } catch (err: any) {
      console.error('❌ Failed to update guest data:', err);
      setError(err.message || 'Failed to update guest data');
    } finally {
      setLoading(false);
    }
  }, []);

  const getSingleGuestData = useCallback(async (
    bookingOrderId: string, 
    guestId: string
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      
      const guest = await bookingOrdersService.getSingleGuestData(bookingOrderId, guestId);
      
      setSingleGuest(guest);
      
    } catch (err: any) {
      console.error('❌ Failed to fetch single guest data:', err);
      setError(err.message || 'Failed to fetch guest data');
      setSingleGuest(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSingleGuestData = useCallback(async (
    bookingOrderId: string,
    guestId: string,
    data: GuestData
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      
      // Validate guest data before sending
      const validation = bookingOrdersService.validateGuestData(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      const updatedGuest = await bookingOrdersService.updateSingleGuestData(
        bookingOrderId, 
        guestId, 
        data
      );
      
      setSingleGuest(updatedGuest);
      
      // Also update the guest in the main guest data if it exists
      if (guestData) {
        const updatedGuestData = { ...guestData };
        updatedGuestData.items = updatedGuestData.items.map(item => ({
          ...item,
          guests: item.guests.map(guest => 
            guest.guest_id === guestId ? updatedGuest : guest
          )
        }));
        setGuestData(updatedGuestData);
      }
      
    } catch (err: any) {
      console.error('❌ Failed to update single guest data:', err);
      setError(err.message || 'Failed to update guest data');
    } finally {
      setLoading(false);
    }
  }, [guestData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Helper methods for guest data management
  const getGuestCompletionStatus = useCallback(() => {
    if (!guestData) return null;
    return bookingOrdersService.getGuestDataCompletionStatus(guestData);
  }, [guestData]);

  const validateAllGuestData = useCallback((): { isValid: boolean; errors: string[] } => {
    if (!guestData) {
      return { isValid: false, errors: ['No guest data available'] };
    }

    const allErrors: string[] = [];
    
    guestData.items.forEach((item, itemIndex) => {
      if (!item.guests || item.guests.length === 0) {
        allErrors.push(`Item ${itemIndex + 1}: No guests provided`);
        return;
      }
      
      if (item.guests.length !== item.quantity) {
        allErrors.push(`Item ${itemIndex + 1}: Expected ${item.quantity} guests, got ${item.guests.length}`);
      }
      
      item.guests.forEach((guest, guestIndex) => {
        const validation = bookingOrdersService.validateGuestData(guest);
        if (!validation.isValid) {
          validation.errors.forEach(error => {
            allErrors.push(`Item ${itemIndex + 1}, Guest ${guestIndex + 1}: ${error}`);
          });
        }
      });
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }, [guestData]);

  const formatGuestForDisplay = useCallback((guest: GuestData): string => {
    return bookingOrdersService.formatGuestForDisplay(guest);
  }, []);

  return {
    guestData,
    singleGuest,
    loading,
    error,
    getGuestData,
    updateGuestData,
    getSingleGuestData,
    updateSingleGuestData,
    clearError,
    // Helper methods
    getGuestCompletionStatus,
    validateAllGuestData,
    formatGuestForDisplay
  };
};