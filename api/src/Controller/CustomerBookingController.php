<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use XS2EventProxy\Repository\CustomerRepository;
use XS2EventProxy\Service\CustomerJWTService;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;
use GuzzleHttp\Client;

class CustomerBookingController
{
    private CustomerRepository $customerRepository;
    private CustomerJWTService $jwtService;
    private LoggerInterface $logger;
    private Client $httpClient;
    private string $apiBaseUrl;
    private string $apiKey;

    public function __construct(
        CustomerRepository $customerRepository,
        CustomerJWTService $jwtService,
        LoggerInterface $logger,
        Client $httpClient,
        string $apiBaseUrl,
        string $apiKey
    ) {
        $this->customerRepository = $customerRepository;
        $this->jwtService = $jwtService;
        $this->logger = $logger;
        $this->httpClient = $httpClient;
        $this->apiBaseUrl = $apiBaseUrl;
        $this->apiKey = $apiKey;
    }

    /**
     * Get customer's bookings
     */
    public function getCustomerBookings(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $customerId = $customer['id'];
            
            // Get query parameters for filtering
            $queryParams = $request->getQueryParams();
            $page = max(1, (int)($queryParams['page'] ?? 1));
            $limit = min(50, max(1, (int)($queryParams['limit'] ?? 10)));
            $status = $queryParams['status'] ?? null;
            $eventId = $queryParams['event_id'] ?? null;

            $this->logger->info('Customer bookings request', [
                'customer_id' => $customerId,
                'page' => $page,
                'limit' => $limit,
                'status' => $status,
                'event_id' => $eventId
            ]);

            // Build query for external API
            $apiParams = [
                'page' => $page,
                'limit' => $limit
            ];
            
            if ($status) {
                $apiParams['status'] = $status;
            }
            
            if ($eventId) {
                $apiParams['event_id'] = $eventId;
            }

            // Get bookings from external API filtered by customer
            $apiResponse = $this->httpClient->get($this->apiBaseUrl . '/v1/bookings', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json'
                ],
                'query' => $apiParams
            ]);

            $bookingsData = json_decode($apiResponse->getBody()->getContents(), true);
            
            // Filter bookings by customer email/id
            $customerEmail = $customer['email'];
            $filteredBookings = [];
            
            if (isset($bookingsData['data'])) {
                foreach ($bookingsData['data'] as $booking) {
                    // Check if booking belongs to this customer
                    if (isset($booking['customer_email']) && $booking['customer_email'] === $customerEmail) {
                        $filteredBookings[] = $booking;
                    }
                }
            }

            $responseData = [
                'success' => true,
                'data' => $filteredBookings,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => count($filteredBookings)
                ]
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Failed to get customer bookings', [
                'error' => $e->getMessage(),
                'customer_id' => $customer['id'] ?? null
            ]);

            $errorResponse = [
                'success' => false,
                'message' => 'Failed to retrieve bookings',
                'error' => $e->getMessage()
            ];

            $response->getBody()->write(json_encode($errorResponse));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Create a booking for the authenticated customer
     */
    public function createBooking(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $data = $request->getParsedBody();

            $this->logger->info('Customer booking creation request', [
                'customer_id' => $customer['id'],
                'customer_email' => $customer['email'],
                'booking_data' => $data
            ]);

            // Validate required fields
            $requiredFields = ['reservation_id', 'payment_method'];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    throw new \InvalidArgumentException("Missing required field: {$field}");
                }
            }

            // Add customer information to booking data
            $bookingData = array_merge($data, [
                'customer_email' => $customer['email'],
                'customer_name' => $customer['first_name'] . ' ' . $customer['last_name'],
                'customer_phone' => $customer['phone'] ?? null
            ]);

            // Create booking via external API
            $apiResponse = $this->httpClient->post($this->apiBaseUrl . '/v1/bookings', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json'
                ],
                'json' => $bookingData
            ]);

            $responseData = json_decode($apiResponse->getBody()->getContents(), true);

            $this->logger->info('Booking created successfully', [
                'customer_id' => $customer['id'],
                'booking_id' => $responseData['data']['booking_id'] ?? null
            ]);

            $response->getBody()->write(json_encode($responseData));
            return $response->withStatus(201)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Failed to create booking', [
                'error' => $e->getMessage(),
                'customer_id' => $customer['id'] ?? null,
                'request_data' => $data ?? null
            ]);

            $errorResponse = [
                'success' => false,
                'message' => 'Failed to create booking',
                'error' => $e->getMessage()
            ];

            $response->getBody()->write(json_encode($errorResponse));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Get a specific booking for the authenticated customer
     */
    public function getBooking(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $bookingId = $request->getAttribute('booking_id');

            $this->logger->info('Customer booking details request', [
                'customer_id' => $customer['id'],
                'booking_id' => $bookingId
            ]);

            // Get booking from external API
            $apiResponse = $this->httpClient->get($this->apiBaseUrl . '/v1/bookings/' . $bookingId, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Accept' => 'application/json'
                ]
            ]);

            $bookingData = json_decode($apiResponse->getBody()->getContents(), true);

            // Verify booking belongs to this customer
            if (!isset($bookingData['data']['customer_email']) || 
                $bookingData['data']['customer_email'] !== $customer['email']) {
                throw new \Exception('Booking not found or access denied');
            }

            $response->getBody()->write(json_encode($bookingData));
            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Failed to get booking details', [
                'error' => $e->getMessage(),
                'customer_id' => $customer['id'] ?? null,
                'booking_id' => $bookingId ?? null
            ]);

            $errorResponse = [
                'success' => false,
                'message' => 'Booking not found',
                'error' => $e->getMessage()
            ];

            $response->getBody()->write(json_encode($errorResponse));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Create a reservation for the authenticated customer
     */
    public function createReservation(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $data = $request->getParsedBody();

            $this->logger->info('Customer reservation creation request', [
                'customer_id' => $customer['id'],
                'customer_email' => $customer['email'],
                'reservation_data' => $data
            ]);

            // Validate required fields
            $requiredFields = ['event_id', 'ticket_id', 'quantity'];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    throw new \InvalidArgumentException("Missing required field: {$field}");
                }
            }

            // Add customer information to reservation data
            $reservationData = array_merge($data, [
                'customer_email' => $customer['email'],
                'customer_name' => $customer['first_name'] . ' ' . $customer['last_name'],
                'customer_phone' => $customer['phone'] ?? null
            ]);

            // Create reservation via external API
            $apiResponse = $this->httpClient->post($this->apiBaseUrl . '/v1/reservations', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json'
                ],
                'json' => $reservationData
            ]);

            $responseData = json_decode($apiResponse->getBody()->getContents(), true);

            $this->logger->info('Reservation created successfully', [
                'customer_id' => $customer['id'],
                'reservation_id' => $responseData['data']['reservation_id'] ?? null
            ]);

            $response->getBody()->write(json_encode($responseData));
            return $response->withStatus(201)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Failed to create reservation', [
                'error' => $e->getMessage(),
                'customer_id' => $customer['id'] ?? null,
                'request_data' => $data ?? null
            ]);

            $errorResponse = [
                'success' => false,
                'message' => 'Failed to create reservation',
                'error' => $e->getMessage()
            ];

            $response->getBody()->write(json_encode($errorResponse));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Get customer's reservations
     */
    public function getCustomerReservations(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $customerId = $customer['id'];
            
            // Get query parameters for filtering
            $queryParams = $request->getQueryParams();
            $page = max(1, (int)($queryParams['page'] ?? 1));
            $limit = min(50, max(1, (int)($queryParams['limit'] ?? 10)));
            $status = $queryParams['status'] ?? null;

            $this->logger->info('Customer reservations request', [
                'customer_id' => $customerId,
                'page' => $page,
                'limit' => $limit,
                'status' => $status
            ]);

            // Build query for external API
            $apiParams = [
                'page' => $page,
                'limit' => $limit
            ];
            
            if ($status) {
                $apiParams['status'] = $status;
            }

            // Get reservations from external API
            $apiResponse = $this->httpClient->get($this->apiBaseUrl . '/v1/reservations', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Accept' => 'application/json'
                ],
                'query' => $apiParams
            ]);

            $reservationsData = json_decode($apiResponse->getBody()->getContents(), true);
            
            // Filter reservations by customer email
            $customerEmail = $customer['email'];
            $filteredReservations = [];
            
            if (isset($reservationsData['data'])) {
                foreach ($reservationsData['data'] as $reservation) {
                    // Check if reservation belongs to this customer
                    if (isset($reservation['customer_email']) && $reservation['customer_email'] === $customerEmail) {
                        $filteredReservations[] = $reservation;
                    }
                }
            }

            $responseData = [
                'success' => true,
                'data' => $filteredReservations,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => count($filteredReservations)
                ]
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Failed to get customer reservations', [
                'error' => $e->getMessage(),
                'customer_id' => $customer['id'] ?? null
            ]);

            $errorResponse = [
                'success' => false,
                'message' => 'Failed to retrieve reservations',
                'error' => $e->getMessage()
            ];

            $response->getBody()->write(json_encode($errorResponse));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }
}