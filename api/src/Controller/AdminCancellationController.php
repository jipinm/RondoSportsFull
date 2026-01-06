<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Response;
use XS2EventProxy\Service\CancellationService;
use XS2EventProxy\Repository\CancellationRequestRepository;
use XS2EventProxy\Exception\ApiException;
use Psr\Log\LoggerInterface;

class AdminCancellationController
{
    private CancellationService $cancellationService;
    private CancellationRequestRepository $cancellationRepository;
    private LoggerInterface $logger;

    public function __construct(
        CancellationService $cancellationService,
        CancellationRequestRepository $cancellationRepository,
        LoggerInterface $logger
    ) {
        $this->cancellationService = $cancellationService;
        $this->cancellationRepository = $cancellationRepository;
        $this->logger = $logger;
    }

    /**
     * Get all cancellation requests with filters
     * GET /admin/cancellation-requests
     */
    public function getAllRequests(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();

            // Extract filters
            $filters = [];
            if (!empty($queryParams['status'])) {
                $filters['status'] = $queryParams['status'];
            }
            if (!empty($queryParams['search'])) {
                $filters['search'] = $queryParams['search'];
            }
            if (!empty($queryParams['date_from'])) {
                $filters['date_from'] = $queryParams['date_from'];
            }
            if (!empty($queryParams['date_to'])) {
                $filters['date_to'] = $queryParams['date_to'];
            }
            if (!empty($queryParams['refund_status'])) {
                $filters['refund_status'] = $queryParams['refund_status'];
            }

            // Pagination
            $page = !empty($queryParams['page']) ? (int)$queryParams['page'] : 1;
            $perPage = !empty($queryParams['per_page']) ? (int)$queryParams['per_page'] : 20;

            // Validate pagination
            if ($page < 1) $page = 1;
            if ($perPage < 1 || $perPage > 100) $perPage = 20;

            $this->logger->debug('Admin fetching cancellation requests', [
                'filters' => $filters,
                'page' => $page,
                'per_page' => $perPage
            ]);

            $result = $this->cancellationRepository->getAll($filters, $page, $perPage);

            return $this->successResponse($response, $result);

        } catch (\Exception $e) {
            $this->logger->error('Failed to get cancellation requests', [
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, 'Failed to fetch cancellation requests', 500);
        }
    }

    /**
     * Get single cancellation request
     * GET /admin/cancellation-requests/{id}
     */
    public function getRequest(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $requestId = (int)$args['id'];

            $this->logger->debug('Admin fetching cancellation request', [
                'request_id' => $requestId
            ]);

            $cancellationRequest = $this->cancellationRepository->getById($requestId);

            if (!$cancellationRequest) {
                return $this->errorResponse($response, 'Cancellation request not found', 404);
            }

            return $this->successResponse($response, $cancellationRequest);

        } catch (\Exception $e) {
            $this->logger->error('Failed to get cancellation request', [
                'request_id' => $requestId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, 'Failed to fetch cancellation request', 500);
        }
    }

    /**
     * Approve cancellation request
     * PATCH /admin/cancellation-requests/{id}/approve
     */
    public function approveRequest(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $requestId = (int)$args['id'];
            $adminUserId = $request->getAttribute('user_id');

            if (!$adminUserId) {
                return $this->errorResponse($response, 'Unauthorized: Admin user ID not found', 401);
            }

            $body = $request->getParsedBody();
            
            $refundAmount = isset($body['refund_amount']) ? (float)$body['refund_amount'] : null;
            $adminNotes = !empty($body['admin_notes']) ? trim($body['admin_notes']) : null;

            // Validate refund amount if provided
            if ($refundAmount !== null && $refundAmount < 0) {
                return $this->errorResponse($response, 'Refund amount cannot be negative', 400);
            }

            $this->logger->info('Admin approving cancellation request', [
                'request_id' => $requestId,
                'admin_user_id' => $adminUserId,
                'refund_amount' => $refundAmount
            ]);

            $result = $this->cancellationService->approveCancellation(
                $requestId,
                (int)$adminUserId,
                $refundAmount,
                $adminNotes
            );

            // Log admin activity
            $this->logAdminActivity($adminUserId, 'approve_cancellation', $requestId, [
                'refund_amount' => $refundAmount,
                'admin_notes' => $adminNotes
            ]);

            return $this->successResponse($response, $result['data'], $result['message']);

        } catch (ApiException $e) {
            $this->logger->warning('Failed to approve cancellation request', [
                'request_id' => $requestId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in approveRequest', [
                'request_id' => $requestId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, 'Internal server error', 500);
        }
    }

