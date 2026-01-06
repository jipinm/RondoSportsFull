/**
 * useBookingOrders Hook
 * React hook for managing booking orders and their operations
 */

import { useState, useCallback } from 'react';
import { bookingOrdersService } from '../services/bookingOrdersService';
import type {
  BookingOrderListItem,
  BookingOrder,
  BookingOrdersQueryParams,
  UseBookingOrdersResult,
  Pagination
} from '../types/xs2event';

export const useBookingOrders = (): UseBookingOrdersResult => {
  const [bookingOrders, setBookingOrders] = useState<BookingOrderListItem[]>([]);
  const [currentBookingOrder, setCurrentBookingOrder] = useState<BookingOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | undefined>(undefined);

  const getBookingOrders = useCallback(async (params?: BookingOrdersQueryParams): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      
      const response = await bookingOrdersService.getBookingOrders(params);
      
      setBookingOrders(response.bookingorders || []);
      setPagination(response.pagination);
      
    } catch (err: any) {
      console.error('❌ Failed to fetch booking orders:', err);
      setError(err.message || 'Failed to fetch booking orders');
      setBookingOrders([]);
      setPagination(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  const getBookingOrder = useCallback(async (bookingOrderId: string): Promise<BookingOrder | null> => {
    try {
      setLoading(true);
      setError(null);
      
      
      const bookingOrder = await bookingOrdersService.getBookingOrder(bookingOrderId);
      
      setCurrentBookingOrder(bookingOrder);
      
      
      return bookingOrder;
    } catch (err: any) {
      console.error('❌ Failed to fetch booking order:', err);
      setError(err.message || 'Failed to fetch booking order');
      setCurrentBookingOrder(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    bookingOrders,
    currentBookingOrder,
    loading,
    error,
    pagination,
    getBookingOrders,
    getBookingOrder,
    clearError
  };
};