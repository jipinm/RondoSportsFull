/**
 * Dashboard API Service
 * 
 * Handles all dashboard-related API operations
 */

import { apiClient } from './api-client';
import type { DashboardData, DashboardApiResponse } from '../types/dashboard';

class DashboardService {
  /**
   * Fetch comprehensive dashboard data
   * 
   * @returns Promise<DashboardData> Complete dashboard data
   * @throws Error if API call fails
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await apiClient.get<DashboardApiResponse>('/admin/dashboard');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard data');
      }
      
      return response.data;
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch dashboard data');
    }
  }

  /**
   * Fetch dashboard statistics for a custom date range
   * 
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate End date in YYYY-MM-DD format
   * @returns Promise<DashboardData> Dashboard data for the specified range
   * @throws Error if API call fails
   */
  async getStatisticsForDateRange(startDate: string, endDate: string): Promise<DashboardData> {
    try {
      const response = await apiClient.get<DashboardApiResponse>(
        `/admin/dashboard/stats?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard statistics');
      }
      
      return response.data;
    } catch (error) {
      console.error('Dashboard stats fetch error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  /**
   * Format a relative time string (e.g., "5 minutes ago")
   * 
   * @param isoDateString ISO datetime string
   * @returns string Relative time string
   */
  formatRelativeTime(isoDateString: string): string {
    const now = new Date();
    const date = new Date(isoDateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  }

  /**
   * Format currency amount
   * 
   * @param amount Numeric amount
   * @param currency Currency code (default: USD)
   * @returns string Formatted currency string
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date for chart display
   * 
   * @param dateString Date string in YYYY-MM-DD format
   * @returns string Formatted date (e.g., "Oct 21")
   */
  formatChartDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
export default dashboardService;
