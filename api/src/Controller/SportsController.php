<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class SportsController
{
    private LoggerInterface $logger;
    private Client $httpClient;
    private string $baseUrl;
    private string $apiKey;

    public function __construct(LoggerInterface $logger, Client $httpClient, string $baseUrl, string $apiKey)
    {
        $this->logger = $logger;
        $this->httpClient = $httpClient;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }

    /**
     * Get all supported sports
     * 
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getAllSports(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            
            // Forward the request to the API
            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/sports", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                ],
                'query' => $queryParams,
            ]);

            // Process the response
            $statusCode = $apiResponse->getStatusCode();
            $response->getBody()->write((string) $apiResponse->getBody());
            
            return $response
                ->withStatus($statusCode)
                ->withHeader('Content-Type', 'application/json');
                
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch sports', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new ApiException('Failed to fetch sports: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Get tournaments for a specific sport
     * 
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function getTournaments(Request $request, Response $response, array $args): Response
    {
        try {
            $sportType = $args['sport_type'] ?? '';
            $queryParams = $request->getQueryParams();
            
            // Add sport_type to query params if not already set
            if (!empty($sportType) && !isset($queryParams['sport_type'])) {
                $queryParams['sport_type'] = $sportType;
            }
            
            // Forward the request to the API
            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/tournaments", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                ],
                'query' => $queryParams,
            ]);

            // Process the response
            $statusCode = $apiResponse->getStatusCode();
            $response->getBody()->write((string) $apiResponse->getBody());
            
            return $response
                ->withStatus($statusCode)
                ->withHeader('Content-Type', 'application/json');
                
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch tournaments', [
                'sport_type' => $sportType ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new ApiException('Failed to fetch tournaments: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Get events for a specific sport or tournament
     * 
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getEvents(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            
            // Add default date filter if not set
            if (!isset($queryParams['date_stop'])) {
                $queryParams['date_stop'] = 'ge:' . date('Y-m-d');
            }
            
            // Forward the request to the API
            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/events", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                ],
                'query' => $queryParams,
            ]);

            // Process the response
            $statusCode = $apiResponse->getStatusCode();
            $response->getBody()->write((string) $apiResponse->getBody());
            
            return $response
                ->withStatus($statusCode)
                ->withHeader('Content-Type', 'application/json');
                
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch events', [
                'query_params' => $queryParams ?? [],
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new ApiException('Failed to fetch events: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Get venue information
     * 
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getVenues(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            
            // Forward the request to the API
            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/venues", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                ],
                'query' => $queryParams,
            ]);

            // Process the response
            $statusCode = $apiResponse->getStatusCode();
            $response->getBody()->write((string) $apiResponse->getBody());
            
            return $response
                ->withStatus($statusCode)
                ->withHeader('Content-Type', 'application/json');
                
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch venues', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new ApiException('Failed to fetch venues: ' . $e->getMessage(), 500, $e);
        }
    }
}
