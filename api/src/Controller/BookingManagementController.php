<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use XS2EventProxy\Repository\BookingRepository;
use XS2EventProxy\Service\BookingValidationService;
use XS2EventProxy\Service\ActivityLoggerService;
use XS2EventProxy\Service\StripeRefundService;
use XS2EventProxy\Service\XS2EventBookingBridge;
use XS2EventProxy\Service\RefundLogService;
use XS2EventProxy\Exception\BookingException;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;

class BookingManagementController
{
    private BookingRepository $bookingRepository;
    private BookingValidationService $validator;
    private ActivityLoggerService $activityLogger;
    private StripeRefundService $stripeRefundService;
    private XS2EventBookingBridge $xs2eventBridge;
    private RefundLogService $refundLogService;
    private LoggerInterface $logger;

    public function __construct(
        BookingRepository $bookingRepository,
        BookingValidationService $validator,
        ActivityLoggerService $activityLogger,
        StripeRefundService $stripeRefundService,
        XS2EventBookingBridge $xs2eventBridge,
        RefundLogService $refundLogService,
        LoggerInterface $logger
    ) {
        $this->bookingRepository = $bookingRepository;
        $this->validator = $validator;
        $this->activityLogger = $activityLogger;
        $this->stripeRefundService = $stripeRefundService;
        $this->xs2eventBridge = $xs2eventBridge;
        $this->refundLogService = $refundLogService;
        $this->logger = $logger;
    }

