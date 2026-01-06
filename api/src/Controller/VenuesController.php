<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class VenuesController
{
    private LoggerInterface $logger;
    private Client $httpClient;
    private string $baseUrl;
    private string $apiKey;
    private const CACHE_TTL = 21600; // 6 hours in seconds

    public function __construct(LoggerInterface $logger, Client $httpClient, string $baseUrl, string $apiKey)
    {
        $this->logger = $logger;
        $this->httpClient = $httpClient;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }

    /**
     * List all venues with pagination and filters
     */
    public function listVenues(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            $query = $this->buildVenueQuery($queryParams);
            
            // Log the API call for debugging
            $this->logger->info('Fetching venues list', [
                'query_params' => $query,
                'api_url' => "$this->baseUrl/v1/venues"
            ]);

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/venues", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                    'Cache-Control' => 'public, max-age=' . self::CACHE_TTL,
                ],
                'query' => $query,
            ]);

            $statusCode = $apiResponse->getStatusCode();
            $response->getBody()->write((string) $apiResponse->getBody());
            
            return $response
                ->withStatus($statusCode)
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=' . self::CACHE_TTL);
                
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch venues', [
                'error' => $e->getMessage(),
                'params' => $queryParams ?? [],
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new ApiException('Failed to fetch venues: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Get venue by ID
     */
    public function getVenue(Request $request, Response $response, array $args): Response
    {
        try {
            $venueId = $args['id'] ?? '';
            
            if (empty($venueId)) {
                throw new ApiException('Venue ID is required', 400);
            }
            
            // Log the API call for debugging
            $this->logger->info('Fetching single venue', [
                'venue_id' => $venueId,
                'api_url' => "$this->baseUrl/v1/venues/$venueId"
            ]);

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/venues/$venueId", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                    'Cache-Control' => 'public, max-age=' . self::CACHE_TTL,
                ]
            ]);

            $statusCode = $apiResponse->getStatusCode();
            $response->getBody()->write((string) $apiResponse->getBody());
            
            return $response
                ->withStatus($statusCode)
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=' . self::CACHE_TTL);
                
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch venue', [
                'venue_id' => $venueId ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($e->getCode() === 404) {
                throw new ApiException('Venue not found', 404, $e);
            }
            
            throw new ApiException('Failed to fetch venue: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Build and validate venue query parameters
     */
    private function buildVenueQuery(array $params): array
    {
        $query = [];
        
        // Handle sorting parameter
        if (isset($params['sorting'])) {
            $validSortOptions = ['name', 'city', 'country', 'venue_type', 'capacity', 'created_at', 'updated_at'];
            if (in_array($params['sorting'], $validSortOptions)) {
                $query['sorting'] = $params['sorting'];
            }
        }
        
        // Handle pagination
        if (isset($params['page_size']) && is_numeric($params['page_size'])) {
            $pageSize = (int)$params['page_size'];
            if ($pageSize > 0 && $pageSize <= 100) {
                $query['page_size'] = $pageSize;
            }
        }
        
        if (isset($params['page']) && is_numeric($params['page']) && (int)$params['page'] > 0) {
            $query['page'] = (int)$params['page'];
        }
        
        // Handle country filter (ISO format)
        if (!empty($params['country'])) {
            $query['country'] = strtoupper($params['country']);
        }
        
        // Handle venue_type filter (enum: racetrack, stadium, other)
        if (isset($params['venue_type'])) {
            $validVenueTypes = ['racetrack', 'stadium', 'other'];
            if (in_array(strtolower($params['venue_type']), $validVenueTypes)) {
                $query['venue_type'] = strtolower($params['venue_type']);
            }
        }
        
        // Handle popular boolean filter
        if (isset($params['popular'])) {
            $query['popular'] = $this->convertToBoolean($params['popular']);
        }
        
        // Handle venue_name filter
        if (!empty($params['venue_name'])) {
            $query['venue_name'] = $params['venue_name'];
        }
        
        // Handle city filter
        if (!empty($params['city'])) {
            $query['city'] = $params['city'];
        }
        
        // Handle slug filter
        if (!empty($params['slug'])) {
            $query['slug'] = $params['slug'];
        }
        
        // Handle venue_id filter
        if (!empty($params['venue_id'])) {
            $query['venue_id'] = $params['venue_id'];
        }
        
        // Legacy support for 'name' parameter (map to venue_name)
        if (!empty($params['name']) && empty($params['venue_name'])) {
            $query['venue_name'] = $params['name'];
        }
        
        return $query;
    }
    
    /**
     * Convert string/numeric values to boolean for API
     */
    private function convertToBoolean($value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        
        if (is_string($value)) {
            $lower = strtolower(trim($value));
            if (in_array($lower, ['true', '1', 'yes', 'on'])) {
                return 'true';
            }
            if (in_array($lower, ['false', '0', 'no', 'off', ''])) {
                return 'false';
            }
        }
        
        if (is_numeric($value)) {
            return (int)$value > 0 ? 'true' : 'false';
        }
        
        return 'false';
    }
}
