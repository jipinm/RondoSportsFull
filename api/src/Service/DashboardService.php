<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use XS2EventProxy\Repository\BookingRepository;
use Psr\Log\LoggerInterface;
use Exception;

/**
 * Dashboard Service
 * 
 * Provides comprehensive dashboard data including statistics, trends, and recent activities
 */
class DashboardService
{
    private BookingRepository $bookingRepository;
    private LoggerInterface $logger;

    public function __construct(
        BookingRepository $bookingRepository,
        LoggerInterface $logger
    ) {
        $this->bookingRepository = $bookingRepository;
        $this->logger = $logger;
    }

    /**
     * Get comprehensive dashboard data
     * 
     * @return array Complete dashboard data including statistics, charts, and activities
     * @throws Exception
     */
    public function getDashboardData(): array
    {
        try {
            $this->logger->info('Fetching dashboard data');

            // Get base statistics
            $baseStats = $this->bookingRepository->getBookingStats();

            // Get period-specific counts
            $todayBookings = $this->bookingRepository->getBookingsToday();
            $yesterdayBookings = $this->bookingRepository->getBookingsYesterday();
            $weekBookings = $this->bookingRepository->getBookingsThisWeek();
            $previousWeekBookings = $this->bookingRepository->getBookingsPreviousWeek();
            $monthBookings = $this->bookingRepository->getBookingsThisMonth();
            $previousMonthBookings = $this->bookingRepository->getBookingsPreviousMonth();

            // Calculate trends (compare with previous periods)
            $todayTrend = $this->calculatePercentageChange($yesterdayBookings, $todayBookings);
            $weekTrend = $this->calculatePercentageChange($previousWeekBookings, $weekBookings);
            $monthTrend = $this->calculatePercentageChange($previousMonthBookings, $monthBookings);

            // Calculate revenue trend
            $previousMonthRevenue = $this->bookingRepository->getRevenuePreviousMonth();
            $revenueTrendPercentage = $this->calculatePercentageChange($previousMonthRevenue, $baseStats['total_revenue']);

            // Get chart data
            $bookingsTrendData = $this->bookingRepository->getBookingsTrend(30);
            $revenueTrendData = $this->bookingRepository->getRevenueTrend(30);
            $topEvents = $this->bookingRepository->getTopEventsByBookings(5);

            // Get recent activities
            $recentActivities = $this->bookingRepository->getRecentActivities(10);

            $dashboardData = [
                'statistics' => [
                    'today_bookings' => $todayBookings,
                    'today_bookings_trend' => $todayTrend,
                    'week_bookings' => $weekBookings,
                    'week_bookings_trend' => $weekTrend,
                    'month_bookings' => $monthBookings,
                    'month_bookings_trend' => $monthTrend,
                    'total_revenue' => $baseStats['total_revenue'],
                    'total_revenue_trend' => $revenueTrendPercentage,
                    'confirmed_bookings' => $baseStats['confirmed_bookings'],
                    'pending_bookings' => $baseStats['pending_bookings'],
                    'cancelled_bookings' => $baseStats['cancelled_bookings'],
                    'refunded_bookings' => $baseStats['refunded_bookings'],
                    'avg_booking_value' => $baseStats['avg_booking_value']
                ],
                'charts' => [
                    'bookings_over_time' => $bookingsTrendData,
                    'revenue_trend' => $revenueTrendData,
                    'top_events' => $topEvents
                ],
                'recent_activities' => $recentActivities
            ];

            $this->logger->info('Dashboard data fetched successfully', [
                'today_bookings' => $todayBookings,
                'yesterday_bookings' => $yesterdayBookings,
                'week_bookings' => $weekBookings,
                'month_bookings' => $monthBookings,
                'total_revenue' => $baseStats['total_revenue'],
                'today_trend' => $todayTrend,
                'week_trend' => $weekTrend,
                'month_trend' => $monthTrend
            ]);

            return $dashboardData;

        } catch (Exception $e) {
            $this->logger->error('Error fetching dashboard data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw new Exception('Failed to fetch dashboard data: ' . $e->getMessage());
        }
    }

    /**
     * Calculate percentage change between two values
     * 
     * @param float|int $previousValue Previous period value
     * @param float|int $currentValue Current period value
     * @return float|null Percentage change or null if cannot calculate
     */
    private function calculatePercentageChange($previousValue, $currentValue): ?float
    {
        try {
            // If both values are zero, no change
            if ($previousValue == 0 && $currentValue == 0) {
                return null;
            }

            // If previous value is zero but current is not, it's a 100% increase
            if ($previousValue == 0 && $currentValue > 0) {
                return 100.0;
            }

            // If previous value is zero and current is negative (shouldn't happen with bookings)
            if ($previousValue == 0) {
                return null;
            }

            // Calculate percentage change
            $change = (($currentValue - $previousValue) / $previousValue) * 100;
            return round($change, 1);

        } catch (Exception $e) {
            $this->logger->warning('Could not calculate percentage change', [
                'previous_value' => $previousValue,
                'current_value' => $currentValue,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get statistics for a specific date range
     * 
     * @param string $startDate Start date (YYYY-MM-DD)
     * @param string $endDate End date (YYYY-MM-DD)
     * @return array Statistics for the date range
     */
    public function getStatisticsForDateRange(string $startDate, string $endDate): array
    {
        try {
            $this->logger->info('Fetching statistics for date range', [
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);

            // This can be extended to support custom date ranges
            // For now, return the standard dashboard data
            return $this->getDashboardData();

        } catch (Exception $e) {
            $this->logger->error('Error fetching statistics for date range', [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to fetch statistics for date range: ' . $e->getMessage());
        }
    }
}
