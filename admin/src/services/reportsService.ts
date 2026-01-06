import { apiClient } from './api-client';
import type {
  ReportFilter,
  RevenueReportData,
  BookingsReportData,
  UserActivityReportData,
  ReportApiResponse,
  ReportType,
} from '../types/reports';

/**
 * Reports Service
 * Handles all API calls related to reports
 */
class ReportsService {
  /**
   * Fetch revenue report data
   */
  async getRevenueReport(filter: ReportFilter): Promise<RevenueReportData> {
    try {
      const params = new URLSearchParams({
        start_date: filter.startDate,
        end_date: filter.endDate,
        time_frame: filter.timeFrame,
      });

      console.log('Fetching revenue report with params:', {
        start_date: filter.startDate,
        end_date: filter.endDate,
        time_frame: filter.timeFrame,
      });

      const response = await apiClient.get<ReportApiResponse<RevenueReportData>>(
        `/admin/reports/revenue?${params.toString()}`
      );

      console.log('Revenue report API response:', response);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch revenue report');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching revenue report:', error);
      throw error;
    }
  }

  /**
   * Fetch bookings report data
   */
  async getBookingsReport(filter: ReportFilter): Promise<BookingsReportData> {
    try {
      const params = new URLSearchParams({
        start_date: filter.startDate,
        end_date: filter.endDate,
        time_frame: filter.timeFrame,
      });

      console.log('Fetching bookings report with params:', {
        start_date: filter.startDate,
        end_date: filter.endDate,
        time_frame: filter.timeFrame,
      });

      const response = await apiClient.get<ReportApiResponse<BookingsReportData>>(
        `/admin/reports/bookings?${params.toString()}`
      );

      console.log('Bookings report API response:', response);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch bookings report');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching bookings report:', error);
      throw error;
    }
  }

  /**
   * Fetch user activity report data
   */
  async getUserActivityReport(filter: ReportFilter): Promise<UserActivityReportData> {
    try {
      const params = new URLSearchParams({
        start_date: filter.startDate,
        end_date: filter.endDate,
      });

      const response = await apiClient.get<ReportApiResponse<UserActivityReportData>>(
        `/admin/reports/users?${params.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user activity report');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching user activity report:', error);
      throw error;
    }
  }

  /**
   * Export report as CSV
   */
  async exportReport(
    reportType: ReportType,
    startDate: string,
    endDate: string
  ): Promise<void> {
    try {
      const params = new URLSearchParams({
        type: reportType,
        start_date: startDate,
        end_date: endDate,
        format: 'csv',
      });

      // Construct the URL for download
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const url = `${apiUrl}/admin/reports/export?${params.toString()}`;

      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_report_${startDate}_to_${endDate}.csv`;
      
      // Add authorization header by opening URL with fetch and creating blob
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }

  /**
   * Format currency value
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }

  /**
   * Format percentage value
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  /**
   * Format number with commas
   */
  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Get default date range (last 30 days)
   */
  getDefaultDateRange(): { startDate: string; endDate: string } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }
}

export const reportsService = new ReportsService();
export default reportsService;
