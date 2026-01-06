<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;

class BookingOrdersController
{
    private const CACHE_TTL = 300; // 5 minutes for booking order data
    private const GUEST_CACHE_TTL = 600; // 10 minutes for guest data
    private string $apiBaseUrl;

    public function __construct(
        private LoggerInterface $logger,
        private Client $httpClient,
        private string $baseUrl,
        private string $apiKey
    ) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiBaseUrl = getenv('API_BASE_URL') ?: 'https://testapi.xs2event.com';
    }

    /**
     * Get booking orders list
     * GET /v1/bookingorders/list
     */
    public function getBookingOrders(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            $validatedParams = $this->buildBookingOrdersQuery($queryParams);
            
            $url = $this->apiBaseUrl . '/v1/bookingorders/list?' . http_build_query($validatedParams);
            
            $this->logger->info('Fetching booking orders list', [
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
            $this->logger->error('Failed to fetch booking orders', [
                'error' => $e->getMessage(),
                'url' => $url ?? 'unknown'
            ]);
            throw new ApiException('Failed to fetch booking orders: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single booking order
     * GET /v1/bookingorders/{bookingorder_id}
     */
    public function getBookingOrder(Request $request, Response $response, array $args): Response
    {
        try {
            $bookingorderId = $args['bookingorder_id'] ?? '';
            
            if (empty($bookingorderId)) {
                throw new ApiException('Booking order ID is required', 400);
            }

            $url = $this->apiBaseUrl . '/v1/bookingorders/' . urlencode($bookingorderId);
            
            $this->logger->info('Fetching single booking order', [
                'bookingorder_id' => $bookingorderId,
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
            $this->logger->error('Failed to fetch booking order', [
                'bookingorder_id' => $bookingorderId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to fetch booking order: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get booking order guest data
     * GET /v1/bookingorders/{bookingorder_id}/guestdata
     */
    public function getBookingOrderGuestData(Request $request, Response $response, array $args): Response
    {
        try {
            $bookingorderId = $args['bookingorder_id'] ?? '';
            
            if (empty($bookingorderId)) {
                throw new ApiException('Booking order ID is required', 400);
            }

            $queryParams = $request->getQueryParams();
            $validatedParams = $this->buildGuestDataQuery($queryParams);
            
            $url = $this->apiBaseUrl . '/v1/bookingorders/' . urlencode($bookingorderId) . '/guestdata';
            if (!empty($validatedParams)) {
                $url .= '?' . http_build_query($validatedParams);
            }
            
            $this->logger->info('Fetching booking order guest data', [
                'bookingorder_id' => $bookingorderId,
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
                ->withHeader('Cache-Control', 'public, max-age=' . self::GUEST_CACHE_TTL);
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to fetch booking order guest data', [
                'bookingorder_id' => $bookingorderId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to fetch booking order guest data: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update booking order guest data
     * PUT /v1/bookingorders/{bookingorder_id}/guestdata
     */
    public function updateBookingOrderGuestData(Request $request, Response $response, array $args): Response
    {
        try {
            $bookingorderId = $args['bookingorder_id'] ?? '';
            
            if (empty($bookingorderId)) {
                throw new ApiException('Booking order ID is required', 400);
            }

            $body = $request->getBody()->getContents();
            
            $this->logger->info('Updating booking order guest data', [
                'bookingorder_id' => $bookingorderId,
                'body_size' => strlen($body)
            ]);

            $url = $this->apiBaseUrl . '/v1/bookingorders/' . urlencode($bookingorderId) . '/guestdata';
            
            $apiResponse = $this->httpClient->put($url, [
                'headers' => $this->getHeaders($request),
                'body' => $body,
                'timeout' => 30
            ]);

            $response->getBody()->write($apiResponse->getBody()->getContents());
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($apiResponse->getStatusCode());
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to update booking order guest data', [
                'bookingorder_id' => $bookingorderId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to update booking order guest data: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single guest data from booking order
     * GET /v1/bookingorders/{bookingorder_id}/guestdata/{guest_id}
     */
    public function getBookingOrderGuestDetail(Request $request, Response $response, array $args): Response
    {
        try {
            $bookingorderId = $args['bookingorder_id'] ?? '';
            $guestId = $args['guest_id'] ?? '';
            
            if (empty($bookingorderId)) {
                throw new ApiException('Booking order ID is required', 400);
            }
            
            if (empty($guestId)) {
                throw new ApiException('Guest ID is required', 400);
            }

            $queryParams = $request->getQueryParams();
            $validatedParams = $this->buildGuestDataQuery($queryParams);
            
            $url = $this->apiBaseUrl . '/v1/bookingorders/' . urlencode($bookingorderId) . '/guestdata/' . urlencode($guestId);
            if (!empty($validatedParams)) {
                $url .= '?' . http_build_query($validatedParams);
            }
            
            $this->logger->info('Fetching single guest data from booking order', [
                'bookingorder_id' => $bookingorderId,
                'guest_id' => $guestId,
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
                ->withHeader('Cache-Control', 'public, max-age=' . self::GUEST_CACHE_TTL);
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to fetch guest data detail from booking order', [
                'bookingorder_id' => $bookingorderId ?? 'unknown',
                'guest_id' => $guestId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to fetch guest data detail: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update single guest data in booking order
     * PUT /v1/bookingorders/{bookingorder_id}/guestdata/{guest_id}
     */
    public function updateBookingOrderGuestDetail(Request $request, Response $response, array $args): Response
    {
        try {
            $bookingorderId = $args['bookingorder_id'] ?? '';
            $guestId = $args['guest_id'] ?? '';
            
            if (empty($bookingorderId)) {
                throw new ApiException('Booking order ID is required', 400);
            }
            
            if (empty($guestId)) {
                throw new ApiException('Guest ID is required', 400);
            }

            $body = $request->getBody()->getContents();
            
            $this->logger->info('Updating single guest data in booking order', [
                'bookingorder_id' => $bookingorderId,
                'guest_id' => $guestId,
                'body_size' => strlen($body)
            ]);

            $url = $this->apiBaseUrl . '/v1/bookingorders/' . urlencode($bookingorderId) . '/guestdata/' . urlencode($guestId);
            
            $apiResponse = $this->httpClient->put($url, [
                'headers' => $this->getHeaders($request),
                'body' => $body,
                'timeout' => 30
            ]);

            $response->getBody()->write($apiResponse->getBody()->getContents());
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($apiResponse->getStatusCode());
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to update guest data detail in booking order', [
                'bookingorder_id' => $bookingorderId ?? 'unknown',
                'guest_id' => $guestId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to update guest data detail: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Build query parameters for booking orders list endpoint
     */
    private function buildBookingOrdersQuery(array $queryParams): array
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

        if (isset($queryParams['ticket_id']) && is_string($queryParams['ticket_id'])) {
            $validParams['ticket_id'] = trim($queryParams['ticket_id']);
        }

        if (isset($queryParams['event_id']) && is_string($queryParams['event_id'])) {
            $validParams['event_id'] = trim($queryParams['event_id']);
        }

        if (isset($queryParams['booking_code']) && is_string($queryParams['booking_code'])) {
            $validParams['booking_code'] = trim($queryParams['booking_code']);
        }

        // Email filter
        if (isset($queryParams['booking_email']) && is_string($queryParams['booking_email'])) {
            $validParams['booking_email'] = trim($queryParams['booking_email']);
        }

        // Text search
        if (isset($queryParams['query']) && is_string($queryParams['query'])) {
            $validParams['query'] = trim($queryParams['query']);
        }

        // Compare mode filter
        if (isset($queryParams['compare_mode'])) {
            $validModes = ['AND', 'OR'];
            if (in_array(strtoupper($queryParams['compare_mode']), $validModes, true)) {
                $validParams['compare_mode'] = strtoupper($queryParams['compare_mode']);
            }
        }

        // Date filters
        if (isset($queryParams['event_startdate']) && $this->isValidDate($queryParams['event_startdate'])) {
            $validParams['event_startdate'] = $queryParams['event_startdate'];
        }

        if (isset($queryParams['event_stopdate']) && $this->isValidDate($queryParams['event_stopdate'])) {
            $validParams['event_stopdate'] = $queryParams['event_stopdate'];
        }

        if (isset($queryParams['created']) && $this->isValidDate($queryParams['created'])) {
            $validParams['created'] = $queryParams['created'];
        }

        // Boolean filters
        if (isset($queryParams['api_booking'])) {
            $validParams['api_booking'] = $this->convertToBoolean($queryParams['api_booking']);
        }

        // Guest data status enum
        if (isset($queryParams['guestdata_status'])) {
            $validStatuses = [
                'waitingfordistributor',
                'waitingforprocessing',
                'completed',
                'waitingforendcustomer',
                'notapplicable',
                'waitingtosendtosupplier'
            ];
            if (in_array($queryParams['guestdata_status'], $validStatuses, true)) {
                $validParams['guestdata_status'] = $queryParams['guestdata_status'];
            }
        }

        // Sport type filter
        if (isset($queryParams['sport_type']) && is_string($queryParams['sport_type'])) {
            $validParams['sport_type'] = trim($queryParams['sport_type']);
        }

        return $validParams;
    }

    /**
     * Build query parameters for guest data endpoints
     */
    private function buildGuestDataQuery(array $queryParams): array
    {
        $validParams = [];

        // Sorting parameter
        if (isset($queryParams['sorting']) && is_string($queryParams['sorting'])) {
            $validParams['sorting'] = trim($queryParams['sorting']);
        }

        // Boolean flags
        if (isset($queryParams['include_conditions'])) {
            $validParams['include_conditions'] = $this->convertToBoolean($queryParams['include_conditions']);
        }

        // Country hint for localization
        if (isset($queryParams['country_hint']) && is_string($queryParams['country_hint'])) {
            $validParams['country_hint'] = trim($queryParams['country_hint']);
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
     * Validate date format (YYYY-MM-DD)
     */
    private function isValidDate(string $date): bool
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $parsedDate = \DateTime::createFromFormat('Y-m-d', $date);
            return $parsedDate && $parsedDate->format('Y-m-d') === $date;
        }
        
        return false;
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
