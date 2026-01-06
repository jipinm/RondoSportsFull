import { useState } from 'react';
import { apiClient, API_ENDPOINTS, type Reservation, type Guest } from '../services/apiRoutes';

interface CreateReservationData {
  items: Array<{
    ticket_id: string;
    quantity: number;
    net_rate: number;
    currency_code: string;
  }>;
}

interface UseReservationResult {
  reservation: Reservation | null;
  loading: boolean;
  error: string | null;
  createReservation: (data: CreateReservationData) => Promise<Reservation | null>;
  addGuestData: (reservationId: string, guests: Guest[]) => Promise<boolean>;
  clearReservation: () => void;
}

export const useReservation = (): UseReservationResult => {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReservation = async (data: CreateReservationData): Promise<Reservation | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post<Reservation>(API_ENDPOINTS.RESERVATIONS, data);
      const newReservation = response.data;
      
      setReservation(newReservation);
      return newReservation;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create reservation';
      setError(errorMessage);
      console.error('Reservation creation failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addGuestData = async (reservationId: string, guests: Guest[]): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const guestData = { guests };
      
      await apiClient.post(`${API_ENDPOINTS.RESERVATIONS}/${reservationId}/guests`, guestData);
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to add guest data';
      setError(errorMessage);
      console.error('Guest data addition failed:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearReservation = () => {
    setReservation(null);
    setError(null);
  };

  return {
    reservation,
    loading,
    error,
    createReservation,
    addGuestData,
    clearReservation,
  };
};
