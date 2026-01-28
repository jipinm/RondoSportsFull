<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use XS2EventProxy\Repository\TicketMarkupRepository;
use Psr\Log\LoggerInterface;
use Exception;

/**
 * Controller for ticket markup pricing management
 */
class TicketMarkupController
{
    private TicketMarkupRepository $markupRepository;
    private LoggerInterface $logger;

    public function __construct(
        TicketMarkupRepository $markupRepository,
        LoggerInterface $logger
    ) {
        $this->markupRepository = $markupRepository;
        $this->logger = $logger;
    }

    /**
     * Batch create or update markups for all tickets in an event
     * POST /api/v1/admin/ticket-markups/batch
     * 
     * Request body:
     * {
     *   "event_id": "event123",
     *   "tickets": [
     *     {
     *       "ticket_id": "ticket1",
     *       "markup_price_usd": 10.00,
     *       "base_price_usd": 50.00,
     *       "final_price_usd": 60.00
     *     }
     *   ]
     * }
     */
    public function batchUpsertMarkups(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            // Validate required fields
            if (empty($data['event_id'])) {
                return $this->errorResponse($response, 'event_id is required', 400);
            }

            if (empty($data['tickets']) || !is_array($data['tickets'])) {
                return $this->errorResponse($response, 'tickets array is required', 400);
            }

            // Validate each ticket data
            foreach ($data['tickets'] as $index => $ticket) {
                if (empty($ticket['ticket_id'])) {
                    return $this->errorResponse($response, "ticket_id is required for ticket at index {$index}", 400);
                }
                if (!isset($ticket['markup_price_usd']) || !is_numeric($ticket['markup_price_usd'])) {
                    return $this->errorResponse($response, "markup_price_usd must be numeric for ticket at index {$index}", 400);
                }
                if (!isset($ticket['base_price_usd']) || !is_numeric($ticket['base_price_usd'])) {
                    return $this->errorResponse($response, "base_price_usd must be numeric for ticket at index {$index}", 400);
                }
                if (!isset($ticket['final_price_usd']) || !is_numeric($ticket['final_price_usd'])) {
                    return $this->errorResponse($response, "final_price_usd must be numeric for ticket at index {$index}", 400);
                }
                
                // Validate markup_type if provided
                if (isset($ticket['markup_type']) && !in_array($ticket['markup_type'], ['fixed', 'percentage'])) {
                    return $this->errorResponse($response, "markup_type must be 'fixed' or 'percentage' for ticket at index {$index}", 400);
                }
                
                // Validate markup_percentage if markup_type is percentage
                if (isset($ticket['markup_type']) && $ticket['markup_type'] === 'percentage') {
                    if (!isset($ticket['markup_percentage']) || !is_numeric($ticket['markup_percentage'])) {
                        return $this->errorResponse($response, "markup_percentage is required when markup_type is 'percentage' for ticket at index {$index}", 400);
                    }
                    if ($ticket['markup_percentage'] < 0 || $ticket['markup_percentage'] > 1000) {
                        return $this->errorResponse($response, "markup_percentage must be between 0 and 1000 for ticket at index {$index}", 400);
                    }
                }
            }

            // Perform batch upsert
            $result = $this->markupRepository->batchUpsertMarkups(
                $data['event_id'],
                $data['tickets'],
                $adminUser['id']
            );

            $this->logger->info('Batch markup upsert completed', [
                'event_id' => $data['event_id'],
                'admin_user_id' => $adminUser['id'],
                'affected_count' => $result['affected_count']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'message' => $result['message']
            ]));

            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to batch upsert markups', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get all markups for a specific event
     * GET /api/v1/admin/ticket-markups/event/{eventId}
     */
    public function getMarkupsByEvent(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $eventId = $args['eventId'];

            $markups = $this->markupRepository->getMarkupsByEvent($eventId);

            $this->logger->info('Retrieved markups for event', [
                'event_id' => $eventId,
                'count' => count($markups)
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $markups,
                'count' => count($markups)
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get markups by event', [
                'event_id' => $args['eventId'] ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get markup for a specific ticket
     * GET /api/v1/admin/ticket-markups/ticket/{ticketId}
     */
    public function getMarkupByTicket(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $ticketId = $args['ticketId'];

            $markup = $this->markupRepository->getMarkupByTicket($ticketId);

            if (!$markup) {
                return $this->errorResponse($response, 'Markup not found for this ticket', 404);
            }

            $this->logger->info('Retrieved markup for ticket', [
                'ticket_id' => $ticketId
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $markup
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get markup by ticket', [
                'ticket_id' => $args['ticketId'] ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get markup by ID
     * GET /api/v1/admin/ticket-markups/{id}
     */
    public function getMarkupById(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];

            $markup = $this->markupRepository->getMarkupById($id);

            if (!$markup) {
                return $this->errorResponse($response, 'Markup not found', 404);
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $markup
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get markup by ID', [
                'markup_id' => $args['id'] ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Update a single markup
     * PUT /api/v1/admin/ticket-markups/{id}
     * 
     * Request body:
     * {
     *   "markup_price_usd": 15.00,
     *   "base_price_usd": 50.00,
     *   "final_price_usd": 65.00
     * }
     */
    public function updateMarkup(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            // Validate input
            if (!isset($data['markup_price_usd']) || !is_numeric($data['markup_price_usd'])) {
                return $this->errorResponse($response, 'markup_price_usd must be numeric', 400);
            }
            if (!isset($data['base_price_usd']) || !is_numeric($data['base_price_usd'])) {
                return $this->errorResponse($response, 'base_price_usd must be numeric', 400);
            }
            if (!isset($data['final_price_usd']) || !is_numeric($data['final_price_usd'])) {
                return $this->errorResponse($response, 'final_price_usd must be numeric', 400);
            }
            
            // Validate markup_type if provided
            if (isset($data['markup_type']) && !in_array($data['markup_type'], ['fixed', 'percentage'])) {
                return $this->errorResponse($response, "markup_type must be 'fixed' or 'percentage'", 400);
            }
            
            // Validate markup_percentage if markup_type is percentage
            if (isset($data['markup_type']) && $data['markup_type'] === 'percentage') {
                if (!isset($data['markup_percentage']) || !is_numeric($data['markup_percentage'])) {
                    return $this->errorResponse($response, "markup_percentage is required when markup_type is 'percentage'", 400);
                }
                if ($data['markup_percentage'] < 0 || $data['markup_percentage'] > 1000) {
                    return $this->errorResponse($response, 'markup_percentage must be between 0 and 1000', 400);
                }
            }

            // Check if markup exists
            $existingMarkup = $this->markupRepository->getMarkupById($id);
            if (!$existingMarkup) {
                return $this->errorResponse($response, 'Markup not found', 404);
            }

            // Update markup
            $success = $this->markupRepository->updateMarkup($id, $data, $adminUser['id']);

            if (!$success) {
                return $this->errorResponse($response, 'Failed to update markup', 500);
            }

            $this->logger->info('Markup updated successfully', [
                'markup_id' => $id,
                'admin_user_id' => $adminUser['id']
            ]);

            // Get updated markup
            $updatedMarkup = $this->markupRepository->getMarkupById($id);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $updatedMarkup,
                'message' => 'Markup updated successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to update markup', [
                'markup_id' => $args['id'] ?? null,
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Delete markup by ID
     * DELETE /api/v1/admin/ticket-markups/{id}
     */
    public function deleteMarkupById(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            // Check if markup exists
            $existingMarkup = $this->markupRepository->getMarkupById($id);
            if (!$existingMarkup) {
                return $this->errorResponse($response, 'Markup not found', 404);
            }

            // Delete markup
            $success = $this->markupRepository->deleteMarkupById($id);

            if (!$success) {
                return $this->errorResponse($response, 'Failed to delete markup', 500);
            }

            $this->logger->info('Markup deleted successfully', [
                'markup_id' => $id,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Markup deleted successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to delete markup', [
                'markup_id' => $args['id'] ?? null,
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Delete markup by ticket ID
     * DELETE /api/v1/admin/ticket-markups/ticket/{ticketId}
     */
    public function deleteMarkupByTicket(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $ticketId = $args['ticketId'];
            $adminUser = $request->getAttribute('user');

            $success = $this->markupRepository->deleteMarkupByTicket($ticketId);

            if (!$success) {
                return $this->errorResponse($response, 'Markup not found or failed to delete', 404);
            }

            $this->logger->info('Markup deleted by ticket ID', [
                'ticket_id' => $ticketId,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Markup deleted successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to delete markup by ticket', [
                'ticket_id' => $args['ticketId'] ?? null,
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Delete all markups for an event
     * DELETE /api/v1/admin/ticket-markups/event/{eventId}
     */
    public function deleteMarkupsByEvent(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $eventId = $args['eventId'];
            $adminUser = $request->getAttribute('user');

            $deletedCount = $this->markupRepository->deleteMarkupsByEvent($eventId);

            $this->logger->info('Markups deleted for event', [
                'event_id' => $eventId,
                'deleted_count' => $deletedCount,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'deleted_count' => $deletedCount,
                'message' => "Deleted {$deletedCount} markup(s) for event"
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to delete markups by event', [
                'event_id' => $args['eventId'] ?? null,
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get all markups with pagination
     * GET /api/v1/admin/ticket-markups
     */
    public function getAllMarkups(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $page = max(1, (int)($queryParams['page'] ?? 1));
            $limit = min(100, max(1, (int)($queryParams['per_page'] ?? 50)));

            $result = $this->markupRepository->getAllMarkups($page, $limit);

            $this->logger->info('Retrieved all markups', [
                'page' => $page,
                'limit' => $limit,
                'total' => $result['pagination']['total_records']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result['data'],
                'pagination' => $result['pagination']
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get all markups', [
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Helper method to create error response
     */
    private function errorResponse(Response $response, string $message, int $status = 400): ResponseInterface
    {
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => $message
        ]));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
