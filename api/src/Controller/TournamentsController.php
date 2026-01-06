<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class TournamentsController
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
     * List all tournaments with optional filtering
     * 
     * Supports all XS2Event tournaments API parameters:
     * - sorting: Sorting type (default: by page_size)
     * - page_size: Number of items per page (default: 50)
     * - page: Current page (default: 1)
     * - region: ISO country code. For F1/Moto use "world"
     * - date_start: Start date (format: YYYY-MM-DD)
     * - date_stop: Stop date (format: YYYY-MM-DD)
     * - sport_type: Sport type enum (soccer, motorsport, tennis, rugby, etc.)
     * - tournament_type: Tournament type enum (cup, league, oneoff)
     * - tournament_name: Tournament name
     * - query: Flexible search query for tournament names
     * - season: Season (e.g., 2024 or 24/25 depending on sport type)
     * - tournament_id: Specific tournament ID
     * 
     * @param Request $request
     * @param Response $response
     * @param array $args Route parameters
     * @return Response
     */
    public function listTournaments(Request $request, Response $response, array $args = []): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            
            // Extract sport_type from route if present
            if (isset($args['sport_type'])) {
                $queryParams['sport_type'] = $args['sport_type'];
            }
            
            // Build query parameters with validation
            $query = $this->buildTournamentQuery($queryParams);
            
            // Echo the full API URL with parameters
            $fullUrl = "$this->baseUrl/v1/tournaments";
            if (!empty($query)) {
                $fullUrl .= '?' . http_build_query($query);
            }
            
            // Forward the request to the API
            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/tournaments", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                    'Cache-Control' => 'public, max-age=' . self::CACHE_TTL,
                ],
                'query' => $query,
            ]);

            // Process the response
            $statusCode = $apiResponse->getStatusCode();
            $response->getBody()->write((string) $apiResponse->getBody());
            
            return $response
                ->withStatus($statusCode)
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=' . self::CACHE_TTL);
                
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch tournaments', [
                'error' => $e->getMessage(),
                'params' => $queryParams ?? [],
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new ApiException('Failed to fetch tournaments: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Get a specific tournament by ID
     * 
     * Retrieves detailed information about a single tournament.
     * Forwards any query parameters to the upstream XS2Event API.
     * 
     * @param Request $request
     * @param Response $response
     * @param array $args Route parameters containing tournament_id
     * @return Response
     */
    public function getTournament(Request $request, Response $response, array $args): Response
    {
        try {
            $tournamentId = $args['tournament_id'] ?? '';
            
            if (empty($tournamentId)) {
                throw new ApiException('Tournament ID is required', 400);
            }
            
            // Get any query parameters that might be passed
            $queryParams = $request->getQueryParams();
            
            // Build the full API URL
            $fullUrl = "$this->baseUrl/v1/tournaments/$tournamentId";
            if (!empty($queryParams)) {
                $fullUrl .= '?' . http_build_query($queryParams);
            }
            // Forward the request to the API
            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/tournaments/$tournamentId", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                    'Cache-Control' => 'public, max-age=' . self::CACHE_TTL,
                ],
                'query' => $queryParams, // Forward any query parameters
            ]);

            // Process the response
            $statusCode = $apiResponse->getStatusCode();
            $response->getBody()->write((string) $apiResponse->getBody());
            
            return $response
                ->withStatus($statusCode)
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=' . self::CACHE_TTL);
                
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch tournament', [
                'tournament_id' => $tournamentId ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($e->getCode() === 404) {
                throw new ApiException('Tournament not found', 404, $e);
            }
            
            throw new ApiException('Failed to fetch tournament: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Get events for a specific tournament
     * 
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function getTournamentEvents(Request $request, Response $response, array $args): Response
    {
        try {
            $tournamentId = $args['id'] ?? '';
            
            if (empty($tournamentId)) {
                throw new ApiException('Tournament ID is required', 400);
            }
            
            $queryParams = $request->getQueryParams();
            
            // Add default date filter if not set
            if (!isset($queryParams['date_stop'])) {
                $queryParams['date_stop'] = 'ge:' . date('Y-m-d');
            }
            
            $finalQuery = array_merge($queryParams, ['tournament_id' => $tournamentId]);
            
            // Echo the full API URL with parameters
            $fullUrl = "$this->baseUrl/v1/events";
            if (!empty($finalQuery)) {
                $fullUrl .= '?' . http_build_query($finalQuery);
            }
            
            // Forward the request to the API
            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/events", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                ],
                'query' => $finalQuery
            ]);

            // Process the response
            $statusCode = $apiResponse->getStatusCode();
            $response->getBody()->write((string) $apiResponse->getBody());
            
            return $response
                ->withStatus($statusCode)
                ->withHeader('Content-Type', 'application/json');
                
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch tournament events', [
                'tournament_id' => $tournamentId ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new ApiException('Failed to fetch tournament events: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Build and validate tournament query parameters
     * 
     * @param array $params Raw query parameters
     * @return array Validated query parameters
     */
    private function buildTournamentQuery(array $params): array
    {
        $query = [];
        
        // Handle sport_type filter
        if (!empty($params['sport_type'])) {
            $sportType = $params['sport_type'];
            
            // Handle array of sport types (e.g., sport_type[]=soccer&sport_type[]=formula1)
            if (is_array($sportType)) {
                $sportType = array_filter($sportType, 'is_string');
                if (!empty($sportType)) {
                    $query['sport_type'] = 'in:[' . implode(',', $sportType) . ']';
                }
            } 
            // Handle comma-separated list (e.g., sport_type=soccer,formula1)
            elseif (strpos($sportType, ',') !== false) {
                $sports = array_filter(explode(',', $sportType), 'trim');
                if (!empty($sports)) {
                    $query['sport_type'] = 'in:[' . implode(',', $sports) . ']';
                }
            } 
            // Handle single sport type (e.g., sport_type=soccer)
            else {
                $query['sport_type'] = $sportType;
            }
        }
        
        // Handle date_stop filter
        if (!empty($params['date_stop'])) {
            $dateStop = $params['date_stop'];
            
            // Add 'ge:' prefix if not present and it's just a date
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStop)) {
                $dateStop = 'ge:' . $dateStop;
            }
            
            $query['date_stop'] = $dateStop;
        }
        
        // Handle date_start filter
        if (!empty($params['date_start'])) {
            $query['date_start'] = $params['date_start'];
        }
        
        // Handle region filter (iso country, for F1/Moto use "world")
        if (!empty($params['region'])) {
            $query['region'] = $params['region'];
        }
        
        // Handle tournament_type filter (cup, league, oneoff)
        if (!empty($params['tournament_type'])) {
            $query['tournament_type'] = $params['tournament_type'];
        }
        
        // Handle tournament_name filter
        if (!empty($params['tournament_name'])) {
            $query['tournament_name'] = $params['tournament_name'];
        }
        
        // Handle flexible search query for tournament names
        if (!empty($params['query'])) {
            $query['query'] = $params['query'];
        }
        
        // Handle season filter (e.g., 2024 or 24/25)
        if (!empty($params['season'])) {
            $query['season'] = $params['season'];
        }
        
        // Handle specific tournament_id
        if (!empty($params['tournament_id'])) {
            $query['tournament_id'] = $params['tournament_id'];
        }
        
        // Handle pagination parameters
        if (!empty($params['page_size'])) {
            $pageSize = (int) $params['page_size'];
            if ($pageSize > 0) {
                $query['page_size'] = $pageSize;
            }
        }
        
        if (!empty($params['page'])) {
            $page = (int) $params['page'];
            if ($page > 0) {
                $query['page'] = $page;
            }
        }
        
        // Handle sorting parameter
        if (!empty($params['sorting'])) {
            $query['sorting'] = $params['sorting'];
        }
        
        return $query;
    }
}
