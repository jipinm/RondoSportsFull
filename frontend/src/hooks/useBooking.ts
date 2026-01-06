import { useState } from 'react';
import { apiClient, API_ENDPOINTS, type Booking } from '../services/apiRoutes';

interface CreateBookingData {
  reservation_id: string;
  booking_email: string;
  invoice_reference: string;
  booking_reference: string;
  payment_method: string;
}

interface UseBookingResult {
  booking: Booking | null;
  loading: boolean;
  error: string | null;
  createBooking: (data: CreateBookingData) => Promise<Booking | null>;
  clearBooking: () => void;
}

export const useBooking = (): UseBookingResult => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBooking = async (data: CreateBookingData): Promise<Booking | null> => {
    try {
      setLoading(true);
      setError(null);
      
      
      const response = await apiClient.post<Booking>(API_ENDPOINTS.BOOKINGS, data);
      
      
      const newBooking = response.data;
      setBooking(newBooking);
      return newBooking;
    } catch (err: any) {
      
      // Try to get more details from the error
      if (err?.response) {
      }
      
      const errorMessage = err?.message || 'Failed to create booking';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearBooking = () => {
    setBooking(null);
    setError(null);
  };

  return {
    booking,
    loading,
    error,
    createBooking,
    clearBooking,
  };
};
