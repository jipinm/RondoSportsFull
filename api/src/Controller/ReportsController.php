<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Response;
use XS2EventProxy\Service\ReportsService;
use Psr\Log\LoggerInterface;
use Exception;

/**
 * Reports Controller - Handles report endpoints
 */
class ReportsController
{
    private ReportsService $reportsService;
    private LoggerInterface $logger;

    public function __construct(ReportsService $reportsService, LoggerInterface $logger)
    {
        $this->reportsService = $reportsService;
        $this->logger = $logger;
    }

    /**
     * GET /admin/reports/revenue
     * Get revenue report data
     */
    public function getRevenueReport(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            
            // Validate required parameters
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;
            $timeFrame = $queryParams['time_frame'] ?? 'daily';

            if (!$startDate || !$endDate) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'start_date and end_date are required'
                ], 400);
            }

            // Validate date format
            if (!$this->isValidDate($startDate) || !$this->isValidDate($endDate)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid date format. Use YYYY-MM-DD'
                ], 400);
            }

            // Validate time frame
            if (!in_array($timeFrame, ['daily', 'weekly', 'monthly'])) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid time_frame. Use: daily, weekly, or monthly'
                ], 400);
            }

            $data = $this->reportsService->getRevenueReport($startDate, $endDate, $timeFrame);

            return $this->jsonResponse($response, [
                'success' => true,
                'data' => $data
            ]);

        } catch (Exception $e) {
            $this->logger->error('Error in getRevenueReport', [
                'error' => $e->getMessage()
            ]);

            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to fetch revenue report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /admin/reports/bookings
     * Get bookings report data
     */
    public function getBookingsReport(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            
            // Validate required parameters
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;
            $timeFrame = $queryParams['time_frame'] ?? 'daily';

            if (!$startDate || !$endDate) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'start_date and end_date are required'
                ], 400);
            }

            // Validate date format
            if (!$this->isValidDate($startDate) || !$this->isValidDate($endDate)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid date format. Use YYYY-MM-DD'
                ], 400);
            }

            // Validate time frame
            if (!in_array($timeFrame, ['daily', 'weekly', 'monthly'])) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid time_frame. Use: daily, weekly, or monthly'
                ], 400);
            }

            $data = $this->reportsService->getBookingsReport($startDate, $endDate, $timeFrame);

            return $this->jsonResponse($response, [
                'success' => true,
                'data' => $data
            ]);

        } catch (Exception $e) {
            $this->logger->error('Error in getBookingsReport', [
                'error' => $e->getMessage()
            ]);

            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to fetch bookings report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /admin/reports/users
     * Get user activity report data
     */
    public function getUserActivityReport(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            
            // Validate required parameters
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;

            if (!$startDate || !$endDate) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'start_date and end_date are required'
                ], 400);
            }

            // Validate date format
            if (!$this->isValidDate($startDate) || !$this->isValidDate($endDate)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid date format. Use YYYY-MM-DD'
                ], 400);
            }

            $data = $this->reportsService->getUserActivityReport($startDate, $endDate);

            return $this->jsonResponse($response, [
                'success' => true,
                'data' => $data
            ]);

        } catch (Exception $e) {
            $this->logger->error('Error in getUserActivityReport', [
                'error' => $e->getMessage()
            ]);

            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to fetch user activity report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /admin/reports/export
     * Export report as CSV
     */
    public function exportReport(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            
            // Validate required parameters
            $reportType = $queryParams['type'] ?? null;
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;
            $format = $queryParams['format'] ?? 'csv';

            if (!$reportType || !$startDate || !$endDate) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'type, start_date, and end_date are required'
                ], 400);
            }

            // Validate report type
            if (!in_array($reportType, ['revenue', 'bookings', 'users'])) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid report type. Use: revenue, bookings, or users'
                ], 400);
            }

            // Validate date format
            if (!$this->isValidDate($startDate) || !$this->isValidDate($endDate)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid date format. Use YYYY-MM-DD'
                ], 400);
            }

            // Currently only CSV is supported
            if ($format !== 'csv') {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Only CSV format is currently supported'
                ], 400);
            }

            $csvContent = $this->reportsService->exportReportCSV($reportType, $startDate, $endDate);

            // Set headers for CSV download
            $filename = "{$reportType}_report_{$startDate}_to_{$endDate}.csv";
            $response->getBody()->write($csvContent);
            
            return $response
                ->withHeader('Content-Type', 'text/csv')
                ->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->withHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
                ->withHeader('Pragma', 'no-cache')
                ->withHeader('Expires', '0');

        } catch (Exception $e) {
            $this->logger->error('Error in exportReport', [
                'error' => $e->getMessage()
            ]);

            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to export report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper method to create JSON response
     */
    private function jsonResponse(Response $response, array $data, int $status = 200): ResponseInterface
    {
        $response->getBody()->write(json_encode($data));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }

    /**
     * Validate date format (YYYY-MM-DD)
     */
    private function isValidDate(string $date): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
}