    /**
     * Get bookings list with pagination and filters
     * GET /admin/bookings
     */
    public function getBookings(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $adminUser = $request->getAttribute('user');

            // Validate pagination
            $paginationValidation = $this->validator->validatePagination($queryParams);
            if (!empty($paginationValidation['errors'])) {
                return $this->errorResponse($response, 'Invalid pagination parameters', $paginationValidation['errors'], 400);
            }

            $page = $paginationValidation['validated_params']['page'];
            $limit = $paginationValidation['validated_params']['limit'];

            // Validate filters
            $filterValidation = $this->validator->validateBookingFilters($queryParams);
            if (!empty($filterValidation['errors'])) {
                return $this->errorResponse($response, 'Invalid filter parameters', $filterValidation['errors'], 400);
            }

            $filters = $filterValidation['validated_filters'];

            // Get bookings
            $result = $this->bookingRepository->getBookings($filters, $page, $limit);

            // Sanitize booking data
            foreach ($result['bookings'] as &$booking) {
                $booking = $this->validator->sanitizeBookingData($booking);
            }

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'bookings.view',
                'Viewed bookings list',
                [
                    'filters' => $filters,
                    'page' => $page,
                    'total_results' => $result['pagination']['total_items']
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result['bookings'],
                'pagination' => $result['pagination']
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching bookings', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch bookings', null, 500);
        }
    }

    /**
     * Get single booking details
     * GET /admin/bookings/{id}
     */
    public function getBookingById(Request $request, Response $response): ResponseInterface
    {
        try {
            $bookingId = (int)$request->getAttribute('id');
            $adminUser = $request->getAttribute('user');

            if ($bookingId <= 0) {
                return $this->errorResponse($response, 'Invalid booking ID', null, 400);
            }

            $booking = $this->bookingRepository->getBookingById($bookingId);

            if (!$booking) {
                return $this->errorResponse($response, 'Booking not found', null, 404);
            }

            // Fetch hospitalities for this booking
            $hospitalities = $this->bookingRepository->getBookingHospitalities($bookingId);
            $booking['hospitalities'] = $hospitalities;

            // Sanitize booking data
            $booking = $this->validator->sanitizeBookingData($booking);

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'bookings.view',
                "Viewed booking details for {$booking['booking_reference']}",
                [
                    'booking_id' => $bookingId,
                    'booking_reference' => $booking['booking_reference']
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $booking
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching booking details', [
                'error' => $e->getMessage(),
                'booking_id' => $bookingId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch booking details', null, 500);
        }
    }

    /**
     * Update booking status
     * PUT /admin/bookings/{id}/status
     */
    public function updateBookingStatus(Request $request, Response $response): ResponseInterface
    {
        try {
            $bookingId = (int)$request->getAttribute('id');
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            if ($bookingId <= 0) {
                return $this->errorResponse($response, 'Invalid booking ID', null, 400);
            }

            // Validation
            $errors = $this->validator->validateStatusUpdate($data);
            if (!empty($errors)) {
                return $this->errorResponse($response, 'Validation failed', $errors, 400);
            }

            // Get current booking
            $booking = $this->bookingRepository->getBookingById($bookingId);
            if (!$booking) {
                return $this->errorResponse($response, 'Booking not found', null, 404);
            }

            $oldStatus = $booking['status'];
            $newStatus = $data['status'];
            $reason = $data['reason'] ?? null;

            // Validate status transition
            $transitionErrors = $this->validator->validateStatusTransition($oldStatus, $newStatus);
            if (!empty($transitionErrors)) {
                return $this->errorResponse($response, 'Invalid status transition', $transitionErrors, 400);
            }

            // Update status
            $success = $this->bookingRepository->updateBookingStatus(
                $bookingId, 
                $newStatus, 
                (int)$adminUser['id'], 
                $reason
            );

            if (!$success) {
                return $this->errorResponse($response, 'Failed to update booking status', null, 500);
            }

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'bookings.edit',
                "Changed booking status from '{$oldStatus}' to '{$newStatus}' for {$booking['booking_reference']}",
                [
                    'booking_id' => $bookingId,
                    'booking_reference' => $booking['booking_reference'],
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'reason' => $reason,
                    'customer_name' => $booking['customer_name']
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Booking status updated successfully',
                'data' => [
                    'booking_id' => $bookingId,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus
                ]
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error updating booking status', [
                'error' => $e->getMessage(),
                'booking_id' => $bookingId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to update booking status', null, 500);
        }
    }

    /**
     * Get booking statistics
     * GET /admin/bookings/stats
     */
    public function getBookingStats(Request $request, Response $response): ResponseInterface
    {
        try {
            $adminUser = $request->getAttribute('user');

            $stats = $this->bookingRepository->getBookingStats();

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'bookings.view',
                'Viewed booking statistics',
                ['stats_retrieved' => true]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $stats
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching booking statistics', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch booking statistics', null, 500);
        }
    }

    /**
     * Get sport types for filtering
     * GET /admin/bookings/sport-types
     */
    public function getSportTypes(Request $request, Response $response): ResponseInterface
    {
        try {
            $adminUser = $request->getAttribute('user');

            $sportTypes = $this->bookingRepository->getSportTypes();

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $sportTypes
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching sport types', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch sport types', null, 500);
        }
    }

    /**
     * Export bookings to CSV
     * GET /admin/bookings/export
     */
    public function exportBookings(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $adminUser = $request->getAttribute('user');

            // Validate filters (same as getBookings)
            $filterValidation = $this->validator->validateBookingFilters($queryParams);
            if (!empty($filterValidation['errors'])) {
                return $this->errorResponse($response, 'Invalid filter parameters', $filterValidation['errors'], 400);
            }

            $filters = $filterValidation['validated_filters'];

            // Get all bookings (no pagination for export)
            $result = $this->bookingRepository->getBookings($filters, 1, 10000);
            $bookings = $result['bookings'];

            // Generate CSV content
            $csv = $this->generateBookingsCsv($bookings);

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'bookings.export',
                'Exported bookings to CSV',
                [
                    'filters' => $filters,
                    'total_exported' => count($bookings)
                ]
            );

            $filename = 'bookings-export-' . date('Y-m-d-H-i-s') . '.csv';

            return $response
                ->withHeader('Content-Type', 'text/csv')
                ->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->withBody(\Slim\Psr7\Factory\StreamFactory::create($csv));

        } catch (\Exception $e) {
            $this->logger->error('Error exporting bookings', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to export bookings', null, 500);
        }
    }

    /**
     * Manually sync booking with XS2Event API
     * POST /admin/bookings/{id}/sync-xs2event
     */
    public function syncBookingWithXS2Event(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bookingId = (int)$args['id'];

            // Get booking to verify it exists and is eligible for sync
            $booking = $this->bookingRepository->getBookingById($bookingId);
            
            if (!$booking) {
                return $this->errorResponse($response, 'Booking not found', null, 404);
            }

            // Check if already synced
            if (!empty($booking['api_booking_id'])) {
                $response->getBody()->write(json_encode([
                    'success' => true,
                    'message' => 'Booking already synced with XS2Event',
                    'data' => [
                        'api_booking_id' => $booking['api_booking_id'],
                        'xs2event_booking_status' => $booking['xs2event_booking_status'] ?? null
                    ]
                ]));
                return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus(200);
            }

            // Check if booking is confirmed (ready for sync)
            if ($booking['status'] !== 'confirmed') {
                return $this->errorResponse($response, 'Only confirmed bookings can be synced with XS2Event');
            }

            // Trigger XS2Event sync
            $this->logger->info('Manual XS2Event sync triggered', [
                'booking_id' => $bookingId,
                'admin_user' => $request->getAttribute('user_id')
            ]);

            // Process the booking with XS2Event
            $syncResult = $this->xs2eventBridge->processBookingAfterPayment($bookingId);

            if ($syncResult['success']) {
                $this->logger->info('XS2Event sync completed successfully', [
                    'booking_id' => $bookingId,
                    'api_booking_id' => $syncResult['api_booking_id'] ?? null
                ]);

                $responseData = [
                    'success' => true,
                    'message' => 'Booking synced successfully with XS2Event!',
                    'data' => [
                        'booking_id' => $bookingId,
                        'api_booking_id' => $syncResult['api_booking_id'] ?? null,
                        'xs2event_booking_status' => $syncResult['xs2event_booking_status'] ?? null,
                        'status' => 'completed'
                    ]
                ];
            } else {
                $this->logger->warning('XS2Event sync failed', [
                    'booking_id' => $bookingId,
                    'error' => $syncResult['error'] ?? 'Unknown error'
                ]);

                $responseData = [
                    'success' => false,
                    'message' => $syncResult['error'] ?? 'Failed to sync with XS2Event. Please try again.',
                    'data' => [
                        'booking_id' => $bookingId,
                        'status' => 'failed'
                    ]
                ];
            }

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(200);

        } catch (\Exception $e) {
            $this->logger->error('XS2Event sync failed', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, 'Failed to sync with XS2Event: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Check ticket availability/status for a booking
     * POST /admin/bookings/{id}/check-tickets
     */
    public function checkTicketStatus(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bookingId = (int)$args['id'];

            // Get booking
            $booking = $this->bookingRepository->getBookingById($bookingId);
            
            if (!$booking) {
                return $this->errorResponse($response, 'Booking not found', null, 404);
            }

            // Check if booking has been synced with XS2Event
            if (empty($booking['api_booking_id'])) {
                return $this->errorResponse($response, 'Booking has not been synced with XS2Event yet');
            }

            // Get current e-ticket status from database
            $ticketData = [
                'status' => $booking['eticket_status'] ?? 'pending',
                'available' => ($booking['eticket_status'] ?? 'pending') === 'available',
                'eticket_available_date' => $booking['eticket_available_date'] ?? null,
                'download_count' => (int)($booking['download_count'] ?? 0),
                'message' => $this->getTicketStatusMessage($booking['eticket_status'] ?? 'pending')
            ];

            $this->logger->info('Ticket status checked', [
                'booking_id' => $bookingId,
                'api_booking_id' => $booking['api_booking_id'],
                'ticket_status' => $ticketData['status']
            ]);

            $responseData = [
                'success' => true,
                'message' => 'Ticket status retrieved successfully',
                'data' => $ticketData
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(200);

        } catch (\Exception $e) {
            $this->logger->error('Failed to check ticket status', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, 'Failed to check ticket status: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Get bookings without XS2Event API booking ID
     * GET /admin/bookings/without-api-id
     */
    public function getUnsyncedBookings(Request $request, Response $response): ResponseInterface
    {
        try {
            // Get confirmed bookings without api_booking_id
            $bookings = $this->bookingRepository->getBookingsWithoutApiId(100);

            $this->logger->info('Fetched unsynced bookings', [
                'count' => count($bookings)
            ]);

            $responseData = [
                'success' => true,
                'data' => $bookings,
                'count' => count($bookings)
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(200);

        } catch (\Exception $e) {
            $this->logger->error('Failed to get unsynced bookings', [
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, 'Failed to retrieve unsynced bookings: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Get user-friendly message for ticket status
     */
    private function getTicketStatusMessage(string $status): string
    {
        $messages = [
            'available' => 'Tickets are ready to download',
            'processing' => 'Tickets are being generated. Please check back in a few minutes.',
            'pending' => 'Tickets will be available closer to the event date',
            'failed' => 'There was an issue generating tickets. Please contact support.'
        ];

        return $messages[$status] ?? 'Status unknown';
    }

    /**
     * Log admin activity
     */
    private function logAdminActivity(int $adminUserId, string $action, string $description, array $context = []): void
    {
        try {
            $this->activityLogger->logActivity(
                $adminUserId,
                $action,
                $description,
                $context
            );
        } catch (\Exception $e) {
            $this->logger->warning('Failed to log admin activity', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUserId,
                'action' => $action
            ]);
        }
    }

    /**
     * Generate CSV content from bookings data
     */
    private function generateBookingsCsv(array $bookings): string
    {
        $csv = '';
        
        // Headers
        $headers = [
            'Booking Reference', 'Customer Name', 'Customer Email', 'Event Name', 'Event Date',
            'Venue', 'Sport Type', 'Total Amount', 'Currency', 'Status', 'Payment Status',
            'Ticket Count', 'Seats', 'Booking Date', 'Source'
        ];
        
        $csv .= implode(',', $headers) . "\n";
        
        // Data rows
        foreach ($bookings as $booking) {
            $row = [
                $this->escapeCsvField($booking['booking_reference']),
                $this->escapeCsvField($booking['customer_name']),
                $this->escapeCsvField($booking['customer_email']),
                $this->escapeCsvField($booking['event_name']),
                $this->escapeCsvField($booking['event_date']),
                $this->escapeCsvField($booking['venue_name']),
                $this->escapeCsvField($booking['sport_type']),
                $booking['total_amount'],
                $booking['currency'],
                $booking['status'],
                $booking['payment_status'],
                $booking['ticket_count'],
                $this->escapeCsvField(implode('; ', $booking['seat_info'] ?? [])),
                $this->escapeCsvField($booking['booking_date']),
                $booking['source']
            ];
            
            $csv .= implode(',', $row) . "\n";
        }
        
        return $csv;
    }

    /**
     * Escape CSV field
     */
    private function escapeCsvField(?string $field): string
    {
        if ($field === null) {
            return '';
        }
        
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (strpos($field, ',') !== false || strpos($field, '"') !== false || strpos($field, "\n") !== false) {
            return '"' . str_replace('"', '""', $field) . '"';
        }
        
        return $field;
    }

    /**
     * Process refund for a booking
     * POST /admin/bookings/{id}/refund
     */
    public function processRefund(Request $request, Response $response): ResponseInterface
    {
        try {
            $bookingId = (int)$request->getAttribute('id');
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            // Validate booking ID
            if ($bookingId <= 0) {
                return $this->errorResponse($response, 'Invalid booking ID', null, 400);
            }

            // Check refund eligibility
            $eligibility = $this->bookingRepository->checkRefundEligibility($bookingId);
            if (!$eligibility['eligible']) {
                return $this->errorResponse($response, $eligibility['reason'], null, 400);
            }

            $booking = $eligibility['booking'];
            $availableAmount = $eligibility['available_amount'];

            // Validate refund amount
            $refundAmount = isset($data['amount']) ? (float)$data['amount'] : null;
            $refundReason = $data['reason'] ?? 'requested_by_customer';
            $adminNotes = $data['admin_notes'] ?? '';

            // Validate refund reason
            $validReasons = ['requested_by_customer', 'duplicate', 'fraudulent'];
            if (!in_array($refundReason, $validReasons)) {
                return $this->errorResponse($response, 'Invalid refund reason', null, 400);
            }

            // Validate partial refund amount
            if ($refundAmount !== null) {
                if ($refundAmount <= 0) {
                    return $this->errorResponse($response, 'Refund amount must be greater than 0', null, 400);
                }
                if ($refundAmount > $availableAmount) {
                    return $this->errorResponse($response, "Refund amount cannot exceed available amount of {$booking['currency']} {$availableAmount}", null, 400);
                }
            }

            $this->logger->info('Processing refund request', [
                'booking_id' => $bookingId,
                'booking_reference' => $booking['booking_reference'],
                'refund_amount' => $refundAmount ?? 'full',
                'available_amount' => $availableAmount,
                'admin_user_id' => $adminUser['id']
            ]);

            // Process refund via Stripe
            $refundResult = $this->stripeRefundService->processRefund(
                $booking['payment_intent_id'],
                $refundAmount,
                $refundReason,
                [
                    'booking_id' => $bookingId,
                    'booking_reference' => $booking['booking_reference'],
                    'admin_user_id' => $adminUser['id'],
                    'admin_email' => $adminUser['email']
                ]
            );

            // Determine new payment status
            $actualRefundAmount = $refundResult['amount'];
            $totalRefunded = ($booking['refund_amount'] ?? 0) + $actualRefundAmount;
            $isPartialRefund = $totalRefunded < $booking['total_amount'];
            $newPaymentStatus = $isPartialRefund ? 'partially_refunded' : 'refunded';

            // Update booking in database
            $updateSuccess = $this->bookingRepository->updateRefundDetails(
                $bookingId,
                $refundResult['refund_id'],
                $actualRefundAmount,
                $refundReason,
                $newPaymentStatus,
                $adminNotes
            );

            if (!$updateSuccess) {
                $this->logger->error('Failed to update booking refund details in database', [
                    'booking_id' => $bookingId,
                    'refund_id' => $refundResult['refund_id']
                ]);
                // Note: Refund was processed in Stripe, but database update failed
                // This should be handled manually or with a reconciliation process
            }

            // Create refund log entry
            $refundLog = null;
            try {
                $refundLog = $this->refundLogService->createRefundLog([
                    'booking_id' => $bookingId,
                    'refund_amount' => $actualRefundAmount,
                    'refund_reason' => $refundReason,
                    'admin_user_id' => $adminUser['id'],
                    'admin_notes' => $adminNotes,
                    'stripe_refund_id' => $refundResult['refund_id'],
                    'stripe_status' => $refundResult['status'],
                    'processing_fee' => 0.00,
                    'priority' => 'normal'
                ]);

                $this->logger->info('Refund log created', [
                    'refund_log_id' => $refundLog['id'],
                    'refund_reference' => $refundLog['refund_reference'],
                    'booking_id' => $bookingId
                ]);
            } catch (\Exception $e) {
                $this->logger->error('Failed to create refund log', [
                    'booking_id' => $bookingId,
                    'error' => $e->getMessage()
                ]);
                // Continue even if log creation fails
            }

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'bookings.refund',
                "Processed {$refundResult['currency']} {$actualRefundAmount} refund for booking {$booking['booking_reference']}",
                [
                    'booking_id' => $bookingId,
                    'booking_reference' => $booking['booking_reference'],
                    'refund_id' => $refundResult['refund_id'],
                    'refund_amount' => $actualRefundAmount,
                    'refund_type' => $isPartialRefund ? 'partial' : 'full',
                    'reason' => $refundReason,
                    'admin_notes' => $adminNotes,
                    'new_payment_status' => $newPaymentStatus,
                    'refund_log_id' => $refundLog['id'] ?? null,
                    'refund_reference' => $refundLog['refund_reference'] ?? null
                ]
            );

            $this->logger->info('Refund processed successfully', [
                'booking_id' => $bookingId,
                'refund_id' => $refundResult['refund_id'],
                'refund_amount' => $actualRefundAmount,
                'payment_status' => $newPaymentStatus,
                'refund_log_id' => $refundLog['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Refund processed successfully',
                'data' => [
                    'refund_id' => $refundResult['refund_id'],
                    'refund_amount' => $actualRefundAmount,
                    'refund_status' => $refundResult['status'],
                    'payment_status' => $newPaymentStatus,
                    'currency' => $refundResult['currency'],
                    'total_refunded' => $totalRefunded,
                    'refund_log_id' => $refundLog['id'] ?? null,
                    'refund_reference' => $refundLog['refund_reference'] ?? null
                ]
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error processing refund', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, $e->getMessage(), null, 500);
        }
    }

    /**
     * Return error response
     */
    private function errorResponse(Response $response, string $message, ?array $errors = null, int $statusCode = 400): ResponseInterface
    {
        $body = ['success' => false, 'message' => $message];
        
        if ($errors !== null) {
            $body['errors'] = $errors;
        }

        $response->getBody()->write(json_encode($body));
        
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }
}