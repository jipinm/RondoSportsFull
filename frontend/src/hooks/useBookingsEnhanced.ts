/**
 * useBookings Hook (Enhanced)
 * Enhanced React hook for managing bookings with all XS2Event endpoints
 */

import { useState, useCallback } from 'react';
import { bookingsService } from '../services/bookingsService';
import type {
  Booking,
  BookingsResponse,
  BookingsQueryParams,
  UseBookingsResult,
  Pagination
} from '../types/xs2event';

export const useBookings = (): UseBookingsResult => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | undefined>(undefined);

  const getBookings = useCallback(async (params?: BookingsQueryParams): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      
      const response: BookingsResponse = await bookingsService.getBookings(params);
      
      setBookings(response.bookings || []);
      setPagination(response.pagination);
      
    } catch (err: any) {
      console.error('❌ Failed to fetch bookings:', err);
      setError(err.message || 'Failed to fetch bookings');
      setBookings([]);
      setPagination(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  const getBooking = useCallback(async (bookingId: string): Promise<Booking | null> => {
    try {
      setLoading(true);
      setError(null);
      
      
      const booking = await bookingsService.getBooking(bookingId);
      
      
      return booking;
    } catch (err: any) {
      console.error('❌ Failed to fetch booking:', err);
      setError(err.message || 'Failed to fetch booking');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBookingsByReservation = useCallback(async (reservationId: string): Promise<Booking | null> => {
    try {
      setLoading(true);
      setError(null);
      
      
      const booking = await bookingsService.getBookingsByReservation(reservationId);
      
      
      return booking;
    } catch (err: any) {
      console.error('❌ Failed to fetch bookings by reservation:', err);
      setError(err.message || 'Failed to fetch bookings by reservation');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Additional helper methods
  const getBookingStatusDisplay = useCallback((booking: Booking) => {
    return bookingsService.getBookingStatusDisplay(booking);
  }, []);

  const formatBookingForDisplay = useCallback((booking: Booking) => {
    return bookingsService.formatBookingForDisplay(booking);
  }, []);

  const calculateBookingTotal = useCallback((booking: Booking) => {
    return bookingsService.calculateBookingTotal(booking);
  }, []);

  const hasETickets = useCallback((booking: Booking) => {
    return bookingsService.hasETickets(booking);
  }, []);

  const getQuickFilters = useCallback(() => {
    return bookingsService.buildQuickFilters();
  }, []);

  return {
    bookings,
    loading,
    error,
    pagination,
    getBookings,
    getBooking,
    getBookingsByReservation,
    clearError,
    // Helper methods
    getBookingStatusDisplay,
    formatBookingForDisplay,
    calculateBookingTotal,
    hasETickets,
    getQuickFilters
  };
};