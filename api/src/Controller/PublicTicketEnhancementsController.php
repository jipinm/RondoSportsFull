<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\TicketMarkupRepository;
use XS2EventProxy\Repository\MarkupRuleRepository;
use XS2EventProxy\Repository\HospitalityRepository;
use XS2EventProxy\Exception\ApiException;
use Exception;

/**
 * Public API Controller for ticket enhancements (markup pricing & hospitality)
 * These endpoints are for the customer-facing frontend application
 */
class PublicTicketEnhancementsController
{
    private LoggerInterface $logger;
    private TicketMarkupRepository $markupRepository;
    private MarkupRuleRepository $markupRuleRepository;
    private HospitalityRepository $hospitalityRepository;

    public function __construct(
        LoggerInterface $logger,
        TicketMarkupRepository $markupRepository,
        MarkupRuleRepository $markupRuleRepository,
        HospitalityRepository $hospitalityRepository
    ) {
        $this->logger = $logger;
        $this->markupRepository = $markupRepository;
        $this->markupRuleRepository = $markupRuleRepository;
        $this->hospitalityRepository = $hospitalityRepository;
    }

    /**
     * Get ticket markup pricing for an event
     * GET /v1/events/{eventId}/markups
     * 
     * Returns markup pricing for all tickets in an event
     * Response format:
     * {
     *   "success": true,
     *   "data": {
     *     "event_id": "event123",
     *     "markups": [
     *       {
     *         "ticket_id": "ticket1",
     *         "markup_price_usd": 10.00,
     *         "base_price_usd": 50.00,
     *         "final_price_usd": 60.00
     *       }
     *     ]
     *   }
     * }
     */
    public function getEventMarkups(Request $request, Response $response, array $args): Response
    {
        try {
            $eventId = $args['eventId'] ?? '';

            if (empty($eventId)) {
                throw new ApiException('Event ID is required', 400);
            }

            $markups = $this->markupRepository->getMarkupsByEvent($eventId);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => [
                    'event_id' => $eventId,
                    'markups' => $markups
                ]
            ]));

            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=300') // Cache for 5 minutes
                ->withStatus(200);

        } catch (ApiException $e) {
            $this->logger->error('Failed to get event markups', [
                'event_id' => $eventId ?? '',
                'error' => $e->getMessage()
            ]);
            
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (Exception $e) {
            $this->logger->error('Failed to get event markups', [
                'event_id' => $eventId ?? '',
                'error' => $e->getMessage()
            ]);
            
            return $this->errorResponse($response, 'Failed to retrieve markup pricing', 500);
        }
    }

    /**
     * Get ticket markup pricing for a specific ticket
     * GET /v1/tickets/{ticketId}/markup
     * 
     * Returns markup pricing for a single ticket
     */
    public function getTicketMarkup(Request $request, Response $response, array $args): Response
    {
        try {
            $ticketId = $args['ticketId'] ?? '';

            if (empty($ticketId)) {
                throw new ApiException('Ticket ID is required', 400);
            }

            $markup = $this->markupRepository->getMarkupByTicket($ticketId);

            if (!$markup) {
                // No markup found - return null data
                $response->getBody()->write(json_encode([
                    'success' => true,
                    'data' => null
                ]));
            } else {
                $response->getBody()->write(json_encode([
                    'success' => true,
                    'data' => $markup
                ]));
            }

            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=300')
                ->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to get ticket markup', [
                'ticket_id' => $ticketId ?? '',
                'error' => $e->getMessage()
            ]);
            
            return $this->errorResponse($response, 'Failed to retrieve markup pricing', 500);
        }
    }

    /**
     * Get hospitality services for an event
     * GET /v1/events/{eventId}/hospitalities
     * 
     * Returns all hospitality services assigned to tickets in an event
     */
    public function getEventHospitalities(Request $request, Response $response, array $args): Response
    {
        try {
            $eventId = $args['eventId'] ?? '';

            if (empty($eventId)) {
                throw new ApiException('Event ID is required', 400);
            }

            $hospitalities = $this->hospitalityRepository->getEventHospitalities($eventId);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $hospitalities
            ]));

            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=300')
                ->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to get event hospitalities', [
                'event_id' => $eventId ?? '',
                'error' => $e->getMessage()
            ]);
            
            return $this->errorResponse($response, 'Failed to retrieve hospitality services', 500);
        }
    }

    /**
     * Get hospitality services for a specific ticket
     * GET /v1/tickets/{ticketId}/hospitalities
     * 
     * Requires event_id as query parameter
     */
    public function getTicketHospitalities(Request $request, Response $response, array $args): Response
    {
        try {
            $ticketId = $args['ticketId'] ?? '';
            $queryParams = $request->getQueryParams();
            $eventId = $queryParams['event_id'] ?? '';

            if (empty($ticketId)) {
                throw new ApiException('Ticket ID is required', 400);
            }

            if (empty($eventId)) {
                throw new ApiException('event_id query parameter is required', 400);
            }

            $hospitalities = $this->hospitalityRepository->getTicketHospitalities($eventId, $ticketId);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => [
                    'ticket_id' => $ticketId,
                    'event_id' => $eventId,
                    'hospitalities' => $hospitalities
                ]
            ]));

            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=300')
                ->withStatus(200);

        } catch (ApiException $e) {
            $this->logger->error('Failed to get ticket hospitalities', [
                'ticket_id' => $ticketId ?? '',
                'event_id' => $eventId ?? '',
                'error' => $e->getMessage()
            ]);
            
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (Exception $e) {
            $this->logger->error('Failed to get ticket hospitalities', [
                'ticket_id' => $ticketId ?? '',
                'event_id' => $eventId ?? '',
                'error' => $e->getMessage()
            ]);
            
            return $this->errorResponse($response, 'Failed to retrieve hospitality services', 500);
        }
    }

    /**
     * Get all active hospitality services
     * GET /v1/hospitalities
     * 
     * Returns all active hospitality services available for selection
     */
    public function getActiveHospitalities(Request $request, Response $response): Response
    {
        try {
            $hospitalities = $this->hospitalityRepository->getAllActiveHospitalities();

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $hospitalities
            ]));

            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=600') // Cache for 10 minutes
                ->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to get active hospitalities', [
                'error' => $e->getMessage()
            ]);
            
            return $this->errorResponse($response, 'Failed to retrieve hospitality services', 500);
        }
    }

    /**
     * Resolve effective markup for a ticket with hierarchical context
     * GET /v1/events/{eventId}/tickets/{ticketId}/effective-markup
     * 
     * Query params: sport_type, tournament_id, team_id
     * 
     * Returns the most-specific markup rule that applies,
     * checking ticket > event > team > tournament > sport levels.
     */
    public function getEffectiveMarkup(Request $request, Response $response, array $args): Response
    {
        try {
            $eventId = $args['eventId'] ?? '';
            $ticketId = $args['ticketId'] ?? '';

            if (empty($eventId) || empty($ticketId)) {
                throw new ApiException('Event ID and Ticket ID are required', 400);
            }

            $queryParams = $request->getQueryParams();
            $sportType = $queryParams['sport_type'] ?? '';
            $tournamentId = $queryParams['tournament_id'] ?? null;
            $teamId = $queryParams['team_id'] ?? null;

            $resolved = null;
            if (!empty($sportType)) {
                // Use hierarchical resolution
                $resolved = $this->markupRuleRepository->resolveMarkup(
                    $sportType, $tournamentId, $teamId, $eventId, $ticketId
                );
            }

            // Fallback to legacy markup if no hierarchical context or no rule found
            if (!$resolved) {
                $legacyMarkup = $this->markupRepository->getMarkupByTicket($ticketId);
                if ($legacyMarkup) {
                    $resolved = [
                        'level' => 'ticket',
                        'source' => 'legacy',
                        'markup_type' => $legacyMarkup['markup_type'] ?? 'fixed',
                        'markup_amount' => $legacyMarkup['markup_type'] === 'percentage'
                            ? (float) $legacyMarkup['markup_percentage']
                            : (float) $legacyMarkup['markup_price_usd'],
                        'markup_price_usd' => (float) $legacyMarkup['markup_price_usd'],
                        'markup_percentage' => $legacyMarkup['markup_percentage'] !== null
                            ? (float) $legacyMarkup['markup_percentage']
                            : null,
                        'base_price_usd' => (float) $legacyMarkup['base_price_usd'],
                        'final_price_usd' => (float) $legacyMarkup['final_price_usd'],
                    ];
                }
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $resolved,
            ]));

            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=300')
                ->withStatus(200);

        } catch (ApiException $e) {
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (Exception $e) {
            $this->logger->error('Failed to resolve effective markup', [
                'event_id' => $eventId ?? '',
                'ticket_id' => $ticketId ?? '',
                'error' => $e->getMessage(),
            ]);
            return $this->errorResponse($response, 'Failed to resolve markup', 500);
        }
    }

    /**
     * Resolve effective markups for all tickets in an event (hierarchical)
     * GET /v1/events/{eventId}/effective-markups
     * 
     * Query params: sport_type, tournament_id, team_id, ticket_ids (comma-separated)
     */
    public function getEventEffectiveMarkups(Request $request, Response $response, array $args): Response
    {
        try {
            $eventId = $args['eventId'] ?? '';

            if (empty($eventId)) {
                throw new ApiException('Event ID is required', 400);
            }

            $queryParams = $request->getQueryParams();
            $sportType = $queryParams['sport_type'] ?? '';
            $tournamentId = $queryParams['tournament_id'] ?? null;
            $teamId = $queryParams['team_id'] ?? null;
            $ticketIdsStr = $queryParams['ticket_ids'] ?? '';

            $ticketIds = !empty($ticketIdsStr) ? explode(',', $ticketIdsStr) : [];

            if (!empty($sportType) && !empty($ticketIds)) {
                // Use hierarchical resolution for all tickets
                $resolved = $this->markupRuleRepository->resolveMarkupsForEvent(
                    $sportType, $tournamentId, $teamId, $eventId, $ticketIds
                );
            } else {
                // Fallback to legacy event markups
                $legacyMarkups = $this->markupRepository->getMarkupsByEvent($eventId);
                $resolved = [];
                foreach ($legacyMarkups as $m) {
                    $resolved[$m['ticket_id']] = [
                        'level' => 'ticket',
                        'source' => 'legacy',
                        'markup_type' => $m['markup_type'] ?? 'fixed',
                        'markup_amount' => $m['markup_type'] === 'percentage'
                            ? (float) $m['markup_percentage']
                            : (float) $m['markup_price_usd'],
                        'markup_price_usd' => (float) $m['markup_price_usd'],
                        'markup_percentage' => $m['markup_percentage'] !== null
                            ? (float) $m['markup_percentage']
                            : null,
                        'base_price_usd' => (float) $m['base_price_usd'],
                        'final_price_usd' => (float) $m['final_price_usd'],
                    ];
                }
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => [
                    'event_id' => $eventId,
                    'markups' => $resolved,
                ],
            ]));

            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=300')
                ->withStatus(200);

        } catch (ApiException $e) {
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (Exception $e) {
            $this->logger->error('Failed to resolve event effective markups', [
                'event_id' => $eventId ?? '',
                'error' => $e->getMessage(),
            ]);
            return $this->errorResponse($response, 'Failed to resolve markup pricing', 500);
        }
    }

    /**
     * Resolve effective hospitalities for all tickets in an event (hierarchical)
     * GET /v1/events/{eventId}/effective-hospitalities
     * 
     * Query params: sport_type, tournament_id, team_id, ticket_ids (comma-separated)
     * 
     * Returns all hospitality services that apply to each ticket based on
     * the hierarchical assignment (sport → tournament → team → event → ticket).
     */
    public function getEventEffectiveHospitalities(Request $request, Response $response, array $args): Response
    {
        try {
            $eventId = $args['eventId'] ?? '';

            if (empty($eventId)) {
                throw new ApiException('Event ID is required', 400);
            }

            $queryParams = $request->getQueryParams();
            $sportType = $queryParams['sport_type'] ?? '';
            $tournamentId = $queryParams['tournament_id'] ?? null;
            $teamId = $queryParams['team_id'] ?? null;
            $ticketIdsStr = $queryParams['ticket_ids'] ?? '';

            $ticketIds = !empty($ticketIdsStr) ? explode(',', $ticketIdsStr) : [];

            if (!empty($sportType) && !empty($ticketIds)) {
                // Use hierarchical resolution
                $resolved = $this->hospitalityRepository->resolveHospitalitiesForEvent(
                    $eventId, $sportType, $tournamentId, $teamId, $ticketIds
                );
            } else {
                // Fallback to legacy event hospitalities (flat)
                $legacyData = $this->hospitalityRepository->getEventHospitalities($eventId);
                $resolved = [];
                foreach ($legacyData as $item) {
                    $tId = $item['ticket_id'];
                    if (!isset($resolved[$tId])) {
                        $resolved[$tId] = [];
                    }
                    $item['level'] = 'ticket';
                    $item['source'] = 'legacy';
                    $resolved[$tId][] = $item;
                }
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => [
                    'event_id' => $eventId,
                    'hospitalities' => $resolved,
                ],
            ]));

            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=300')
                ->withStatus(200);

        } catch (ApiException $e) {
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (Exception $e) {
            $this->logger->error('Failed to resolve event effective hospitalities', [
                'event_id' => $eventId ?? '',
                'error' => $e->getMessage(),
            ]);
            return $this->errorResponse($response, 'Failed to resolve hospitality services', 500);
        }
    }

    /**
     * Resolve effective hospitalities for a single ticket (hierarchical)
     * GET /v1/events/{eventId}/tickets/{ticketId}/effective-hospitalities
     * 
     * Query params: sport_type, tournament_id, team_id
     */
    public function getTicketEffectiveHospitalities(Request $request, Response $response, array $args): Response
    {
        try {
            $eventId = $args['eventId'] ?? '';
            $ticketId = $args['ticketId'] ?? '';

            if (empty($eventId) || empty($ticketId)) {
                throw new ApiException('Event ID and Ticket ID are required', 400);
            }

            $queryParams = $request->getQueryParams();
            $sportType = $queryParams['sport_type'] ?? '';
            $tournamentId = $queryParams['tournament_id'] ?? null;
            $teamId = $queryParams['team_id'] ?? null;

            if (!empty($sportType)) {
                $resolved = $this->hospitalityRepository->resolveHospitalitiesForTicket(
                    $sportType, $tournamentId, $teamId, $eventId, $ticketId
                );
            } else {
                // Fallback to legacy
                $resolved = $this->hospitalityRepository->getTicketHospitalities($eventId, $ticketId);
                foreach ($resolved as &$item) {
                    $item['level'] = 'ticket';
                    $item['source'] = 'legacy';
                }
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => [
                    'event_id' => $eventId,
                    'ticket_id' => $ticketId,
                    'hospitalities' => $resolved,
                ],
            ]));

            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withHeader('Cache-Control', 'public, max-age=300')
                ->withStatus(200);

        } catch (ApiException $e) {
            return $this->errorResponse($response, $e->getMessage(), $e->getCode());
        } catch (Exception $e) {
            $this->logger->error('Failed to resolve ticket effective hospitalities', [
                'event_id' => $eventId ?? '',
                'ticket_id' => $ticketId ?? '',
                'error' => $e->getMessage(),
            ]);
            return $this->errorResponse($response, 'Failed to resolve hospitality services', 500);
        }
    }

    /**
     * Error response helper
     */
    private function errorResponse(Response $response, string $message, int $statusCode = 500): Response
    {
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => $message
        ]));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }
}
