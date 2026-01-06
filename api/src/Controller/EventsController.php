<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class EventsController
{
    private LoggerInterface $logger;
    private Client $httpClient;
    private string $baseUrl;
    private string $apiKey;
    private const CACHE_TTL = 3600; // 1 hour in seconds

    public function __construct(LoggerInterface $logger, Client $httpClient, string $baseUrl, string $apiKey)
    {
        $this->logger = $logger;
        $this->httpClient = $httpClient;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }

    /**
     * List events with optional filtering
     * 
     * Supports all XS2Event events API parameters:
     * - sorting: Sorting type (default: by page_size)
     * - page_size: Number of items per page (default: 50)
     * - page: Current page (default: 1)
     * - sport_type: Sport type enum (soccer, motorsport, tennis, rugby, etc.)
     * - tournament_type: Tournament type enum (cup, league, oneoff)
     * - date_start: Event start date
     * - date_stop: Event stop date
     * - venue_id: Specific venue ID
     * - event_id: Specific event ID
     * - tournament_id: Specific tournament ID
     * - team_id: Specific team ID
     * - hometeam_id: Home team ID
     * - visitingteam_id: Visiting team ID
     * - city: City name
     * - location_id: Events related to a specific location ID
     * - event_status: Event status (cancelled, closed, notstarted, nosale, postponed, soldout)
     * - country: Country in ISO 3 format
     * - event_name: Event name
     * - tournament_name: Tournament name
     * - tickets_available: Number of tickets available
     * - booked: Show only events which have had bookings (boolean)
     * - popular_events: Show all the popular events (boolean)
     * - ticket_price_eur: Ticket price in EUR
     * - slug: SEO friendly alternative to UUID
     * - accept_language: To localize an event in a specific name
     * - season: Season (e.g., 2024 or 24/25)
     */
    public function listEvents(Request $request, Response $response, array $args = []): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            $query = $this->buildEventQuery($queryParams);
            
            // Add default date filter if not set
            if (!isset($query['date_stop'])) {
                $query['date_stop'] = 'ge:' . date('Y-m-d');
            }
            
            // Build the full API URL for debugging
            $fullUrl = "$this->baseUrl/v1/events";
            if (!empty($query)) {
                $fullUrl .= '?' . http_build_query($query);
            }
            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/events", [
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
            $this->logger->error('Failed to fetch events', [
                'error' => $e->getMessage(),
                'params' => $queryParams ?? [],
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new ApiException('Failed to fetch events: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Get event by ID
     * 
     * Supports query parameters:
     * - accept_language: To localize an event in a specific name (fallback to 'en')
     */
    public function getEvent(Request $request, Response $response, array $args): Response
    {
        try {
            $eventId = $args['id'] ?? '';
            
            if (empty($eventId)) {
                throw new ApiException('Event ID is required', 400);
            }
            
            // Get query parameters (especially accept_language)
            $queryParams = $request->getQueryParams();

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/events/$eventId", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                    'Cache-Control' => 'public, max-age=' . self::CACHE_TTL,
                ],
                'query' => $queryParams, // Forward any query parameters
            ]);

            $statusCode = $apiResponse->getStatusCode();
            $response->getBody()->write((string) $apiResponse->getBody());
            
            return $response
                ->withStatus($statusCode)
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=' . self::CACHE_TTL);
                
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch event', [
                'event_id' => $eventId ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($e->getCode() === 404) {
                throw new ApiException('Event not found', 404, $e);
            }
            
            throw new ApiException('Failed to fetch event: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Get event guest data requirements
     * 
     * Supports query parameters:
     * - country_hint: Country hint in ISO format (e.g., "NLD")
     */
    public function getEventGuestDataRequirements(Request $request, Response $response, array $args): Response
    {
        try {
            $eventId = $args['event_id'] ?? '';
            
            if (empty($eventId)) {
                throw new ApiException('Event ID is required', 400);
            }
            
            // Get query parameters (especially country_hint)
            $queryParams = $request->getQueryParams();

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/events/$eventId/guestdata", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                    'Cache-Control' => 'public, max-age=' . self::CACHE_TTL,
                ],
                'query' => $queryParams, // Forward any query parameters
            ]);

            $statusCode = $apiResponse->getStatusCode();
            $response->getBody()->write((string) $apiResponse->getBody());
            
            return $response
                ->withStatus($statusCode)
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=' . self::CACHE_TTL);
                
        } catch (GuzzleException $e) {
            $this->logger->error('Failed to fetch event guest data requirements', [
                'event_id' => $eventId ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($e->getCode() === 404) {
                throw new ApiException('Event not found', 404, $e);
            }
            
            throw new ApiException('Failed to fetch event guest data requirements: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Build and validate event query parameters
     */
    private function buildEventQuery(array $params): array
    {
        $query = [];
        
        // Handle tournament_id filter
        if (!empty($params['tournament_id'])) {
            $tournamentId = $params['tournament_id'];
            if (is_array($tournamentId)) {
                $tournamentId = array_filter($tournamentId, 'is_string');
                if (!empty($tournamentId)) {
                    $query['tournament_id'] = 'in:[' . implode(',', $tournamentId) . ']';
                }
            } else {
                $query['tournament_id'] = $tournamentId;
            }
        }
        
        // Handle sport_type filter
        if (!empty($params['sport_type'])) {
            $sportType = $params['sport_type'];
            if (is_array($sportType)) {
                $sportType = array_filter($sportType, 'is_string');
                if (!empty($sportType)) {
                    $query['sport_type'] = 'in:[' . implode(',', $sportType) . ']';
                }
            } elseif (strpos($sportType, ',') !== false) {
                $sports = array_filter(explode(',', $sportType), 'trim');
                if (!empty($sports)) {
                    $query['sport_type'] = 'in:[' . implode(',', $sports) . ']';
                }
            } else {
                $query['sport_type'] = $sportType;
            }
        }
        
        // Handle tournament_type filter (cup, league, oneoff)
        if (!empty($params['tournament_type'])) {
            $query['tournament_type'] = $params['tournament_type'];
        }
        
        // Handle date_start filter
        if (!empty($params['date_start'])) {
            $query['date_start'] = $params['date_start'];
        }
        
        // Handle date_stop filter
        if (!empty($params['date_stop'])) {
            $dateStop = $params['date_stop'];
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStop)) {
                $dateStop = 'ge:' . $dateStop;
            }
            $query['date_stop'] = $dateStop;
        }
        
        // Handle venue_id filter
        if (!empty($params['venue_id'])) {
            $query['venue_id'] = $params['venue_id'];
        }
        
        // Handle event_id filter
        if (!empty($params['event_id'])) {
            $query['event_id'] = $params['event_id'];
        }
        
        // Handle team_id filter
        if (!empty($params['team_id'])) {
            $query['team_id'] = $params['team_id'];
        }
        
        // Handle hometeam_id filter
        if (!empty($params['hometeam_id'])) {
            $query['hometeam_id'] = $params['hometeam_id'];
        }
        
        // Handle visitingteam_id filter
        if (!empty($params['visitingteam_id'])) {
            $query['visitingteam_id'] = $params['visitingteam_id'];
        }
        
        // Handle city filter
        if (!empty($params['city'])) {
            $query['city'] = $params['city'];
        }
        
        // Handle location_id filter
        if (!empty($params['location_id'])) {
            $query['location_id'] = $params['location_id'];
        }
        
        // Handle event_status filter (cancelled, closed, notstarted, nosale, postponed, soldout)
        if (!empty($params['event_status'])) {
            $query['event_status'] = $params['event_status'];
        }
        
        // Handle country filter (ISO 3 format)
        if (!empty($params['country'])) {
            $query['country'] = $params['country'];
        }
        
        // Handle event_name filter
        if (!empty($params['event_name'])) {
            $query['event_name'] = $params['event_name'];
        }
        
        // Handle tournament_name filter
        if (!empty($params['tournament_name'])) {
            $query['tournament_name'] = $params['tournament_name'];
        }
        
        // Handle tickets_available filter
        if (!empty($params['tickets_available'])) {
            $query['tickets_available'] = $params['tickets_available'];
        }
        
        // Handle booked filter (boolean)
        if (isset($params['booked'])) {
            $query['booked'] = filter_var($params['booked'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ? 'true' : 'false';
        }
        
        // Handle popular_events filter (boolean)
        if (isset($params['popular_events'])) {
            $query['popular_events'] = filter_var($params['popular_events'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ? 'true' : 'false';
        }
        
        // Handle ticket_price_eur filter
        if (!empty($params['ticket_price_eur'])) {
            $query['ticket_price_eur'] = $params['ticket_price_eur'];
        }
        
        // Handle slug filter (SEO friendly alternative to UUID)
        if (!empty($params['slug'])) {
            $query['slug'] = $params['slug'];
        }
        
        // Handle accept_language filter
        if (!empty($params['accept_language'])) {
            $query['accept_language'] = $params['accept_language'];
        }
        
        // Handle season filter
        if (!empty($params['season'])) {
            $query['season'] = $params['season'];
        }
        
        // Handle pagination parameters
        if (isset($params['page'])) {
            $page = filter_var($params['page'], FILTER_VALIDATE_INT, [
                'options' => ['min_range' => 1]
            ]);
            
            if ($page !== false) {
                $query['page'] = $page;
            }
        }
        
        // Handle page_size parameter (replaces per_page)
        if (isset($params['page_size'])) {
            $pageSize = filter_var($params['page_size'], FILTER_VALIDATE_INT, [
                'options' => [
                    'min_range' => 1,
                    'max_range' => 100
                ]
            ]);
            
            if ($pageSize !== false) {
                $query['page_size'] = $pageSize;
            }
        }
        // Backward compatibility: Handle per_page parameter
        elseif (isset($params['per_page'])) {
            $perPage = filter_var($params['per_page'], FILTER_VALIDATE_INT, [
                'options' => [
                    'min_range' => 1,
                    'max_range' => 100
                ]
            ]);
            
            if ($perPage !== false) {
                $query['page_size'] = $perPage;
            }
        }
        
        // Handle sorting parameter
        if (!empty($params['sorting'])) {
            $query['sorting'] = $params['sorting'];
        }
        
        return $query;
    }
}
