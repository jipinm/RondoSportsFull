<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use XS2EventProxy\Repository\BookingRepository;
use XS2EventProxy\Repository\CustomerRepository;
use Psr\Log\LoggerInterface;
use Exception;

/**
 * Reports Service - Aggregates data from multiple repositories for reports
 */
class ReportsService
{
    private BookingRepository $bookingRepository;
    private CustomerRepository $customerRepository;
    private LoggerInterface $logger;

    public function __construct(
        BookingRepository $bookingRepository,
        CustomerRepository $customerRepository,
        LoggerInterface $logger
    ) {
        $this->bookingRepository = $bookingRepository;
        $this->customerRepository = $customerRepository;
        $this->logger = $logger;
    }

    /**
     * Get revenue report data
     * 
     * @param string $startDate Start date (YYYY-MM-DD)
     * @param string $endDate End date (YYYY-MM-DD)
     * @param string $timeFrame Time frame: daily, weekly, or monthly
     * @return array Revenue report data
     */
    public function getRevenueReport(string $startDate, string $endDate, string $timeFrame = 'daily'): array
    {
        try {
            $this->logger->info('Fetching revenue report', [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'time_frame' => $timeFrame
            ]);

            // Get revenue statistics
            $revenueStats = $this->bookingRepository->getRevenueStatsForDateRange($startDate, $endDate);

            // Get revenue trend based on time frame
            $days = $this->calculateDaysDifference($startDate, $endDate);
            $revenueTrend = $this->bookingRepository->getRevenueTrend($days);

            // Get monthly revenue breakdown
            $monthlyRevenue = $this->bookingRepository->getRevenueByMonth($startDate, $endDate);

            return [
                'summary' => [
                    'total_revenue' => $revenueStats['total_revenue'],
                    'avg_order_value' => $revenueStats['avg_order_value'],
                    'refund_rate' => $revenueStats['refund_rate'],
                    'total_bookings' => $revenueStats['total_bookings'],
                    'refunded_amount' => $revenueStats['refunded_amount']
                ],
                'trend' => $this->formatTrendData($revenueTrend, 'amount'),
                'monthly' => $this->formatMonthlyData($monthlyRevenue)
            ];

        } catch (Exception $e) {
            $this->logger->error('Error fetching revenue report', [
                'error' => $e->getMessage(),
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            throw $e;
        }
    }

    /**
     * Get bookings report data
     * 
     * @param string $startDate Start date (YYYY-MM-DD)
     * @param string $endDate End date (YYYY-MM-DD)
     * @param string $timeFrame Time frame: daily, weekly, or monthly
     * @return array Bookings report data
     */
    public function getBookingsReport(string $startDate, string $endDate, string $timeFrame = 'daily'): array
    {
        try {
            $this->logger->info('Fetching bookings report', [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'time_frame' => $timeFrame
            ]);

            // Get booking statistics
            $bookingStats = $this->bookingRepository->getBookingStatsForDateRange($startDate, $endDate);

            // Calculate cancellation rate
            $totalBookings = $bookingStats['total_bookings'];
            $cancelledBookings = $bookingStats['cancelled_bookings'];
            $cancellationRate = $totalBookings > 0 
                ? round(($cancelledBookings / $totalBookings) * 100, 2) 
                : 0;

            // Get bookings trend
            $days = $this->calculateDaysDifference($startDate, $endDate);
            $bookingsTrend = $this->bookingRepository->getBookingsTrend($days);

            // Get event performance (top 10 events)
            $eventPerformance = $this->bookingRepository->getEventPerformance(10, $startDate, $endDate);

            // Get top 5 events for the table
            $topEvents = $this->bookingRepository->getEventPerformance(5, $startDate, $endDate);

            return [
                'summary' => [
                    'total_bookings' => $bookingStats['total_bookings'],
                    'completed_bookings' => $bookingStats['confirmed_bookings'],
                    'cancelled_bookings' => $bookingStats['cancelled_bookings'],
                    'cancellation_rate' => $cancellationRate,
                    'pending_bookings' => $bookingStats['pending_bookings']
                ],
                'trend' => $this->formatTrendData($bookingsTrend, 'count'),
                'event_performance' => $eventPerformance,
                'top_events' => $topEvents
            ];

        } catch (Exception $e) {
            $this->logger->error('Error fetching bookings report', [
                'error' => $e->getMessage(),
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            throw $e;
        }
    }

    /**
     * Get user activity report data
     * 
     * @param string $startDate Start date (YYYY-MM-DD)
     * @param string $endDate End date (YYYY-MM-DD)
     * @return array User activity report data
     */
    public function getUserActivityReport(string $startDate, string $endDate): array
    {
        try {
            $this->logger->info('Fetching user activity report', [
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);

            // Get customer statistics
            $customerStats = $this->customerRepository->getCustomerStatsForDateRange($startDate, $endDate);

            // Get customer acquisition trend (last 6 months)
            $acquisitionTrend = $this->customerRepository->getCustomerAcquisitionTrend(6);

            // Get customer booking frequency
            $bookingFrequency = $this->customerRepository->getCustomerBookingFrequency();

            // Build user status breakdown for pie chart
            $userStatusBreakdown = [
                [
                    'name' => 'Active Users',
                    'value' => $customerStats['active_users']
                ],
                [
                    'name' => 'Inactive Users',
                    'value' => $customerStats['inactive_users']
                ],
                [
                    'name' => 'New Users (30d)',
                    'value' => $customerStats['new_users_30d']
                ]
            ];

            return [
                'summary' => [
                    'total_users' => $customerStats['total_users'],
                    'active_users' => $customerStats['active_users'],
                    'inactive_users' => $customerStats['inactive_users'],
                    'new_users_30d' => $customerStats['new_users_30d'],
                    'suspended_users' => $customerStats['suspended_users']
                ],
                'user_status_breakdown' => $userStatusBreakdown,
                'booking_frequency' => $bookingFrequency,
                'acquisition_trend' => $acquisitionTrend
            ];

        } catch (Exception $e) {
            $this->logger->error('Error fetching user activity report', [
                'error' => $e->getMessage(),
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            throw $e;
        }
    }

    /**
     * Export report data as CSV
     * 
     * @param string $reportType Type of report: revenue, bookings, or users
     * @param string $startDate Start date (YYYY-MM-DD)
     * @param string $endDate End date (YYYY-MM-DD)
     * @return string CSV content
     */
    public function exportReportCSV(string $reportType, string $startDate, string $endDate): string
    {
        try {
            $this->logger->info('Exporting report as CSV', [
                'report_type' => $reportType,
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);

            switch ($reportType) {
                case 'revenue':
                    return $this->exportRevenueCsv($startDate, $endDate);
                case 'bookings':
                    return $this->exportBookingsCsv($startDate, $endDate);
                case 'users':
                    return $this->exportUsersCsv($startDate, $endDate);
                default:
                    throw new Exception("Invalid report type: {$reportType}");
            }

        } catch (Exception $e) {
            $this->logger->error('Error exporting report', [
                'error' => $e->getMessage(),
                'report_type' => $reportType
            ]);
            throw $e;
        }
    }

    /**
     * Export revenue report as CSV
     */
    private function exportRevenueCsv(string $startDate, string $endDate): string
    {
        $report = $this->getRevenueReport($startDate, $endDate);
        
        $csv = "Revenue Report - {$startDate} to {$endDate}\n\n";
        $csv .= "Summary\n";
        $csv .= "Metric,Value\n";
        $csv .= "Total Revenue,\${$report['summary']['total_revenue']}\n";
        $csv .= "Average Order Value,\${$report['summary']['avg_order_value']}\n";
        $csv .= "Refund Rate,{$report['summary']['refund_rate']}%\n";
        $csv .= "Total Bookings,{$report['summary']['total_bookings']}\n";
        $csv .= "Refunded Amount,\${$report['summary']['refunded_amount']}\n";
        $csv .= "\n\nRevenue Trend\n";
        $csv .= "Date,Amount\n";
        
        foreach ($report['trend'] as $item) {
            $csv .= "{$item['date']},\${$item['amount']}\n";
        }
        
        $csv .= "\n\nMonthly Revenue\n";
        $csv .= "Month,Revenue,Bookings\n";
        
        foreach ($report['monthly'] as $item) {
            $csv .= "{$item['month']},\${$item['revenue']},{$item['bookings']}\n";
        }
        
        return $csv;
    }

    /**
     * Export bookings report as CSV
     */
    private function exportBookingsCsv(string $startDate, string $endDate): string
    {
        $report = $this->getBookingsReport($startDate, $endDate);
        
        $csv = "Bookings Report - {$startDate} to {$endDate}\n\n";
        $csv .= "Summary\n";
        $csv .= "Metric,Value\n";
        $csv .= "Total Bookings,{$report['summary']['total_bookings']}\n";
        $csv .= "Completed Bookings,{$report['summary']['completed_bookings']}\n";
        $csv .= "Cancelled Bookings,{$report['summary']['cancelled_bookings']}\n";
        $csv .= "Cancellation Rate,{$report['summary']['cancellation_rate']}%\n";
        $csv .= "Pending Bookings,{$report['summary']['pending_bookings']}\n";
        $csv .= "\n\nBookings Trend\n";
        $csv .= "Date,Count\n";
        
        foreach ($report['trend'] as $item) {
            $csv .= "{$item['date']},{$item['count']}\n";
        }
        
        $csv .= "\n\nTop Events\n";
        $csv .= "Event Name,Bookings,Revenue\n";
        
        foreach ($report['top_events'] as $event) {
            $csv .= "{$event['name']},{$event['bookings']},\${$event['revenue']}\n";
        }
        
        return $csv;
    }

    /**
     * Export users report as CSV
     */
    private function exportUsersCsv(string $startDate, string $endDate): string
    {
        $report = $this->getUserActivityReport($startDate, $endDate);
        
        $csv = "User Activity Report - {$startDate} to {$endDate}\n\n";
        $csv .= "Summary\n";
        $csv .= "Metric,Value\n";
        $csv .= "Total Users,{$report['summary']['total_users']}\n";
        $csv .= "Active Users,{$report['summary']['active_users']}\n";
        $csv .= "Inactive Users,{$report['summary']['inactive_users']}\n";
        $csv .= "New Users (30d),{$report['summary']['new_users_30d']}\n";
        $csv .= "Suspended Users,{$report['summary']['suspended_users']}\n";
        $csv .= "\n\nUser Status Breakdown\n";
        $csv .= "Status,Count\n";
        
        foreach ($report['user_status_breakdown'] as $status) {
            $csv .= "{$status['name']},{$status['value']}\n";
        }
        
        $csv .= "\n\nBooking Frequency\n";
        $csv .= "Range,Users\n";
        
        foreach ($report['booking_frequency'] as $freq) {
            $csv .= "{$freq['name']},{$freq['value']}\n";
        }
        
        $csv .= "\n\nAcquisition Trend\n";
        $csv .= "Month,New Users\n";
        
        foreach ($report['acquisition_trend'] as $item) {
            $csv .= "{$item['date']},{$item['value']}\n";
        }
        
        return $csv;
    }

    /**
     * Calculate days difference between two dates
     */
    private function calculateDaysDifference(string $startDate, string $endDate): int
    {
        $start = new \DateTime($startDate);
        $end = new \DateTime($endDate);
        $diff = $start->diff($end);
        return (int)$diff->days;
    }

    /**
     * Format trend data for response
     */
    private function formatTrendData(array $trend, string $valueKey): array
    {
        return array_map(function($item) use ($valueKey) {
            return [
                'date' => $item['date'],
                $valueKey => $item[$valueKey]
            ];
        }, $trend);
    }

    /**
     * Format monthly data for response
     */
    private function formatMonthlyData(array $monthly): array
    {
        return array_map(function($item) {
            return [
                'month' => $item['month'],
                'revenue' => $item['revenue'],
                'bookings' => $item['bookings'] ?? 0
            ];
        }, $monthly);
    }
}
