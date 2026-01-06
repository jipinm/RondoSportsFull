<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class CategoriesController
{
    private LoggerInterface $logger;
    private Client $httpClient;
    private string $baseUrl;
    private string $apiKey;
    private const CACHE_TTL = 14400; // 4 hours in seconds

    public function __construct(LoggerInterface $logger, Client $httpClient, string $baseUrl, string $apiKey)
    {
        $this->logger = $logger;
        $this->httpClient = $httpClient;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }

    /**
     * List categories with comprehensive filtering and sorting
     */
    public function listCategories(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            $query = $this->buildCategoryQuery($queryParams);
            
            // Log the API call for debugging
            $this->logger->info('Fetching categories list', [
                'query_params' => $query,
                'api_url' => "$this->baseUrl/v1/categories"
            ]);

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/categories", [
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
            $this->logger->error('Failed to fetch categories', [
                'error' => $e->getMessage(),
                'params' => $queryParams ?? [],
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($e->getCode() === 404) {
                throw new ApiException('No categories found for the specified criteria', 404, $e);
            }
            
            throw new ApiException('Failed to fetch categories: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Get category details by ID
     */
    public function getCategory(Request $request, Response $response, array $args): Response
    {
        try {
            $categoryId = $args['id'] ?? '';
            
            if (empty($categoryId)) {
                throw new ApiException('Category ID is required', 400);
            }
            
            // Log the API call for debugging
            $this->logger->info('Fetching single category', [
                'category_id' => $categoryId,
                'api_url' => "$this->baseUrl/v1/categories/$categoryId"
            ]);

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/categories/$categoryId", [
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
            $this->logger->error('Failed to fetch category', [
                'category_id' => $categoryId ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($e->getCode() === 404) {
                throw new ApiException('Category not found', 404, $e);
            }
            
            throw new ApiException('Failed to fetch category: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Build and validate category query parameters
     */
    private function buildCategoryQuery(array $params): array
    {
        $query = [];
        
        // Handle sorting parameter
        if (isset($params['sorting'])) {
            $validSortOptions = [
                'category_name', 'created', 'venue_name', 'sport_type', 
                'country', 'highlight_type', 'updated_at'
            ];
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
        
        // Handle venue_id filter
        if (!empty($params['venue_id'])) {
            $query['venue_id'] = $params['venue_id'];
        }
        
        // Handle event_id filter
        if (!empty($params['event_id'])) {
            $query['event_id'] = $params['event_id'];
        }
        
        // Handle supplier_id filter
        if (!empty($params['supplier_id'])) {
            $query['supplier_id'] = $params['supplier_id'];
        }
        
        // Handle sport_type filter with enum validation
        if (isset($params['sport_type'])) {
            $validSportTypes = [
                'soccer', 'motorsport', 'tennis', 'rugby', 'darts', 'horseracing', 
                'boxing', 'other', 'motogp', 'formula1', 'cricket', 'basketball', 
                'combatsport', 'icehockey', 'nba', 'nfl', 'mlb', 'watersport', 
                'dtm', 'indycar', 'superbike', 'padel'
            ];
            if (in_array(strtolower($params['sport_type']), $validSportTypes)) {
                $query['sport_type'] = strtolower($params['sport_type']);
            }
        }
        
        // Handle country filter
        if (!empty($params['country'])) {
            $query['country'] = strtoupper($params['country']);
        }
        
        // Handle venue_name filter
        if (!empty($params['venue_name'])) {
            $query['venue_name'] = $params['venue_name'];
        }
        
        // Handle category_name filter
        if (!empty($params['category_name'])) {
            $query['category_name'] = $params['category_name'];
        }
        
        // Handle on_svg boolean filter
        if (isset($params['on_svg'])) {
            $query['on_svg'] = $this->convertToBoolean($params['on_svg']);
        }
        
        // Handle category_id filter
        if (!empty($params['category_id'])) {
            $query['category_id'] = $params['category_id'];
        }
        
        // Handle highlight_type filter
        if (!empty($params['highlight_type'])) {
            $query['highlight_type'] = $params['highlight_type'];
        }
        
        // Handle slug filter
        if (!empty($params['slug'])) {
            $query['slug'] = $params['slug'];
        }
        
        // Legacy parameters for backward compatibility
        if (isset($params['include_seats'])) {
            $query['include_seats'] = $this->convertToBoolean($params['include_seats']);
        }
        
        if (isset($params['include_pricing'])) {
            $query['include_pricing'] = $this->convertToBoolean($params['include_pricing']);
        }
        
        // Legacy pagination support
        if (isset($params['per_page']) && !isset($params['page_size'])) {
            $perPage = (int)$params['per_page'];
            if ($perPage > 0 && $perPage <= 100) {
                $query['page_size'] = $perPage;
            }
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