    /**
     * Decline cancellation request
     * PATCH /admin/cancellation-requests/{id}/reject
     */
    public function rejectRequest(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $requestId = (int)$args['id'];
            $adminUserId = $request->getAttribute('user_id');

            if (!$adminUserId) {
                return $this->errorResponse($response, 'Unauthorized: Admin user ID not found', 401);
            }

            $body = $request->getParsedBody();
            
            if (empty($body['admin_notes'])) {
                return $this->errorResponse($response, 'Reason for declining (admin_notes) is required', 400);
            }

            $adminNotes = trim($body['admin_notes']);

            if (strlen($adminNotes) < 10) {
                return $this->errorResponse($response, 'Reason for declining must be at least 10 characters', 400);
            }

            $this->logger->info('Admin declining cancellation request', [
                'request_id' => $requestId,
                'admin_user_id' => $adminUserId
            ]);

            $result = $this->cancellationService->rejectCancellation(
                $requestId,
                (int)$adminUserId,
                $adminNotes
            );

            // Log admin activity
            $this->logAdminActivity($adminUserId, 'decline_cancellation', $requestId, [
                'admin_notes' => $adminNotes
            ]);

            return $this->successResponse($response, $result['data'], $result['message']);

        } catch (ApiException $e) {
            $this->logger->warning('Failed to decline cancellation request', [
                'request_id' => $requestId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in rejectRequest', [
                'request_id' => $requestId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, 'Internal server error', 500);
        }
    }

    /**
     * Complete cancellation request
     * PATCH /admin/cancellation-requests/{id}/complete
     */
    public function completeRequest(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $requestId = (int)$args['id'];
            $adminUserId = $request->getAttribute('user_id');

            if (!$adminUserId) {
                return $this->errorResponse($response, 'Unauthorized: Admin user ID not found', 401);
            }

            $body = $request->getParsedBody();
            
            $refundReference = !empty($body['refund_reference']) ? trim($body['refund_reference']) : null;
            $adminNotes = !empty($body['admin_notes']) ? trim($body['admin_notes']) : null;

            $this->logger->info('Admin completing cancellation request', [
                'request_id' => $requestId,
                'admin_user_id' => $adminUserId,
                'refund_reference' => $refundReference
            ]);

            $result = $this->cancellationService->completeCancellation(
                $requestId,
                (int)$adminUserId,
                $refundReference,
                $adminNotes
            );

            // Log admin activity
            $this->logAdminActivity($adminUserId, 'complete_cancellation', $requestId, [
                'refund_reference' => $refundReference,
                'admin_notes' => $adminNotes
            ]);

            return $this->successResponse($response, $result['data'], $result['message']);

        } catch (ApiException $e) {
            $this->logger->warning('Failed to complete cancellation request', [
                'request_id' => $requestId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in completeRequest', [
                'request_id' => $requestId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, 'Internal server error', 500);
        }
    }

    /**
     * Get cancellation statistics
     * GET /admin/cancellation-requests/stats
     */
    public function getStatistics(Request $request, Response $response): ResponseInterface
    {
        try {
            $this->logger->debug('Admin fetching cancellation statistics');

            $stats = $this->cancellationService->getStatistics();

            return $this->successResponse($response, $stats);

        } catch (\Exception $e) {
            $this->logger->error('Failed to get cancellation statistics', [
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, 'Failed to fetch statistics', 500);
        }
    }

    /**
     * Log admin activity
     */
    private function logAdminActivity(int $adminUserId, string $action, int $requestId, array $details = []): void
    {
        try {
            $this->logger->info('Admin activity logged', [
                'admin_user_id' => $adminUserId,
                'action' => $action,
                'request_id' => $requestId,
                'details' => $details,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
            // TODO: Store in admin_activity_logs table if it exists
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to log admin activity', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Success response helper
     */
    private function successResponse(
        Response $response,
        $data = null,
        string $message = 'Success',
        int $statusCode = 200
    ): ResponseInterface {
        $payload = [
            'success' => true,
            'message' => $message
        ];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        $response->getBody()->write(json_encode($payload));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }

    /**
     * Error response helper
     */
    private function errorResponse(
        Response $response,
        string $message,
        int $statusCode = 400
    ): ResponseInterface {
        $payload = [
            'success' => false,
            'error' => $message
        ];

        $response->getBody()->write(json_encode($payload));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }
}
