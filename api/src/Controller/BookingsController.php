<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;

class BookingsController
{
    private const CACHE_TTL = 300; // 5 minutes for booking data

    public function __construct(
        private LoggerInterface $logger,
        private Client $httpClient,
        private string $baseUrl,
        private string $apiKey
    ) {
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    /**
     * Get bookings on reservation ID
     * GET /v1/bookings/reservation/{reservation_id}
     */
    public function getBookingsByReservation(Request $request, Response $response, array $args): Response
    {
        try {
            $reservationId = $args['reservation_id'] ?? '';
            
            if (empty($reservationId)) {
                throw new ApiException('Reservation ID is required', 400);
            }

            $queryParams = $request->getQueryParams();
            $validatedParams = $this->buildReservationBookingQuery($queryParams);
            
            $url = $this->baseUrl . '/v1/bookings/reservation/' . urlencode($reservationId);
            if (!empty($validatedParams)) {
                $url .= '?' . http_build_query($validatedParams);
            }
            
            $this->logger->info('Fetching bookings by reservation', [
                'reservation_id' => $reservationId,
                'url' => $url,
                'parameters' => $validatedParams
            ]);

            $apiResponse = $this->httpClient->get($url, [
                'headers' => $this->getHeaders($request),
                'timeout' => 30
            ]);

            $response->getBody()->write($apiResponse->getBody()->getContents());
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($apiResponse->getStatusCode())
                ->withHeader('Cache-Control', 'public, max-age=' . self::CACHE_TTL);
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to fetch bookings by reservation', [
                'reservation_id' => $reservationId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to fetch bookings by reservation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get bookings list
     * GET /v1/bookings
     */
    public function getBookings(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            $validatedParams = $this->buildBookingsQuery($queryParams);
            
            $url = $this->baseUrl . '/v1/bookings?' . http_build_query($validatedParams);
            
            $this->logger->info('Fetching bookings list', [
                'url' => $url,
                'parameters' => $validatedParams
            ]);

            $apiResponse = $this->httpClient->get($url, [
                'headers' => $this->getHeaders($request),
                'timeout' => 30
            ]);

            $response->getBody()->write($apiResponse->getBody()->getContents());
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($apiResponse->getStatusCode())
                ->withHeader('Cache-Control', 'public, max-age=' . self::CACHE_TTL);
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to fetch bookings', [
                'error' => $e->getMessage(),
                'url' => $url ?? 'unknown'
            ]);
            throw new ApiException('Failed to fetch bookings: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create a booking from a reservation
     * POST /v1/bookings
     */
    public function createBooking(Request $request, Response $response): Response
    {
        try {
            $body = $request->getBody()->getContents();
            
            $this->logger->info('Creating new booking', [
                'body_size' => strlen($body),
                'body_content' => $body
            ]);

            $url = $this->baseUrl . '/v1/bookings';
            
            $apiResponse = $this->httpClient->post($url, [
                'headers' => $this->getHeaders($request),
                'body' => $body,
                'timeout' => 60 // Longer timeout for booking creation
            ]);

            $response->getBody()->write($apiResponse->getBody()->getContents());
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($apiResponse->getStatusCode());
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to create booking', [
                'error' => $e->getMessage(),
                'request_body' => $body ?? 'unknown',
                'status_code' => $e->getCode(),
                'response_body' => $e->hasResponse() ? $e->getResponse()->getBody()->getContents() : 'no response'
            ]);
            throw new ApiException('Failed to create booking: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single booking
     * GET /v1/bookings/{booking_id}
     */
    public function getBooking(Request $request, Response $response, array $args): Response
    {
        try {
            $bookingId = $args['booking_id'] ?? '';
            
            if (empty($bookingId)) {
                throw new ApiException('Booking ID is required', 400);
            }

            $url = $this->baseUrl . '/v1/bookings/' . urlencode($bookingId);
            
            $this->logger->info('Fetching single booking', [
                'booking_id' => $bookingId,
                'url' => $url
            ]);

            $apiResponse = $this->httpClient->get($url, [
                'headers' => $this->getHeaders($request),
                'timeout' => 30
            ]);

            $response->getBody()->write($apiResponse->getBody()->getContents());
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($apiResponse->getStatusCode())
                ->withHeader('Cache-Control', 'public, max-age=' . self::CACHE_TTL);
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to fetch booking', [
                'booking_id' => $bookingId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to fetch booking: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Build query parameters for reservation booking endpoint
     */
    private function buildReservationBookingQuery(array $queryParams): array
    {
        $validParams = [];

        // Sorting parameter
        if (isset($queryParams['sorting']) && is_string($queryParams['sorting'])) {
            $validParams['sorting'] = trim($queryParams['sorting']);
        }

        return $validParams;
    }

    /**
     * Build query parameters for bookings list endpoint
     */
    private function buildBookingsQuery(array $queryParams): array
    {
        $validParams = [];

        // Sorting parameter
        if (isset($queryParams['sorting']) && is_string($queryParams['sorting'])) {
            $validParams['sorting'] = trim($queryParams['sorting']);
        }

        // Pagination
        if (isset($queryParams['page_size'])) {
            $pageSize = (int) $queryParams['page_size'];
            if ($pageSize > 0 && $pageSize <= 500) {
                $validParams['page_size'] = $pageSize;
            }
        }

        if (isset($queryParams['page'])) {
            $page = (int) $queryParams['page'];
            if ($page > 0) {
                $validParams['page'] = $page;
            }
        }

        // ID filters
        if (isset($queryParams['reservation_id']) && is_string($queryParams['reservation_id'])) {
            $validParams['reservation_id'] = trim($queryParams['reservation_id']);
        }

        if (isset($queryParams['booking_id']) && is_string($queryParams['booking_id'])) {
            $validParams['booking_id'] = trim($queryParams['booking_id']);
        }

        if (isset($queryParams['booking_code']) && is_string($queryParams['booking_code'])) {
            $validParams['booking_code'] = trim($queryParams['booking_code']);
        }

        if (isset($queryParams['distributor_id']) && is_string($queryParams['distributor_id'])) {
            $validParams['distributor_id'] = trim($queryParams['distributor_id']);
        }

        if (isset($queryParams['client_id']) && is_string($queryParams['client_id'])) {
            $validParams['client_id'] = trim($queryParams['client_id']);
        }

        if (isset($queryParams['event_id']) && is_string($queryParams['event_id'])) {
            $validParams['event_id'] = trim($queryParams['event_id']);
        }

        // Email filter
        if (isset($queryParams['booking_email']) && is_string($queryParams['booking_email'])) {
            $validParams['booking_email'] = trim($queryParams['booking_email']);
        }

        // Compare mode filter
        if (isset($queryParams['compare_mode'])) {
            $validModes = ['AND', 'OR'];
            if (in_array(strtoupper($queryParams['compare_mode']), $validModes, true)) {
                $validParams['compare_mode'] = strtoupper($queryParams['compare_mode']);
            }
        }

        // Text search
        if (isset($queryParams['query']) && is_string($queryParams['query'])) {
            $validParams['query'] = trim($queryParams['query']);
        }

        // Mass booking filter
        if (isset($queryParams['mass_booking'])) {
            $validParams['mass_booking'] = $this->convertToBoolean($queryParams['mass_booking']);
        }

        return $validParams;
    }

    /**
     * Convert string boolean values to actual booleans
     */
    private function convertToBoolean(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        
        if (is_string($value)) {
            return in_array(strtolower($value), ['true', '1', 'yes', 'on'], true);
        }
        
        return (bool) $value;
    }

    /**
     * Get headers for API requests
     */
    private function getHeaders(Request $request): array
    {
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ];

        // Forward X-Api-Key header
        if ($request->hasHeader('X-Api-Key')) {
            $headers['X-Api-Key'] = $request->getHeaderLine('X-Api-Key');
        }

        return $headers;
    }
}
