<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class TeamsController
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
     * List all teams with optional filtering
     * 
     * Supports all XS2Event teams API parameters:
     * - sorting: Sorting type (default: by page_size)
     * - page_size: Number of items per page (default: 50)
     * - page: Current page (default: 1)
     * - team_slug: Slug of the team according to Reuters sports team codes
     * - team_name: Name of the club
     * - popular: Show popular clubs (most bookings) - boolean
     * - club_logo: Show teams with club logo - boolean
     * - sport_type: Sport type enum (soccer, motorsport, tennis, rugby, etc.)
     * - tournament_id: Tournament to filter results
     * - slug: SEO friendly alternative to UUID
     * - iso_country: Filter teams on their ISO 3166-1 alpha-3 country of origin
     * - event_startdate: Only returns teams linked to events with matching start date
     * - interesting: Filter interesting teams - boolean
     * - team_id: Filter on Team ID
     * 
     * @param Request $request
     * @param Response $response
     * @param array $args Route parameters
     * @return Response
     */
    public function listTeams(Request $request, Response $response, array $args = []): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            
            // Build query parameters with validation
            $query = $this->buildTeamQuery($queryParams);
            
            // Build the full API URL
            $fullUrl = "$this->baseUrl/v1/teams";
            if (!empty($query)) {
                $fullUrl .= '?' . http_build_query($query);
            }
            // Forward the request to the API
            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/teams", [
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
            $this->logger->error('Failed to fetch teams', [
                'error' => $e->getMessage(),
                'params' => $queryParams ?? [],
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new ApiException('Failed to fetch teams: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Get a specific team by ID
     * 
     * Retrieves detailed information about a single team.
     * Forwards any query parameters to the upstream XS2Event API.
     * 
     * @param Request $request
     * @param Response $response
     * @param array $args Route parameters containing team_id
     * @return Response
     */
    public function getTeam(Request $request, Response $response, array $args): Response
    {
        try {
            $teamId = $args['team_id'] ?? '';
            
            if (empty($teamId)) {
                throw new ApiException('Team ID is required', 400);
            }
            
            // Get any query parameters that might be passed
            $queryParams = $request->getQueryParams();
            
            // Build the full API URL
            $fullUrl = "$this->baseUrl/v1/teams/$teamId";
            if (!empty($queryParams)) {
                $fullUrl .= '?' . http_build_query($queryParams);
            }
            // Forward the request to the API
            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/teams/$teamId", [
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
            $this->logger->error('Failed to fetch team', [
                'team_id' => $teamId ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($e->getCode() === 404) {
                throw new ApiException('Team not found', 404, $e);
            }
            
            throw new ApiException('Failed to fetch team: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Build and validate team query parameters
     * 
     * @param array $params Raw query parameters
     * @return array Validated query parameters
     */
    private function buildTeamQuery(array $params): array
    {
        $query = [];
        
        // Handle team_slug filter
        if (!empty($params['team_slug'])) {
            $query['team_slug'] = $params['team_slug'];
        }
        
        // Handle team_name filter
        if (!empty($params['team_name'])) {
            $query['team_name'] = $params['team_name'];
        }
        
        // Handle popular filter (boolean)
        if (isset($params['popular'])) {
            $query['popular'] = filter_var($params['popular'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ? 'true' : 'false';
        }
        
        // Handle club_logo filter (boolean)
        if (isset($params['club_logo'])) {
            $query['club_logo'] = filter_var($params['club_logo'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ? 'true' : 'false';
        }
        
        // Handle sport_type filter
        if (!empty($params['sport_type'])) {
            $query['sport_type'] = $params['sport_type'];
        }
        
        // Handle tournament_id filter
        if (!empty($params['tournament_id'])) {
            $query['tournament_id'] = $params['tournament_id'];
        }
        
        // Handle slug filter (SEO friendly alternative to UUID)
        if (!empty($params['slug'])) {
            $query['slug'] = $params['slug'];
        }
        
        // Handle iso_country filter (ISO 3166-1 alpha-3)
        if (!empty($params['iso_country'])) {
            $query['iso_country'] = $params['iso_country'];
        }
        
        // Handle event_startdate filter
        if (!empty($params['event_startdate'])) {
            $query['event_startdate'] = $params['event_startdate'];
        }
        
        // Handle interesting filter (boolean)
        if (isset($params['interesting'])) {
            $query['interesting'] = filter_var($params['interesting'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ? 'true' : 'false';
        }
        
        // Handle team_id filter
        if (!empty($params['team_id'])) {
            $query['team_id'] = $params['team_id'];
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
