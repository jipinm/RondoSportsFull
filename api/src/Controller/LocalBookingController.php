<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Response;
use XS2EventProxy\Repository\BookingRepository;
use XS2EventProxy\Repository\CustomerRepository;
use XS2EventProxy\Service\EmailService;
use XS2EventProxy\Service\XS2EventBookingBridge;
use Psr\Log\LoggerInterface;
use Exception;

class LocalBookingController
{
    private BookingRepository $bookingRepository;
    private CustomerRepository $customerRepository;
    private EmailService $emailService;
    private XS2EventBookingBridge $xs2eventBridge;
    private LoggerInterface $logger;

    public function __construct(
        BookingRepository $bookingRepository,
        CustomerRepository $customerRepository,
        EmailService $emailService,
        XS2EventBookingBridge $xs2eventBridge,
        LoggerInterface $logger
    ) {
        $this->bookingRepository = $bookingRepository;
        $this->customerRepository = $customerRepository;
        $this->emailService = $emailService;
        $this->xs2eventBridge = $xs2eventBridge;
        $this->logger = $logger;
    }

    /**
     * Create a booking in local database
     * POST /api/v1/local-bookings
     */
    public function createBooking(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            
            // Validate required fields
            $requiredFields = [
                'customer_email',
                'event_name', 
                'event_date',
                'total_amount',
                'ticket_count'
            ];
            
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->errorResponse($response, "Missing required field: $field", 400);
                }
            }

            // Find or create customer
            $customerEmail = $data['customer_email'];
            $customer = $this->customerRepository->findByEmail($customerEmail);
            
            if (!$customer) {
                // Create a guest customer account
                $customerId = $this->customerRepository->create([
                    'first_name' => $data['customer_first_name'] ?? 'Guest',
                    'last_name' => $data['customer_last_name'] ?? 'Customer', 
                    'email' => $customerEmail,
                    'phone' => $data['customer_phone'] ?? '',
                    'password_hash' => '', // Empty for guest accounts
                    'status' => 'active',
                    'email_verified' => true
                ]);
            } else {
                $customerId = $customer['id'];
            }

            // Generate booking reference
            $bookingReference = 'BK-' . date('Y') . '-' . str_pad((string)rand(1, 999999), 6, '0', STR_PAD_LEFT);

            // Prepare booking data
            $bookingData = [
                'booking_reference' => $bookingReference,
                'api_reservation_id' => $data['reservation_id'] ?? null,
                'customer_user_id' => $customerId,
                'event_name' => $data['event_name'],
                'event_id' => $data['event_id'] ?? null,
                'event_date' => $data['event_date'],
                'venue_name' => $data['venue_name'] ?? null,
                'venue_id' => $data['venue_id'] ?? null,
                'sport_type' => $data['sport_type'] ?? null,
                'tournament_name' => $data['tournament_name'] ?? null,
                'total_amount' => (float)$data['total_amount'],
                'currency' => $data['currency'] ?? 'USD',
                'ticket_count' => (int)$data['ticket_count'],
                'seat_info' => $data['seat_info'] ?? null,
                'ticket_info' => $data['ticket_info'] ?? null,
                'category_name' => $data['category_name'] ?? null,
                'event_start_time' => $data['event_start_time'] ?? $data['event_date'],
                'customer_notes' => $data['customer_notes'] ?? null,
                'source' => 'website',
                // Payment fields
                'payment_method' => $data['payment_method'] ?? null,
                'payment_reference' => $data['payment_reference'] ?? null,
                'payment_intent_id' => $data['payment_intent_id'] ?? null,
                'stripe_payment_method_id' => $data['stripe_payment_method_id'] ?? null,
                'stripe_customer_id' => $data['stripe_customer_id'] ?? null,
                'stripe_charge_id' => $data['stripe_charge_id'] ?? null,
                'payment_gateway_response' => $data['payment_gateway_response'] ?? null,
                'payment_gateway_fee' => isset($data['payment_gateway_fee']) ? (float)$data['payment_gateway_fee'] : null,
                'payment_status' => $data['payment_status'] ?? 'pending',
                'status' => $data['status'] ?? 'pending',
                'payment_completed_at' => $this->convertToMySQLDateTime($data['payment_completed_at'] ?? null) ?? 
                                        (($data['payment_status'] ?? 'pending') === 'completed' ? date('Y-m-d H:i:s') : null)
            ];

            // Create the booking
            $bookingId = $this->bookingRepository->create($bookingData);

            $this->logger->info('Local booking created successfully', [
                'booking_id' => $bookingId,
                'booking_reference' => $bookingReference,
                'customer_email' => $customerEmail,
                'total_amount' => $bookingData['total_amount'],
                'payment_status' => $bookingData['payment_status'],
                'status' => $bookingData['status'],
                'payment_reference' => $bookingData['payment_reference'] ?? null,
                'payment_intent_id' => $bookingData['payment_intent_id'] ?? null,
                'stripe_payment_method_id' => $bookingData['stripe_payment_method_id'] ?? null,
                'stripe_customer_id' => $bookingData['stripe_customer_id'] ?? null,
                'stripe_charge_id' => $bookingData['stripe_charge_id'] ?? null,
                'payment_completed_at' => $bookingData['payment_completed_at'] ?? null
            ]);

            // If payment is completed and we have a reservation, create XS2Event booking
            if (($data['payment_status'] ?? 'pending') === 'completed' && !empty($data['reservation_id'])) {
                $this->logger->info('Payment completed - triggering XS2Event booking creation', [
                    'booking_id' => $bookingId,
                    'reservation_id' => $data['reservation_id']
                ]);
                
                try {
                    // Trigger XS2Event booking creation (pass booking ID, not array)
                    $xs2eventResult = $this->xs2eventBridge->processBookingAfterPayment($bookingId);
                    
                    if ($xs2eventResult['success']) {
                        $this->logger->info('XS2Event booking created successfully', [
                            'booking_id' => $bookingId,
                            'xs2event_booking_id' => $xs2eventResult['xs2event_booking_id'],
                            'booking_code' => $xs2eventResult['booking_code']
                        ]);
                    } else {
                        $this->logger->error('XS2Event booking creation failed', [
                            'booking_id' => $bookingId,
                            'error' => $xs2eventResult['error']
                        ]);
                    }
                } catch (Exception $xs2eventException) {
                    // Don't fail the local booking if XS2Event booking fails
                    // The booking can be synced later
                    $this->logger->error('Exception during XS2Event booking creation', [
                        'booking_id' => $bookingId,
                        'error' => $xs2eventException->getMessage()
                    ]);
                }
            }

            // Send booking confirmation email
            try {
                // Check if PHPMailer is available before attempting to send email
                if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
                    $emailData = array_merge($bookingData, [
                        'booking_id' => $bookingId,
                        'customer_email' => $customerEmail,
                        'customer_first_name' => $data['customer_first_name'] ?? 'Guest',
                        'customer_last_name' => $data['customer_last_name'] ?? 'Customer'
                    ]);
                    
                    $emailSent = $this->emailService->sendBookingConfirmation($emailData);
                    
                    if ($emailSent) {
                        $this->logger->info('Booking confirmation email sent', [
                            'booking_id' => $bookingId,
                            'customer_email' => $customerEmail
                        ]);
                    } else {
                        $this->logger->warning('Failed to send booking confirmation email', [
                            'booking_id' => $bookingId,
                            'customer_email' => $customerEmail
                        ]);
                    }
                } else {
                    $this->logger->warning('PHPMailer not available - skipping email notification', [
                        'booking_id' => $bookingId,
                        'customer_email' => $customerEmail
                    ]);
                }
            } catch (Exception $emailException) {
                // Don't fail the booking if email sending fails
                $this->logger->error('Exception while sending booking confirmation email', [
                    'booking_id' => $bookingId,
                    'error' => $emailException->getMessage()
                ]);
            }

            $responseData = [
                'success' => true,
                'data' => [
                    'booking_id' => $bookingId,
                    'booking_reference' => $bookingReference,
                    'api_reservation_id' => $bookingData['api_reservation_id'],
                    'customer_id' => $customerId,
                    'status' => $bookingData['status'],
                    'payment_status' => $bookingData['payment_status'],
                    'payment_reference' => $bookingData['payment_reference'],
                    'payment_intent_id' => $bookingData['payment_intent_id'],
                    'payment_method' => $bookingData['payment_method'],
                    'total_amount' => $bookingData['total_amount'],
                    'currency' => $bookingData['currency'],
                    'event_name' => $bookingData['event_name']
                ]
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(201);

        } catch (Exception $e) {
            $this->logger->error('Failed to create local booking', [
                'error' => $e->getMessage(),
                'request_data' => $data ?? []
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Update booking payment status
     * PUT /api/v1/local-bookings/{id}/payment-status
     */
    public function updatePaymentStatus(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bookingId = (int)$args['id'];
            $data = $request->getParsedBody();
            
            if (!isset($data['payment_status'])) {
                return $this->errorResponse($response, 'Missing payment_status field', 400);
            }

            $paymentStatus = $data['payment_status'];
            $validStatuses = ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'];
            
            if (!in_array($paymentStatus, $validStatuses)) {
                return $this->errorResponse($response, 'Invalid payment status', 400);
            }

            // Check if booking exists
            $booking = $this->bookingRepository->findById($bookingId);
            if (!$booking) {
                return $this->errorResponse($response, 'Booking not found', 404);
            }

            // Update payment status
            $updateData = [
                'payment_status' => $paymentStatus,
                'payment_reference' => $data['payment_reference'] ?? $booking['payment_reference']
            ];

            // If payment completed, also update booking status
            if ($paymentStatus === 'completed') {
                $updateData['status'] = 'confirmed';
                $updateData['confirmed_at'] = date('Y-m-d H:i:s');
            }

            $this->bookingRepository->update($bookingId, $updateData);

            $this->logger->info('Booking payment status updated', [
                'booking_id' => $bookingId,
                'old_status' => $booking['payment_status'],
                'new_status' => $paymentStatus
            ]);

            // Trigger XS2Event booking creation if payment succeeded
            if (in_array($paymentStatus, ['completed', 'succeeded'])) {
                try {
                    $this->xs2eventBridge->processBookingAfterPayment($bookingId);
                } catch (\Exception $e) {
                    $this->logger->error('XS2Event booking creation failed', [
                        'booking_id' => $bookingId,
                        'error' => $e->getMessage()
                    ]);
                    // Don't fail the booking, just log error
                }
            }

            $responseData = [
                'success' => true,
                'data' => [
                    'booking_id' => $bookingId,
                    'payment_status' => $paymentStatus,
                    'booking_status' => $updateData['status'] ?? $booking['status']
                ]
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to update booking payment status', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get booking details
     * GET /api/v1/local-bookings/{id}
     */
    public function getBooking(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bookingId = (int)$args['id'];
            
            $booking = $this->bookingRepository->findById($bookingId);
            if (!$booking) {
                return $this->errorResponse($response, 'Booking not found', 404);
            }

            $responseData = [
                'success' => true,
                'data' => $booking
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to get booking', [
                'booking_id' => $bookingId ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get customer bookings from local database
     * GET /api/v1/local-bookings/customer/{customer_email}
     */
    public function getCustomerBookings(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $customerEmail = $args['customer_email'] ?? null;
            
            if (!$customerEmail) {
                return $this->errorResponse($response, 'Customer email is required', 400);
            }

            // Find customer first
            $customer = $this->customerRepository->findByEmail($customerEmail);
            if (!$customer) {
                return $this->errorResponse($response, 'Customer not found', 404);
            }

            // Get query parameters for filtering and pagination
            $queryParams = $request->getQueryParams();
            $page = max(1, (int)($queryParams['page'] ?? 1));
            $limit = min(50, max(1, (int)($queryParams['limit'] ?? 10)));
            $status = $queryParams['status'] ?? null;
            
            // Get bookings for this customer
            $bookings = $this->bookingRepository->findByCustomerId($customer['id'], [
                'page' => $page,
                'limit' => $limit,
                'status' => $status
            ]);

            // Format the bookings for frontend consumption
            $formattedBookings = [];
            foreach ($bookings as $booking) {
                $formattedBookings[] = [
                    'id' => $booking['id'],
                    'booking_id' => $booking['booking_reference'],
                    'booking_reference' => $booking['booking_reference'],
                    'api_booking_id' => $booking['api_booking_id'],
                    'api_reservation_id' => $booking['api_reservation_id'],
                    'event_name' => $booking['event_name'],
                    'event_date' => $booking['event_date'],
                    'venue' => $booking['venue_name'] ?? 'TBD',
                    'venue_name' => $booking['venue_name'],
                    'seat_type' => $booking['category_name'] ?? 'General',
                    'category_name' => $booking['category_name'],
                    'quantity' => $booking['ticket_count'],
                    'ticket_count' => $booking['ticket_count'],
                    'total_amount' => (float)$booking['total_amount'],
                    'currency' => $booking['currency'],
                    'status' => $booking['status'],
                    'payment_status' => $booking['payment_status'],
                    'payment_method' => $booking['payment_method'],
                    'payment_reference' => $booking['payment_reference'],
                    'sport_type' => $booking['sport_type'],
                    'tournament_name' => $booking['tournament_name'],
                    'booking_date' => $booking['booking_date'],
                    'confirmed_at' => $booking['confirmed_at'],
                    'cancelled_at' => $booking['cancelled_at'],
                    'customer_notes' => $booking['customer_notes'],
                    'seat_info' => $booking['seat_info'] ? json_decode($booking['seat_info'], true) : null,
                    'ticket_info' => $booking['ticket_info'] ? json_decode($booking['ticket_info'], true) : null,
                    // E-Ticket fields
                    'eticket_status' => $booking['eticket_status'] ?? 'pending',
                    'eticket_available' => ($booking['eticket_status'] ?? 'pending') === 'available',
                    'eticket_available_date' => $booking['eticket_available_date'] ?? null,
                    'download_count' => (int)($booking['download_count'] ?? 0),
                    'xs2event_booking_status' => $booking['xs2event_booking_status'] ?? null,
                    'xs2event_booking_code' => $booking['xs2event_booking_code'] ?? null,
                    // Cancellation fields - include for all cancellation request statuses
                    'cancellation_status' => $booking['cancellation_request_status'] ?? $booking['cancellation_status'] ?? null,
                    'cancellation_date' => $booking['cancellation_date'] ?? null,
                    'cancellation_request_id' => $booking['cancellation_request_id'] ?? null,
                    'cancellation_request_date' => $booking['cancellation_request_date'] ?? null,
                    'cancellation_reason' => $booking['cancellation_reason'] ?? null
                ];
            }

            $responseData = [
                'success' => true,
                'data' => $formattedBookings,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => count($formattedBookings)
                ],
                'customer' => [
                    'id' => $customer['id'],
                    'email' => $customer['email'],
                    'first_name' => $customer['first_name'],
                    'last_name' => $customer['last_name']
                ]
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to get customer bookings', [
                'customer_email' => $customerEmail ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Convert ISO 8601 datetime to MySQL datetime format
     * @param string|null $datetime ISO 8601 datetime string (e.g., '2025-10-20T22:05:17.000Z')
     * @return string|null MySQL datetime format (e.g., '2025-10-20 22:05:17') or null
     */
    private function convertToMySQLDateTime(?string $datetime): ?string
    {
        if (empty($datetime)) {
            return null;
        }

        try {
            // Parse ISO 8601 datetime and convert to MySQL format
            $dateTime = new \DateTime($datetime);
            return $dateTime->format('Y-m-d H:i:s');
        } catch (\Exception $e) {
            $this->logger->warning('Failed to convert datetime format', [
                'input' => $datetime,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    private function errorResponse(Response $response, string $message, int $statusCode): ResponseInterface
    {
        $errorData = [
            'success' => false,
            'error' => $message,
            'code' => $statusCode
        ];

        $response->getBody()->write(json_encode($errorData));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }
}