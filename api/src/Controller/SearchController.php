<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class SearchController
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
     * Unified search across sports, tournaments, and events
     */
    public function search(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            $query = $queryParams['q'] ?? '';
            $type = $queryParams['type'] ?? 'all'; // all, sport, tournament, event
            $limit = (int)($queryParams['limit'] ?? 10);
            $page = (int)($queryParams['page'] ?? 1);
            $sort = $queryParams['sort'] ?? 'relevance'; // relevance, date_asc, date_desc

            if (empty($query)) {
                throw new ApiException('Search query parameter "q" is required', 400);
            }

            $searchResults = [
                'meta' => [
                    'query' => $query,
                    'type' => $type,
                    'limit' => $limit,
                    'page' => $page,
                    'sort' => $sort,
                    'total_results' => 0
                ],
                'results' => []
            ];

            // Search sports if type is 'all' or 'sport'
            if ($type === 'all' || $type === 'sport') {
                $sportsResults = $this->searchSports($query, $limit, $page, $sort);
                if (!empty($sportsResults)) {
                    $searchResults['results'] = array_merge($searchResults['results'], $sportsResults);
                }
            }

            // Search tournaments if type is 'all' or 'tournament'
            if ($type === 'all' || $type === 'tournament') {
                $tournamentsResults = $this->searchTournaments($query, $limit, $page, $sort);
                if (!empty($tournamentsResults)) {
                    $searchResults['results'] = array_merge($searchResults['results'], $tournamentsResults);
                }
            }

            // Search events if type is 'all' or 'event'
            if ($type === 'all' || $type === 'event') {
                $eventsResults = $this->searchEvents($query, $limit, $page, $sort);
                if (!empty($eventsResults)) {
                    $searchResults['results'] = array_merge($searchResults['results'], $eventsResults);
                }
            }

            // Sort combined results by relevance or date
            $searchResults['results'] = $this->sortResults($searchResults['results'], $sort);
            
            // Apply pagination
            $searchResults['results'] = array_slice(
                $searchResults['results'],
                ($page - 1) * $limit,
                $limit
            );
            
            $searchResults['meta']['total_results'] = count($searchResults['results']);

            $response->getBody()->write(json_encode($searchResults));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(200);
                
        } catch (ApiException $e) {
            $this->logger->error('Search API error', [
                'error' => $e->getMessage(),
                'query' => $query ?? 'unknown',
                'type' => $type ?? 'all'
            ]);
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Search failed', [
                'error' => $e->getMessage(),
                'query' => $query ?? 'unknown',
                'type' => $type ?? 'all'
            ]);
            throw new ApiException('Failed to perform search', 500, $e);
        }
    }

    /**
     * Search sports by name
     */
    private function searchSports(string $query, int $limit, int $page, string $sort): array
    {
        try {
            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/sports", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                ],
                'query' => [
                    'name' => $query,
                    'limit' => $limit,
                    'page' => $page
                ]
            ]);

            $results = json_decode((string) $apiResponse->getBody(), true);
            
            // Add type field to each result
            return array_map(function($sport) {
                return array_merge($sport, ['type' => 'sport']);
            }, $results['data'] ?? []);
            
        } catch (GuzzleException $e) {
            $this->logger->warning('Failed to search sports', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Search tournaments by name
     */
    private function searchTournaments(string $query, int $limit, int $page, string $sort): array
    {
        try {
            $queryParams = [
                'name' => $query,
                'limit' => $limit,
                'page' => $page
            ];

            // Add date sorting if applicable
            if ($sort === 'date_asc') {
                $queryParams['sort'] = 'date_start:asc';
            } elseif ($sort === 'date_desc') {
                $queryParams['sort'] = 'date_start:desc';
            }

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/tournaments", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                ],
                'query' => $queryParams
            ]);

            $results = json_decode((string) $apiResponse->getBody(), true);
            
            // Add type field to each result
            return array_map(function($tournament) {
                return array_merge($tournament, ['type' => 'tournament']);
            }, $results['data'] ?? []);
            
        } catch (GuzzleException $e) {
            $this->logger->warning('Failed to search tournaments', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Search events by name or venue
     */
    private function searchEvents(string $query, int $limit, int $page, string $sort): array
    {
        try {
            $queryParams = [
                'q' => $query,
                'limit' => $limit,
                'page' => $page
            ];

            // Add date sorting if applicable
            if ($sort === 'date_asc') {
                $queryParams['sort'] = 'date_start:asc';
            } elseif ($sort === 'date_desc') {
                $queryParams['sort'] = 'date_start:desc';
            } else {
                // Default to sorting by relevance if available
                $queryParams['sort'] = 'relevance:desc';
            }

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/events", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                ],
                'query' => $queryParams
            ]);

            $results = json_decode((string) $apiResponse->getBody(), true);
            
            // Add type field to each result
            return array_map(function($event) {
                return array_merge($event, ['type' => 'event']);
            }, $results['data'] ?? []);
            
        } catch (GuzzleException $e) {
            $this->logger->warning('Failed to search events', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Sort combined search results
     */
    private function sortResults(array $results, string $sort): array
    {
        if ($sort === 'date_asc') {
            usort($results, function($a, $b) {
                $dateA = $a['date_start'] ?? $a['start_date'] ?? '';
                $dateB = $b['date_start'] ?? $b['start_date'] ?? '';
                return strtotime($dateA) <=> strtotime($dateB);
            });
        } elseif ($sort === 'date_desc') {
            usort($results, function($a, $b) {
                $dateA = $a['date_start'] ?? $a['start_date'] ?? '';
                $dateB = $b['date_start'] ?? $b['start_date'] ?? '';
                return strtotime($dateB) <=> strtotime($dateA);
            });
        }
        // For 'relevance' or any other sort, maintain the order from the individual searches
        
        return $results;
    }
}
