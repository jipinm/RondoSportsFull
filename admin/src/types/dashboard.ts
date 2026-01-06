/**
 * Dashboard TypeScript Types
 * 
 * Type definitions for dashboard data structures including statistics, trends, and activities
 */

/**
 * Dashboard Statistics
 */
export interface DashboardStatistics {
  today_bookings: number;
  today_bookings_trend?: number | null; // percentage change
  week_bookings: number;
  week_bookings_trend?: number | null;
  month_bookings: number;
  month_bookings_trend?: number | null;
  total_revenue: number;
  total_revenue_trend?: number | null;
  confirmed_bookings?: number;
  pending_bookings?: number;
  cancelled_bookings?: number;
  refunded_bookings?: number;
  avg_booking_value?: number;
}

/**
 * Booking Trend Data Point
 */
export interface BookingTrendData {
  date: string; // YYYY-MM-DD
  count: number;
}

/**
 * Revenue Trend Data Point
 */
export interface RevenueTrendData {
  date: string; // YYYY-MM-DD
  amount: number;
}

/**
 * Top Event by Bookings
 */
export interface TopEvent {
  name: string;
  bookings: number;
}

/**
 * Recent Activity Item
 */
export interface RecentActivity {
  id: string;
  type: 'booking' | 'refund' | 'registration' | 'cancellation';
  title: string;
  description: string;
  time: string; // ISO datetime string
  icon?: string;
}

/**
 * Dashboard Chart Data
 */
export interface DashboardCharts {
  bookings_over_time: BookingTrendData[];
  revenue_trend: RevenueTrendData[];
  top_events: TopEvent[];
}

/**
 * Complete Dashboard Data
 */
export interface DashboardData {
  statistics: DashboardStatistics;
  charts: DashboardCharts;
  recent_activities: RecentActivity[];
}

/**
 * Dashboard API Response
 */
export interface DashboardApiResponse {
  success: boolean;
  data: DashboardData;
  error?: string;
}
