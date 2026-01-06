/**
 * Reports Types
 * Type definitions for the Reports page data structures
 */

/**
 * Report filter parameters
 */
export interface ReportFilter {
  startDate: string;
  endDate: string;
  reportType: 'revenue' | 'bookings' | 'users';
  timeFrame: 'daily' | 'weekly' | 'monthly';
}

/**
 * Revenue Report Data
 */
export interface RevenueReportData {
  summary: {
    total_revenue: number;
    avg_order_value: number;
    refund_rate: number;
    total_bookings: number;
    refunded_amount: number;
  };
  trend: Array<{
    date: string;
    amount: number;
  }>;
  monthly: Array<{
    month: string;
    revenue: number;
    bookings?: number;
  }>;
}

/**
 * Bookings Report Data
 */
export interface BookingsReportData {
  summary: {
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    cancellation_rate: number;
    pending_bookings: number;
  };
  trend: Array<{
    date: string;
    count: number;
  }>;
  event_performance: Array<{
    name: string;
    bookings: number;
    revenue: number;
  }>;
  top_events: Array<{
    name: string;
    bookings: number;
    revenue: number;
  }>;
}

/**
 * User Activity Report Data
 */
export interface UserActivityReportData {
  summary: {
    total_users: number;
    active_users: number;
    inactive_users: number;
    new_users_30d: number;
    suspended_users: number;
  };
  user_status_breakdown: Array<{
    name: string;
    value: number;
  }>;
  booking_frequency: Array<{
    name: string;
    value: number;
  }>;
  acquisition_trend: Array<{
    date: string;
    value: number;
  }>;
}

/**
 * API Response Types
 */
export interface ReportApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Export format types
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Report type enum
 */
export type ReportType = 'revenue' | 'bookings' | 'users';

/**
 * Time frame enum
 */
export type TimeFrame = 'daily' | 'weekly' | 'monthly';
