<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;

class ReservationsController
{
    private const CACHE_TTL = 300; // 5 minutes for reservation data
    private const GUEST_CACHE_TTL = 600; // 10 minutes for guest data
    private string $apiBaseUrl;

    public function __construct(
        private Client $httpClient,
        private LoggerInterface $logger
    ) {
        $this->apiBaseUrl = getenv('API_BASE_URL') ?: 'https://testapi.xs2event.com';
    }

    /**
     * Get list of reservations
     * GET /v1/reservations
     */
    public function getReservations(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            $validatedParams = $this->buildReservationsQuery($queryParams);
            
            $url = $this->apiBaseUrl . '/v1/reservations?' . http_build_query($validatedParams);
            
            $this->logger->info('Fetching reservations list', [
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
            $this->logger->error('Failed to fetch reservations', [
                'error' => $e->getMessage(),
                'url' => $url ?? 'unknown'
            ]);
            throw new ApiException('Failed to fetch reservations: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create a new reservation
     * POST /v1/reservations
     */
    public function createReservation(Request $request, Response $response): Response
    {
        try {
            $body = $request->getBody()->getContents();
            
            $this->logger->info('Creating new reservation', [
                'body_size' => strlen($body),
                'body_preview' => substr($body, 0, 500)
            ]);

            $url = $this->apiBaseUrl . '/v1/reservations';
            
            $apiResponse = $this->httpClient->post($url, [
                'headers' => $this->getHeaders($request),
                'body' => $body,
                'timeout' => 30
            ]);

            $responseBody = $apiResponse->getBody()->getContents();
            $statusCode = $apiResponse->getStatusCode();
            
            // Log the response with status and body preview
            $this->logger->info('XS2Event reservation response received', [
                'status_code' => $statusCode,
                'response_preview' => substr($responseBody, 0, 500)
            ]);

            $response->getBody()->write($responseBody);
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($statusCode);
                
        } catch (RequestException $e) {
            // Get the actual error response from XS2Event API
            $statusCode = $e->hasResponse() ? $e->getResponse()->getStatusCode() : 500;
            $errorBody = $e->hasResponse() ? $e->getResponse()->getBody()->getContents() : '{"error": "Unknown error"}';
            
            $this->logger->error('Failed to create reservation', [
                'status_code' => $statusCode,
                'error_message' => $e->getMessage(),
                'error_body' => $errorBody
            ]);
            
            // Forward the actual error response from XS2Event
            $response->getBody()->write($errorBody);
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($statusCode);
        }
    }

    /**
     * Get single reservation
     * GET /v1/reservations/{reservation_id}
     */
    public function getReservation(Request $request, Response $response, array $args): Response
    {
        try {
            $reservationId = $args['reservation_id'] ?? '';
            
            if (empty($reservationId)) {
                throw new ApiException('Reservation ID is required', 400);
            }

            $url = $this->apiBaseUrl . '/v1/reservations/' . urlencode($reservationId);
            
            $this->logger->info('Fetching single reservation', [
                'reservation_id' => $reservationId,
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
            $this->logger->error('Failed to fetch reservation', [
                'reservation_id' => $reservationId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to fetch reservation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update reservation
     * PUT /v1/reservations/{reservation_id}
     */
    public function updateReservation(Request $request, Response $response, array $args): Response
    {
        try {
            $reservationId = $args['reservation_id'] ?? '';
            
            if (empty($reservationId)) {
                throw new ApiException('Reservation ID is required', 400);
            }

            $body = $request->getBody()->getContents();
            
            $this->logger->info('Updating reservation', [
                'reservation_id' => $reservationId,
                'body_size' => strlen($body)
            ]);

            $url = $this->apiBaseUrl . '/v1/reservations/' . urlencode($reservationId);
            
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
            $this->logger->error('Failed to update reservation', [
                'reservation_id' => $reservationId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to update reservation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete reservation
     * DELETE /v1/reservations/{reservation_id}
     */
    public function deleteReservation(Request $request, Response $response, array $args): Response
    {
        try {
            $reservationId = $args['reservation_id'] ?? '';
            
            if (empty($reservationId)) {
                throw new ApiException('Reservation ID is required', 400);
            }

            $url = $this->apiBaseUrl . '/v1/reservations/' . urlencode($reservationId);
            
            $this->logger->info('Deleting reservation', [
                'reservation_id' => $reservationId,
                'url' => $url
            ]);

            $apiResponse = $this->httpClient->delete($url, [
                'headers' => $this->getHeaders($request),
                'timeout' => 30
            ]);

            $response->getBody()->write($apiResponse->getBody()->getContents());
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($apiResponse->getStatusCode());
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to delete reservation', [
                'reservation_id' => $reservationId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to delete reservation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Partial update reservation
     * PATCH /v1/reservations/{reservation_id}
     */
    public function patchReservation(Request $request, Response $response, array $args): Response
    {
        try {
            $reservationId = $args['reservation_id'] ?? '';
            
            if (empty($reservationId)) {
                throw new ApiException('Reservation ID is required', 400);
            }

            $body = $request->getBody()->getContents();
            
            $this->logger->info('Patching reservation', [
                'reservation_id' => $reservationId,
                'body_size' => strlen($body)
            ]);

            $url = $this->apiBaseUrl . '/v1/reservations/' . urlencode($reservationId);
            
            $apiResponse = $this->httpClient->patch($url, [
                'headers' => $this->getHeaders($request),
                'body' => $body,
                'timeout' => 30
            ]);

            $response->getBody()->write($apiResponse->getBody()->getContents());
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($apiResponse->getStatusCode());
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to patch reservation', [
                'reservation_id' => $reservationId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to patch reservation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get reservation guest data
     * GET /v1/reservations/{reservation_id}/guestdata
     */
    public function getReservationGuestData(Request $request, Response $response, array $args): Response
    {
        try {
            $reservationId = $args['reservation_id'] ?? '';
            
            if (empty($reservationId)) {
                throw new ApiException('Reservation ID is required', 400);
            }

            $queryParams = $request->getQueryParams();
            $validatedParams = $this->buildGuestDataQuery($queryParams);
            
            $url = $this->apiBaseUrl . '/v1/reservations/' . urlencode($reservationId) . '/guestdata';
            if (!empty($validatedParams)) {
                $url .= '?' . http_build_query($validatedParams);
            }
            
            $this->logger->info('Fetching reservation guest data', [
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
                ->withHeader('Cache-Control', 'public, max-age=' . self::GUEST_CACHE_TTL);
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to fetch reservation guest data', [
                'reservation_id' => $reservationId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to fetch reservation guest data: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Add reservation guest data
     * POST /v1/reservations/{reservation_id}/guests
     */
    public function addReservationGuests(Request $request, Response $response, array $args): Response
    {
        try {
            $reservationId = $args['reservation_id'] ?? '';
            
            if (empty($reservationId)) {
                throw new ApiException('Reservation ID is required', 400);
            }

            $body = $request->getBody()->getContents();
            
            $this->logger->info('Adding reservation guests', [
                'reservation_id' => $reservationId,
                'body_size' => strlen($body)
            ]);

            $url = $this->apiBaseUrl . '/v1/reservations/' . urlencode($reservationId) . '/guests';
            
            $apiResponse = $this->httpClient->post($url, [
                'headers' => $this->getHeaders($request),
                'body' => $body,
                'timeout' => 30
            ]);

            $response->getBody()->write($apiResponse->getBody()->getContents());
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($apiResponse->getStatusCode());
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to add reservation guests', [
                'reservation_id' => $reservationId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to add reservation guests: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single guest data
     * GET /v1/reservations/{reservation_id}/guestdata/{guest_id}
     */
    public function getReservationGuestDetail(Request $request, Response $response, array $args): Response
    {
        try {
            $reservationId = $args['reservation_id'] ?? '';
            $guestId = $args['guest_id'] ?? '';
            
            if (empty($reservationId)) {
                throw new ApiException('Reservation ID is required', 400);
            }
            
            if (empty($guestId)) {
                throw new ApiException('Guest ID is required', 400);
            }

            $url = $this->apiBaseUrl . '/v1/reservations/' . urlencode($reservationId) . '/guestdata/' . urlencode($guestId);
            
            $this->logger->info('Fetching single guest data', [
                'reservation_id' => $reservationId,
                'guest_id' => $guestId,
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
                ->withHeader('Cache-Control', 'public, max-age=' . self::GUEST_CACHE_TTL);
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to fetch guest data detail', [
                'reservation_id' => $reservationId ?? 'unknown',
                'guest_id' => $guestId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to fetch guest data detail: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update single guest data
     * PUT /v1/reservations/{reservation_id}/guestdata/{guest_id}
     */
    public function updateReservationGuestDetail(Request $request, Response $response, array $args): Response
    {
        try {
            $reservationId = $args['reservation_id'] ?? '';
            $guestId = $args['guest_id'] ?? '';
            
            if (empty($reservationId)) {
                throw new ApiException('Reservation ID is required', 400);
            }
            
            if (empty($guestId)) {
                throw new ApiException('Guest ID is required', 400);
            }

            $body = $request->getBody()->getContents();
            
            $this->logger->info('Updating guest data detail', [
                'reservation_id' => $reservationId,
                'guest_id' => $guestId,
                'body_size' => strlen($body)
            ]);

            $url = $this->apiBaseUrl . '/v1/reservations/' . urlencode($reservationId) . '/guestdata/' . urlencode($guestId);
            
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
            $this->logger->error('Failed to update guest data detail', [
                'reservation_id' => $reservationId ?? 'unknown',
                'guest_id' => $guestId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to update guest data detail: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Build query parameters for reservations list endpoint
     */
    private function buildReservationsQuery(array $queryParams): array
    {
        $validParams = [];

        // Sorting parameters
        if (isset($queryParams['sort'])) {
            $validSorts = ['id', 'created', 'valid_until', 'updated'];
            if (in_array($queryParams['sort'], $validSorts, true)) {
                $validParams['sort'] = $queryParams['sort'];
            }
        }

        if (isset($queryParams['sort_direction'])) {
            $validDirections = ['asc', 'desc'];
            if (in_array(strtolower($queryParams['sort_direction']), $validDirections, true)) {
                $validParams['sort_direction'] = strtolower($queryParams['sort_direction']);
            }
        }

        // Pagination
        if (isset($queryParams['page'])) {
            $page = (int) $queryParams['page'];
            if ($page > 0) {
                $validParams['page'] = $page;
            }
        }

        if (isset($queryParams['limit'])) {
            $limit = (int) $queryParams['limit'];
            if ($limit > 0 && $limit <= 500) {
                $validParams['limit'] = $limit;
            }
        }

        // Date filters
        if (isset($queryParams['created_from']) && $this->isValidDate($queryParams['created_from'])) {
            $validParams['created_from'] = $queryParams['created_from'];
        }

        if (isset($queryParams['created_until']) && $this->isValidDate($queryParams['created_until'])) {
            $validParams['created_until'] = $queryParams['created_until'];
        }

        if (isset($queryParams['valid_until_from']) && $this->isValidDate($queryParams['valid_until_from'])) {
            $validParams['valid_until_from'] = $queryParams['valid_until_from'];
        }

        if (isset($queryParams['valid_until_until']) && $this->isValidDate($queryParams['valid_until_until'])) {
            $validParams['valid_until_until'] = $queryParams['valid_until_until'];
        }

        // Status enum filter
        if (isset($queryParams['status'])) {
            $validStatuses = ['active', 'booked', 'void', 'error', 'extended'];
            if (in_array($queryParams['status'], $validStatuses, true)) {
                $validParams['status'] = $queryParams['status'];
            }
        }

        // Text search
        if (isset($queryParams['query']) && is_string($queryParams['query'])) {
            $validParams['query'] = trim($queryParams['query']);
        }

        // ID filters
        if (isset($queryParams['event_id']) && is_string($queryParams['event_id'])) {
            $validParams['event_id'] = trim($queryParams['event_id']);
        }

        if (isset($queryParams['distributor_id']) && is_string($queryParams['distributor_id'])) {
            $validParams['distributor_id'] = trim($queryParams['distributor_id']);
        }

        if (isset($queryParams['ticket_id']) && is_string($queryParams['ticket_id'])) {
            $validParams['ticket_id'] = trim($queryParams['ticket_id']);
        }

        // Boolean filters
        if (isset($queryParams['on_behalf'])) {
            $validParams['on_behalf'] = $this->convertToBoolean($queryParams['on_behalf']);
        }

        // Sport type filter
        if (isset($queryParams['sport_type']) && is_string($queryParams['sport_type'])) {
            $validParams['sport_type'] = trim($queryParams['sport_type']);
        }

        return $validParams;
    }

    /**
     * Build query parameters for guest data endpoint
     */
    private function buildGuestDataQuery(array $queryParams): array
    {
        $validParams = [];

        // Sorting parameters
        if (isset($queryParams['sort'])) {
            $validSorts = ['first_name', 'last_name', 'email'];
            if (in_array($queryParams['sort'], $validSorts, true)) {
                $validParams['sort'] = $queryParams['sort'];
            }
        }

        if (isset($queryParams['sort_direction'])) {
            $validDirections = ['asc', 'desc'];
            if (in_array(strtolower($queryParams['sort_direction']), $validDirections, true)) {
                $validParams['sort_direction'] = strtolower($queryParams['sort_direction']);
            }
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
     * Validate date format (YYYY-MM-DD or ISO 8601)
     */
    private function isValidDate(string $date): bool
    {
        // Check for YYYY-MM-DD format
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $parsedDate = \DateTime::createFromFormat('Y-m-d', $date);
            return $parsedDate && $parsedDate->format('Y-m-d') === $date;
        }
        
        // Check for ISO 8601 format with time
        $parsedDate = \DateTime::createFromFormat(\DateTime::ATOM, $date);
        if ($parsedDate) {
            return true;
        }
        
        // Check for ISO 8601 format without timezone
        $parsedDate = \DateTime::createFromFormat('Y-m-d\TH:i:s', $date);
        return $parsedDate && $parsedDate->format('Y-m-d\TH:i:s') === $date;
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
