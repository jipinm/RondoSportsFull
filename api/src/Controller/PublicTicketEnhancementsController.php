<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\TicketMarkupRepository;
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
    private HospitalityRepository $hospitalityRepository;

    public function __construct(
        LoggerInterface $logger,
        TicketMarkupRepository $markupRepository,
        HospitalityRepository $hospitalityRepository
    ) {
        $this->logger = $logger;
        $this->markupRepository = $markupRepository;
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
