<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Response;
use XS2EventProxy\Service\CancellationService;
use XS2EventProxy\Exception\ApiException;
use Psr\Log\LoggerInterface;

class CustomerCancellationController
{
    private CancellationService $cancellationService;
    private LoggerInterface $logger;

    public function __construct(
        CancellationService $cancellationService,
        LoggerInterface $logger
    ) {
        $this->cancellationService = $cancellationService;
        $this->logger = $logger;
    }

    /**
     * Request cancellation for a booking
     * POST /api/v1/customers/bookings/{id}/cancel-request
     */
    public function requestCancellation(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bookingId = (int)$args['id'];
            $customerId = $request->getAttribute('customer_id');

            if (!$customerId) {
                return $this->errorResponse($response, 'Unauthorized: Customer ID not found', 401);
            }

            $this->logger->info('Customer requesting cancellation', [
                'booking_id' => $bookingId,
                'customer_id' => $customerId
            ]);

            // Parse request body
            $body = $request->getParsedBody();
            
            // Validate required fields
            if (empty($body['cancellation_reason'])) {
                return $this->errorResponse($response, 'Cancellation reason is required', 400);
            }

            $cancellationReason = trim($body['cancellation_reason']);
            $customerNotes = !empty($body['customer_notes']) ? trim($body['customer_notes']) : null;

            // Validate reason length
            if (strlen($cancellationReason) < 10) {
                return $this->errorResponse($response, 'Cancellation reason must be at least 10 characters', 400);
            }

            if (strlen($cancellationReason) > 1000) {
                return $this->errorResponse($response, 'Cancellation reason is too long (max 1000 characters)', 400);
            }

            // Request cancellation
            $result = $this->cancellationService->requestCancellation(
                $bookingId,
                (int)$customerId,
                $cancellationReason,
                $customerNotes
            );

            return $this->successResponse($response, $result['data'], $result['message'], 201);

        } catch (ApiException $e) {
            $this->logger->warning('Cancellation request failed', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in requestCancellation', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, 'Internal server error', 500);
        }
    }

    /**
     * Get cancellation request status for a booking
     * GET /api/v1/customers/bookings/{id}/cancel-request
     */
    public function getCancellationStatus(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bookingId = (int)$args['id'];
            $customerId = $request->getAttribute('customer_id');

            if (!$customerId) {
                return $this->errorResponse($response, 'Unauthorized: Customer ID not found', 401);
            }

            $this->logger->debug('Getting cancellation status', [
                'booking_id' => $bookingId,
                'customer_id' => $customerId
            ]);

            $cancellationRequest = $this->cancellationService->getCancellationRequest(
                $bookingId,
                (int)$customerId
            );

            if (!$cancellationRequest) {
                return $this->errorResponse($response, 'No cancellation request found for this booking', 404);
            }

            return $this->successResponse($response, $cancellationRequest);

        } catch (ApiException $e) {
            $this->logger->warning('Failed to get cancellation status', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in getCancellationStatus', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, 'Internal server error', 500);
        }
    }

    /**
     * Cancel a cancellation request (customer cancels their own request)
     * DELETE /api/v1/customers/bookings/{id}/cancel-request
     */
    public function cancelCancellationRequest(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bookingId = (int)$args['id'];
            $customerId = $request->getAttribute('customer_id');

            if (!$customerId) {
                return $this->errorResponse($response, 'Unauthorized: Customer ID not found', 401);
            }

            $this->logger->info('Customer cancelling their cancellation request', [
                'booking_id' => $bookingId,
                'customer_id' => $customerId
            ]);

            $result = $this->cancellationService->cancelRequest(
                $bookingId,
                (int)$customerId
            );

            return $this->successResponse($response, null, $result['message']);

        } catch (ApiException $e) {
            $this->logger->warning('Failed to cancel cancellation request', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in cancelCancellationRequest', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($response, 'Internal server error', 500);
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
