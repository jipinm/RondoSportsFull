<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class CountriesController
{
    private LoggerInterface $logger;
    private Client $httpClient;
    private string $baseUrl;
    private string $apiKey;
    private const CACHE_TTL = 86400; // 24 hours in seconds (countries don't change often)

    public function __construct(LoggerInterface $logger, Client $httpClient, string $baseUrl, string $apiKey)
    {
        $this->logger = $logger;
        $this->httpClient = $httpClient;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }

    /**
     * List countries with sorting and pagination
     */
    public function listCountries(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            $query = $this->buildCountryQuery($queryParams);
            
            // Log the API call for debugging
            $this->logger->info('Fetching countries list', [
                'query_params' => $query,
                'api_url' => "$this->baseUrl/v1/countries"
            ]);

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/countries", [
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
            $this->logger->error('Failed to fetch countries', [
                'error' => $e->getMessage(),
                'params' => $queryParams ?? [],
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new ApiException('Failed to fetch countries: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Build and validate country query parameters
     */
    private function buildCountryQuery(array $params): array
    {
        $query = [];
        
        // Handle sorting parameter
        if (isset($params['sorting'])) {
            $validSortOptions = ['country', 'name', 'created_at', 'updated_at'];
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
        
        return $query;
    }
}
