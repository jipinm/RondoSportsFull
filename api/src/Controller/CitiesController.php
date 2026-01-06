<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class CitiesController
{
    private LoggerInterface $logger;
    private Client $httpClient;
    private string $baseUrl;
    private string $apiKey;
    private const CACHE_TTL = 43200; // 12 hours in seconds (cities change infrequently)

    public function __construct(LoggerInterface $logger, Client $httpClient, string $baseUrl, string $apiKey)
    {
        $this->logger = $logger;
        $this->httpClient = $httpClient;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }

    /**
     * List cities with comprehensive filtering and sorting
     */
    public function listCities(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            $query = $this->buildCityQuery($queryParams);
            
            // Log the API call for debugging
            $this->logger->info('Fetching cities list', [
                'query_params' => $query,
                'api_url' => "$this->baseUrl/v1/cities"
            ]);

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/cities", [
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
            $this->logger->error('Failed to fetch cities', [
                'error' => $e->getMessage(),
                'params' => $queryParams ?? [],
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new ApiException('Failed to fetch cities: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Build and validate city query parameters
     */
    private function buildCityQuery(array $params): array
    {
        $query = [];
        
        // Handle sorting parameter
        if (isset($params['sorting'])) {
            $validSortOptions = ['city', 'country', 'created_at', 'updated_at'];
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
        
        // Handle country filter (ISO-3 format)
        if (!empty($params['country'])) {
            $query['country'] = strtoupper($params['country']);
        }
        
        // Handle event start date filter
        if (!empty($params['event_startdate'])) {
            // Validate date format (YYYY-MM-DD)
            if ($this->isValidDate($params['event_startdate'])) {
                $query['event_startdate'] = $params['event_startdate'];
            }
        }
        
        // Handle search query filter
        if (!empty($params['query'])) {
            $query['query'] = $params['query'];
        }
        
        return $query;
    }
    
    /**
     * Validate date format (YYYY-MM-DD)
     */
    private function isValidDate(string $date): bool
    {
        $dateTime = \DateTime::createFromFormat('Y-m-d', $date);
        return $dateTime && $dateTime->format('Y-m-d') === $date;
    }
}
