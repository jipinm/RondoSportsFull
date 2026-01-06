<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class TicketsController
{
    private LoggerInterface $logger;
    private Client $httpClient;
    private string $baseUrl;
    private string $apiKey;
    private const CACHE_TTL = 300; // 5 minutes in seconds (shorter cache for real-time data)

    public function __construct(LoggerInterface $logger, Client $httpClient, string $baseUrl, string $apiKey)
    {
        $this->logger = $logger;
        $this->httpClient = $httpClient;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }

    /**
     * List available tickets with filtering
     */
    public function listTickets(Request $request, Response $response): Response
    {
        try {
            $queryParams = $request->getQueryParams();
            $query = $this->buildTicketQuery($queryParams);

            // Event ID is required
            if (empty($query['event_id'])) {
                throw new ApiException('event_id parameter is required', 400);
            }

            // Ensure we only get available tickets by default
            if (!isset($query['ticket_status'])) {
                $query['ticket_status'] = 'available';
            }

            // Ensure we only get tickets with stock by default
            if (!isset($query['stock'])) {
                $query['stock'] = 'gt:0';
            }

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/tickets", [
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
            $this->logger->error('Failed to fetch tickets', [
                'error' => $e->getMessage(),
                'params' => $queryParams ?? [],
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($e->getCode() === 404) {
                throw new ApiException('No tickets found for the specified criteria', 404, $e);
            }
            
            throw new ApiException('Failed to fetch tickets: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Get single ticket by ID with all query parameters
     */
    public function getTicket(Request $request, Response $response, array $args): Response
    {
        try {
            $ticketId = $args['id'] ?? '';
            
            if (empty($ticketId)) {
                throw new ApiException('Ticket ID is required', 400);
            }
            $params = $request->getQueryParams();
            
            // Build query parameters for single ticket
            $query = $this->buildSingleTicketQuery($params);
            
            // Log the API call for debugging
            $this->logger->info('Fetching single ticket', [
                'ticket_id' => $ticketId,
                'query_params' => $query,
                'api_url' => "$this->baseUrl/v1/tickets/" . urlencode($ticketId)
            ]);

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/tickets/" . urlencode($ticketId), [
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
            $this->logger->error('Failed to fetch ticket', [
                'ticket_id' => $ticketId ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($e->getCode() === 404) {
                throw new ApiException('Ticket not found', 404, $e);
            }
            
            throw new ApiException('Failed to fetch ticket: ' . $e->getMessage(), 500, $e);
        }
    }
    
    /**
     * Get ticket guest data requirements
     */
    public function getTicketGuestDataRequirements(Request $request, Response $response, array $args): Response
    {
        try {
            $ticketId = $args['id'] ?? '';
            
            if (empty($ticketId)) {
                throw new ApiException('Ticket ID is required', 400);
            }
            
            $params = $request->getQueryParams();
            
            // Build query parameters for guest data requirements
            $query = [];
            
            // Handle country_hint parameter
            if (!empty($params['country_hint'])) {
                $query['country_hint'] = $params['country_hint'];
            }
            
            // Handle sorting and pagination
            if (isset($params['sort'])) {
                $validSortOptions = ['id', 'name', 'type', 'required', 'created_at', 'updated_at'];
                if (in_array($params['sort'], $validSortOptions)) {
                    $query['sort'] = $params['sort'];
                }
            }
            
            if (isset($params['order'])) {
                if (in_array(strtolower($params['order']), ['asc', 'desc'])) {
                    $query['order'] = strtolower($params['order']);
                }
            }
            
            if (isset($params['page']) && is_numeric($params['page']) && (int)$params['page'] > 0) {
                $query['page'] = (int)$params['page'];
            }
            
            if (isset($params['per_page']) && is_numeric($params['per_page'])) {
                $perPage = (int)$params['per_page'];
                if ($perPage > 0 && $perPage <= 100) {
                    $query['per_page'] = $perPage;
                }
            }
            
            // Log the API call for debugging
            $this->logger->info('Fetching ticket guest data requirements', [
                'ticket_id' => $ticketId,
                'query_params' => $query,
                'api_url' => "$this->baseUrl/v1/tickets/" . urlencode($ticketId) . "/guestdata"
            ]);

            $apiResponse = $this->httpClient->get("$this->baseUrl/v1/tickets/" . urlencode($ticketId) . "/guestdata", [
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
            $this->logger->error('Failed to fetch ticket guest data requirements', [
                'ticket_id' => $ticketId ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($e->getCode() === 404) {
                throw new ApiException('Ticket guest data requirements not found', 404, $e);
            }
            
            throw new ApiException('Failed to fetch ticket guest data requirements: ' . $e->getMessage(), 500, $e);
        }
    }

    /**
     * Group tickets by event, category, and sub-category
     */
    public function groupTickets(array $tickets): array
    {
        return array_reduce($tickets, function (array $groups, array $ticket) {
            $key = sprintf(
                '%s_%s_%s_%s',
                $ticket['event_id'] ?? '',
                $ticket['category_id'] ?? '',
                $ticket['ticket_validity'] ?? '',
                $ticket['ticket_targetgroup'] ?? ''
            );
            
            if (!isset($groups[$key])) {
                $groups[$key] = [
                    'event_id' => $ticket['event_id'] ?? null,
                    'category_id' => $ticket['category_id'] ?? null,
                    'ticket_validity' => $ticket['ticket_validity'] ?? null,
                    'ticket_targetgroup' => $ticket['ticket_targetgroup'] ?? null,
                    'tickets' => []
                ];
            }
            
            $groups[$key]['tickets'][] = $ticket;
            return $groups;
        }, []);
    }

    /**
     * Build and validate ticket query parameters
     */
    private function buildTicketQuery(array $params): array
    {
        $query = [];
        
        // Handle event_id (required in some contexts)
        if (!empty($params['event_id'])) {
            $query['event_id'] = $params['event_id'];
        }
        
        // Handle venue_id filter
        if (!empty($params['venue_id'])) {
            $query['venue_id'] = $params['venue_id'];
        }
        
        // Handle category_id filter
        if (!empty($params['category_id'])) {
            $query['category_id'] = $params['category_id'];
        }
        
        // Handle ticket_status filter
        if (isset($params['ticket_status'])) {
            $query['ticket_status'] = $params['ticket_status'];
        }
        
        // Handle ticket_type filter
        if (isset($params['ticket_type'])) {
            $query['ticket_type'] = $params['ticket_type'];
        }
        
        // Handle ticket_validity filter
        if (isset($params['ticket_validity'])) {
            $query['ticket_validity'] = $params['ticket_validity'];
        }
        
        // Handle ticket_targetgroup filter
        if (isset($params['ticket_targetgroup'])) {
            $query['ticket_targetgroup'] = $params['ticket_targetgroup'];
        }
        
        // Handle ticket_subtype filter
        if (isset($params['ticket_subtype'])) {
            $query['ticket_subtype'] = $params['ticket_subtype'];
        }
        
        // Handle stock filter
        if (isset($params['stock'])) {
            $query['stock'] = $params['stock'];
        }
        
        // Handle boolean stock filters
        if (isset($params['stock_zero'])) {
            $query['stock_zero'] = $this->convertToBoolean($params['stock_zero']);
        }
        
        if (isset($params['stock_limited'])) {
            $query['stock_limited'] = $this->convertToBoolean($params['stock_limited']);
        }
        
        if (isset($params['stock_unlimited'])) {
            $query['stock_unlimited'] = $this->convertToBoolean($params['stock_unlimited']);
        }
        
        // Handle sales_price filters
        if (isset($params['sales_price'])) {
            $query['sales_price'] = $params['sales_price'];
        }
        
        if (isset($params['sales_price_from'])) {
            $query['sales_price_from'] = $params['sales_price_from'];
        }
        
        if (isset($params['sales_price_to'])) {
            $query['sales_price_to'] = $params['sales_price_to'];
        }
        
        // Handle validation date filters
        if (isset($params['valid_from'])) {
            $query['valid_from'] = $params['valid_from'];
        }
        
        if (isset($params['valid_to'])) {
            $query['valid_to'] = $params['valid_to'];
        }
        
        // Handle sale period filters
        if (isset($params['sale_start'])) {
            $query['sale_start'] = $params['sale_start'];
        }
        
        if (isset($params['sale_end'])) {
            $query['sale_end'] = $params['sale_end'];
        }
        
        // Handle supplier information
        if (isset($params['supplier_id'])) {
            $query['supplier_id'] = $params['supplier_id'];
        }
        
        if (isset($params['supplier_name'])) {
            $query['supplier_name'] = $params['supplier_name'];
        }
        
        // Handle VAT category
        if (isset($params['vat_category'])) {
            $query['vat_category'] = $params['vat_category'];
        }
        
        // Handle boolean flags
        if (isset($params['sellable'])) {
            $query['sellable'] = $this->convertToBoolean($params['sellable']);
        }
        
        if (isset($params['refundable'])) {
            $query['refundable'] = $this->convertToBoolean($params['refundable']);
        }
        
        if (isset($params['transferable'])) {
            $query['transferable'] = $this->convertToBoolean($params['transferable']);
        }
        
        if (isset($params['show_deleted'])) {
            $query['show_deleted'] = $this->convertToBoolean($params['show_deleted']);
        }
        
        // Handle sorting
        if (isset($params['sort'])) {
            $validSortOptions = [
                'id', 'title', 'sales_price', 'stock', 'valid_from', 'valid_to',
                'sale_start', 'sale_end', 'created_at', 'updated_at'
            ];
            if (in_array($params['sort'], $validSortOptions)) {
                $query['sort'] = $params['sort'];
            }
        }
        
        if (isset($params['order'])) {
            if (in_array(strtolower($params['order']), ['asc', 'desc'])) {
                $query['order'] = strtolower($params['order']);
            }
        }
        
        // Handle pagination
        if (isset($params['page']) && is_numeric($params['page']) && (int)$params['page'] > 0) {
            $query['page'] = (int)$params['page'];
        }
        
        if (isset($params['per_page']) && is_numeric($params['per_page'])) {
            $perPage = (int)$params['per_page'];
            if ($perPage > 0 && $perPage <= 100) {
                $query['per_page'] = $perPage;
            }
        }
        
        return $query;
    }
    
    /**
     * Build query parameters for single ticket endpoint
     */
    private function buildSingleTicketQuery(array $params): array
    {
        $query = [];
        
        // Handle sorting
        if (isset($params['sort'])) {
            $validSortOptions = [
                'id', 'title', 'sales_price', 'stock', 'valid_from', 'valid_to',
                'sale_start', 'sale_end', 'created_at', 'updated_at'
            ];
            if (in_array($params['sort'], $validSortOptions)) {
                $query['sort'] = $params['sort'];
            }
        }
        
        if (isset($params['order'])) {
            if (in_array(strtolower($params['order']), ['asc', 'desc'])) {
                $query['order'] = strtolower($params['order']);
            }
        }
        
        // Handle pagination
        if (isset($params['page']) && is_numeric($params['page']) && (int)$params['page'] > 0) {
            $query['page'] = (int)$params['page'];
        }
        
        if (isset($params['per_page']) && is_numeric($params['per_page'])) {
            $perPage = (int)$params['per_page'];
            if ($perPage > 0 && $perPage <= 100) {
                $query['per_page'] = $perPage;
            }
        }
        
        // Handle show_deleted flag
        if (isset($params['show_deleted'])) {
            $query['show_deleted'] = $this->convertToBoolean($params['show_deleted']);
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
