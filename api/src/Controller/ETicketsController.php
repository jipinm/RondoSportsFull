<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;

class ETicketsController
{
    private const CACHE_TTL = 60; // 1 minute for download links (short lived)
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
     * List e-tickets for a booking
     * GET /v1/etickets
     */
    public function listETickets(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            $validatedParams = $this->buildETicketsQuery($queryParams);
            
            $url = $this->apiBaseUrl . '/v1/etickets?' . http_build_query($validatedParams);
            
            $this->logger->info('Fetching e-tickets list', [
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
            $this->logger->error('Failed to fetch e-tickets', [
                'error' => $e->getMessage(),
                'url' => $url ?? 'unknown'
            ]);
            throw new ApiException('Failed to fetch e-tickets: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get link to E-tickets zipfile
     * GET /v1/etickets/download/zip/{bookingorder_id}
     */
    public function getETicketsZipUrl(Request $request, Response $response, array $args): Response
    {
        try {
            $bookingorderId = $args['bookingorder_id'] ?? '';
            
            if (empty($bookingorderId)) {
                throw new ApiException('Booking order ID is required', 400);
            }

            $url = $this->apiBaseUrl . '/v1/etickets/download/zip/' . urlencode($bookingorderId);
            
            $this->logger->info('Fetching e-tickets zip download URL', [
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
            $this->logger->error('Failed to fetch e-tickets zip URL', [
                'bookingorder_id' => $bookingorderId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to fetch e-tickets zip URL: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Download single e-ticket PDF
     * GET /v1/etickets/download/{bookingorder_id}/{orderitem_id}/url/{url}
     */
    public function downloadETicket(Request $request, Response $response, array $args): Response
    {
        try {
            $bookingorderId = $args['bookingorder_id'] ?? '';
            $orderitemId = $args['orderitem_id'] ?? '';
            $ticketUrl = $args['url'] ?? '';
            
            if (empty($bookingorderId)) {
                throw new ApiException('Booking order ID is required', 400);
            }
            
            if (empty($orderitemId)) {
                throw new ApiException('Order item ID is required', 400);
            }
            
            if (empty($ticketUrl)) {
                throw new ApiException('Ticket URL is required', 400);
            }

            // Build the API URL - note that the URL parameter might contain encoded characters
            $apiUrl = $this->apiBaseUrl . '/v1/etickets/download/' . 
                     urlencode($bookingorderId) . '/' . 
                     urlencode($orderitemId) . '/url/' . 
                     $ticketUrl; // Keep URL as-is since it's already in the path
            
            $this->logger->info('Downloading e-ticket PDF', [
                'bookingorder_id' => $bookingorderId,
                'orderitem_id' => $orderitemId,
                'url' => $apiUrl
            ]);

            $apiResponse = $this->httpClient->get($apiUrl, [
                'headers' => $this->getDownloadHeaders($request),
                'timeout' => 60, // Longer timeout for file download
                'stream' => true
            ]);

            // Determine content type
            $contentType = $apiResponse->getHeaderLine('Content-Type') ?: 'application/pdf';
            
            // Set appropriate headers for file download
            $filename = "e-ticket-{$bookingorderId}-{$orderitemId}.pdf";
            
            $response = $response
                ->withStatus($apiResponse->getStatusCode())
                ->withHeader('Content-Type', $contentType)
                ->withHeader('Content-Disposition', "attachment; filename=\"{$filename}\"")
                ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                ->withHeader('Pragma', 'no-cache');

            // Stream the file content
            $body = $response->getBody();
            $body->rewind();
            
            while (!$apiResponse->getBody()->eof()) {
                $body->write($apiResponse->getBody()->read(8192));
            }
            
            return $response;
                
        } catch (RequestException $e) {
            $this->logger->error('Failed to download e-ticket', [
                'bookingorder_id' => $bookingorderId ?? 'unknown',
                'orderitem_id' => $orderitemId ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            throw new ApiException('Failed to download e-ticket: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Build query parameters for e-tickets list endpoint
     */
    private function buildETicketsQuery(array $queryParams): array
    {
        $validParams = [];

        // Booking ID filter (required for listing)
        if (isset($queryParams['booking_id']) && is_string($queryParams['booking_id'])) {
            $validParams['booking_id'] = trim($queryParams['booking_id']);
        }

        // Additional filters that might be supported
        if (isset($queryParams['booking_order_id']) && is_string($queryParams['booking_order_id'])) {
            $validParams['booking_order_id'] = trim($queryParams['booking_order_id']);
        }

        if (isset($queryParams['order_item_id']) && is_string($queryParams['order_item_id'])) {
            $validParams['order_item_id'] = trim($queryParams['order_item_id']);
        }

        // Status filters
        if (isset($queryParams['status']) && is_string($queryParams['status'])) {
            $validParams['status'] = trim($queryParams['status']);
        }

        // Format filters
        if (isset($queryParams['format']) && is_string($queryParams['format'])) {
            $validFormats = ['pdf', 'pkpass', 'all'];
            if (in_array(strtolower($queryParams['format']), $validFormats, true)) {
                $validParams['format'] = strtolower($queryParams['format']);
            }
        }

        // Date filters
        if (isset($queryParams['created_from']) && $this->isValidDate($queryParams['created_from'])) {
            $validParams['created_from'] = $queryParams['created_from'];
        }

        if (isset($queryParams['created_until']) && $this->isValidDate($queryParams['created_until'])) {
            $validParams['created_until'] = $queryParams['created_until'];
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

        return $validParams;
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
        
        // Check for ISO 8601 format
        $parsedDate = \DateTime::createFromFormat(\DateTime::ATOM, $date);
        return $parsedDate !== false;
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

    /**
     * Get headers for download requests
     */
    private function getDownloadHeaders(Request $request): array
    {
        $headers = [
            'Accept' => 'application/pdf,application/octet-stream,*/*'
        ];

        // Forward X-Api-Key header
        if ($request->hasHeader('X-Api-Key')) {
            $headers['X-Api-Key'] = $request->getHeaderLine('X-Api-Key');
        }

        return $headers;
    }
}
