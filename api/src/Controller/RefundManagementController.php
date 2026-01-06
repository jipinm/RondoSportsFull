<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use XS2EventProxy\Repository\RefundRepository;
use XS2EventProxy\Service\RefundValidationService;
use XS2EventProxy\Service\ActivityLoggerService;
use Psr\Log\LoggerInterface;

class RefundManagementController
{
    private RefundRepository $refundRepository;
    private RefundValidationService $validator;
    private ActivityLoggerService $activityLogger;
    private LoggerInterface $logger;

    public function __construct(
        RefundRepository $refundRepository,
        RefundValidationService $validator,
        ActivityLoggerService $activityLogger,
        LoggerInterface $logger
    ) {
        $this->refundRepository = $refundRepository;
        $this->validator = $validator;
        $this->activityLogger = $activityLogger;
        $this->logger = $logger;
    }

    /**
     * Get refund requests with filtering and pagination
     * GET /admin/refunds
     */
    public function getRefundRequests(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $adminUser = $request->getAttribute('user');

            // Extract pagination parameters
            $page = max(1, (int)($queryParams['page'] ?? 1));
            $limit = min(100, max(1, (int)($queryParams['per_page'] ?? 20)));

            // Extract and validate filters
            $filters = array_intersect_key($queryParams, array_flip([
                'search', 'status', 'priority', 'start_date', 'end_date'
            ]));

            $filterValidation = $this->validator->validateRefundFilters($filters);
            if (!empty($filterValidation['errors'])) {
                return $this->errorResponse($response, 'Invalid filter parameters', $filterValidation['errors'], 400);
            }

            $filters = $filterValidation['validated_filters'];

            // Get refund requests
            $result = $this->refundRepository->getRefundRequests($filters, $page, $limit);

            // Sanitize refund data
            foreach ($result['refunds'] as &$refund) {
                $refund = $this->validator->sanitizeRefundData($refund);
            }

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'refunds.view',
                'Viewed refund requests list',
                [
                    'filters' => $filters,
                    'page' => $page,
                    'total_results' => $result['pagination']['total_items']
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result['refunds'],
                'pagination' => $result['pagination']
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching refund requests', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch refund requests', null, 500);
        }
    }

    /**
     * Get single refund request details
     * GET /admin/refunds/{id}
     */
    public function getRefundRequestById(Request $request, Response $response): ResponseInterface
    {
        try {
            $refundId = (int)$request->getAttribute('id');
            $adminUser = $request->getAttribute('user');

            if ($refundId <= 0) {
                return $this->errorResponse($response, 'Invalid refund request ID', null, 400);
            }

            $refund = $this->refundRepository->getRefundRequestById($refundId);

            if (!$refund) {
                return $this->errorResponse($response, 'Refund request not found', null, 404);
            }

            // Sanitize refund data
            $refund = $this->validator->sanitizeRefundData($refund);

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'refunds.view',
                "Viewed refund request details for {$refund['refund_reference']}",
                [
                    'refund_id' => $refundId,
                    'refund_reference' => $refund['refund_reference'],
                    'customer_name' => $refund['customer_name']
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $refund
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching refund request details', [
                'error' => $e->getMessage(),
                'refund_id' => $refundId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch refund request details', null, 500);
        }
    }

    /**
     * Update refund request status
     * PUT /admin/refunds/{id}/status
     */
    public function updateRefundStatus(Request $request, Response $response): ResponseInterface
    {
        try {
            $refundId = (int)$request->getAttribute('id');
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            if ($refundId <= 0) {
                return $this->errorResponse($response, 'Invalid refund request ID', null, 400);
            }

            // Validation
            $errors = $this->validator->validateStatusUpdate($data);
            if (!empty($errors)) {
                return $this->errorResponse($response, 'Validation failed', $errors, 400);
            }

            // Get current refund request
            $refund = $this->refundRepository->getRefundRequestById($refundId);
            if (!$refund) {
                return $this->errorResponse($response, 'Refund request not found', null, 404);
            }

            $oldStatus = $refund['status'];
            $newStatus = $data['status'];
            $adminNotes = $data['admin_notes'] ?? null;
            $rejectionReason = $data['rejection_reason'] ?? null;
            $approvedAmount = isset($data['approved_amount']) ? (float)$data['approved_amount'] : null;

            // Validate status transition
            $transitionErrors = $this->validator->validateStatusTransition($oldStatus, $newStatus);
            if (!empty($transitionErrors)) {
                return $this->errorResponse($response, 'Invalid status transition', $transitionErrors, 400);
            }

            // Additional validation for approved amount
            if ($newStatus === 'approved' && $approvedAmount !== null) {
                if ($approvedAmount > $refund['requested_amount']) {
                    return $this->errorResponse($response, 'Approved amount cannot exceed requested amount', null, 400);
                }
            }

            // Update status
            $success = $this->refundRepository->updateRefundStatus(
                $refundId, 
                $newStatus, 
                (int)$adminUser['id'], 
                $adminNotes,
                $rejectionReason,
                $approvedAmount
            );

            if (!$success) {
                return $this->errorResponse($response, 'Failed to update refund request status', null, 500);
            }

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'refunds.edit',
                "Changed refund status from '{$oldStatus}' to '{$newStatus}' for {$refund['refund_reference']}",
                [
                    'refund_id' => $refundId,
                    'refund_reference' => $refund['refund_reference'],
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'admin_notes' => $adminNotes,
                    'approved_amount' => $approvedAmount,
                    'customer_name' => $refund['customer_name']
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Refund request status updated successfully',
                'data' => [
                    'refund_id' => $refundId,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'approved_amount' => $approvedAmount
                ]
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error updating refund request status', [
                'error' => $e->getMessage(),
                'refund_id' => $refundId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to update refund request status', null, 500);
        }
    }

    /**
     * Get refund statistics
     * GET /admin/refunds/stats
     */
    public function getRefundStats(Request $request, Response $response): ResponseInterface
    {
        try {
            $adminUser = $request->getAttribute('user');

            $stats = $this->refundRepository->getRefundStats();

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'refunds.view',
                'Viewed refund statistics',
                ['stats' => $stats]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $stats
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching refund statistics', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch refund statistics', null, 500);
        }
    }

    /**
     * Export refunds as CSV
     * GET /admin/refunds/export
     */
    public function exportRefunds(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $adminUser = $request->getAttribute('user');

            // Extract and validate filters (same as getRefundRequests)
            $filters = array_intersect_key($queryParams, array_flip([
                'search', 'status', 'priority', 'start_date', 'end_date'
            ]));

            $filterValidation = $this->validator->validateRefundFilters($filters);
            if (!empty($filterValidation['errors'])) {
                return $this->errorResponse($response, 'Invalid filter parameters', $filterValidation['errors'], 400);
            }

            $filters = $filterValidation['validated_filters'];

            // Get all matching refunds (no pagination for export)
            $result = $this->refundRepository->getRefundRequests($filters, 1, 10000);

            // Generate CSV content
            $csvContent = $this->generateRefundsCSV($result['refunds']);

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'refunds.export',
                'Exported refund requests to CSV',
                [
                    'filters' => $filters,
                    'exported_count' => count($result['refunds'])
                ]
            );

            // Set CSV headers
            $filename = 'refund_requests_' . date('Y-m-d_H-i-s') . '.csv';
            
            return $response
                ->withHeader('Content-Type', 'text/csv')
                ->withHeader('Content-Disposition', "attachment; filename=\"{$filename}\"")
                ->withHeader('Cache-Control', 'no-cache')
                ->withBody(\GuzzleHttp\Psr7\Utils::streamFor($csvContent));

        } catch (\Exception $e) {
            $this->logger->error('Error exporting refunds', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to export refunds', null, 500);
        }
    }

    /**
     * Generate CSV content for refunds
     */
    private function generateRefundsCSV(array $refunds): string
    {
        $output = fopen('php://temp', 'r+');

        // CSV Headers
        fputcsv($output, [
            'Refund Reference',
            'Booking Reference', 
            'Customer Name',
            'Customer Email',
            'Event Name',
            'Requested Amount',
            'Approved Amount',
            'Net Refund Amount',
            'Status',
            'Priority',
            'Refund Reason',
            'Requested Date',
            'Reviewed Date',
            'Processed Date',
            'Admin Notes'
        ]);

        // CSV Data
        foreach ($refunds as $refund) {
            fputcsv($output, [
                $refund['refund_reference'] ?? '',
                $refund['booking_reference'] ?? '',
                $refund['customer_name'] ?? '',
                $refund['customer_email'] ?? '',
                $refund['event_name'] ?? '',
                number_format($refund['requested_amount'], 2),
                number_format($refund['approved_amount'], 2),
                number_format($refund['net_refund_amount'], 2),
                ucfirst($refund['status']),
                ucfirst($refund['priority']),
                $refund['refund_reason'] ?? '',
                $refund['requested_at'] ?? '',
                $refund['reviewed_at'] ?? '',
                $refund['processed_at'] ?? '',
                $refund['admin_notes'] ?? ''
            ]);
        }

        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return $csvContent;
    }

    /**
     * Log admin activity
     */
    private function logAdminActivity(int $adminUserId, string $action, string $description, array $metadata = []): void
    {
        try {
            $this->activityLogger->logActivity($adminUserId, $action, $description, $metadata);
        } catch (\Exception $e) {
            $this->logger->warning('Failed to log admin activity', [
                'admin_user_id' => $adminUserId,
                'action' => $action,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Return error response
     */
    private function errorResponse(Response $response, string $message, $errors = null, int $statusCode = 400): ResponseInterface
    {
        $data = [
            'success' => false,
            'error' => $message
        ];

        if ($errors !== null) {
            $data['errors'] = $errors;
        }

        $response->getBody()->write(json_encode($data));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($statusCode);
    }
}