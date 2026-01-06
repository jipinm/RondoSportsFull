<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Response;
use XS2EventProxy\Service\DashboardService;
use Psr\Log\LoggerInterface;
use Exception;

/**
 * Dashboard Controller
 * 
 * Handles dashboard data endpoints for the admin panel
 */
class DashboardController
{
    private DashboardService $dashboardService;
    private LoggerInterface $logger;

    public function __construct(
        DashboardService $dashboardService,
        LoggerInterface $logger
    ) {
        $this->dashboardService = $dashboardService;
        $this->logger = $logger;
    }

    /**
     * Get comprehensive dashboard data
     * GET /admin/dashboard
     * 
     * @param Request $request HTTP request
     * @param Response $response HTTP response
     * @return ResponseInterface JSON response with dashboard data
     */
    public function getDashboard(Request $request, Response $response): ResponseInterface
    {
        try {
            $adminUser = $request->getAttribute('user');

            if (!$adminUser) {
                $this->logger->warning('Unauthorized dashboard access attempt');
                return $this->errorResponse($response, 'Unauthorized access', null, 401);
            }

            $this->logger->info('Dashboard data requested', [
                'admin_user_id' => $adminUser['id'] ?? null,
                'admin_email' => $adminUser['email'] ?? null
            ]);

            // Get dashboard data from service
            $dashboardData = $this->dashboardService->getDashboardData();

            $this->logger->info('Dashboard data delivered successfully', [
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->successResponse($response, $dashboardData);

        } catch (Exception $e) {
            $this->logger->error('Dashboard fetch error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse(
                $response,
                'Failed to fetch dashboard data',
                ['details' => $e->getMessage()],
                500
            );
        }
    }

    /**
     * Get dashboard statistics for a specific date range
     * GET /admin/dashboard/stats?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
     * 
     * @param Request $request HTTP request
     * @param Response $response HTTP response
     * @return ResponseInterface JSON response with statistics
     */
    public function getStatisticsForDateRange(Request $request, Response $response): ResponseInterface
    {
        try {
            $adminUser = $request->getAttribute('user');

            if (!$adminUser) {
                $this->logger->warning('Unauthorized stats access attempt');
                return $this->errorResponse($response, 'Unauthorized access', null, 401);
            }

            $queryParams = $request->getQueryParams();
            $startDate = $queryParams['start_date'] ?? date('Y-m-01'); // First day of current month
            $endDate = $queryParams['end_date'] ?? date('Y-m-d'); // Today

            // Validate date format
            if (!$this->isValidDate($startDate) || !$this->isValidDate($endDate)) {
                return $this->errorResponse($response, 'Invalid date format. Use YYYY-MM-DD', null, 400);
            }

            $this->logger->info('Dashboard stats requested for date range', [
                'admin_user_id' => $adminUser['id'] ?? null,
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);

            $statistics = $this->dashboardService->getStatisticsForDateRange($startDate, $endDate);

            return $this->successResponse($response, $statistics);

        } catch (Exception $e) {
            $this->logger->error('Dashboard stats fetch error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->errorResponse(
                $response,
                'Failed to fetch dashboard statistics',
                ['details' => $e->getMessage()],
                500
            );
        }
    }

    /**
     * Validate date format (YYYY-MM-DD)
     * 
     * @param string $date Date string to validate
     * @return bool True if valid, false otherwise
     */
    private function isValidDate(string $date): bool
    {
        $dateTime = \DateTime::createFromFormat('Y-m-d', $date);
        return $dateTime && $dateTime->format('Y-m-d') === $date;
    }

    /**
     * Create a success response
     * 
     * @param Response $response Response object
     * @param mixed $data Data to return
     * @param int $statusCode HTTP status code
     * @return ResponseInterface
     */
    private function successResponse(Response $response, $data, int $statusCode = 200): ResponseInterface
    {
        $payload = json_encode([
            'success' => true,
            'data' => $data
        ]);

        $response->getBody()->write($payload);

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }

    /**
     * Create an error response
     * 
     * @param Response $response Response object
     * @param string $message Error message
     * @param mixed $errors Additional error details
     * @param int $statusCode HTTP status code
     * @return ResponseInterface
     */
    private function errorResponse(
        Response $response,
        string $message,
        $errors = null,
        int $statusCode = 400
    ): ResponseInterface {
        $payload = [
            'success' => false,
            'error' => $message
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        $response->getBody()->write(json_encode($payload));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }
}
