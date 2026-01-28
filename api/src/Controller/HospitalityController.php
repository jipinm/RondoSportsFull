<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use XS2EventProxy\Repository\HospitalityRepository;
use Psr\Log\LoggerInterface;
use Exception;

/**
 * Controller for hospitality services management
 */
class HospitalityController
{
    private HospitalityRepository $hospitalityRepository;
    private LoggerInterface $logger;

    public function __construct(
        HospitalityRepository $hospitalityRepository,
        LoggerInterface $logger
    ) {
        $this->hospitalityRepository = $hospitalityRepository;
        $this->logger = $logger;
    }

    // ========================================================================
    // Hospitality CRUD Operations
    // ========================================================================

    /**
     * Get all hospitality services
     * GET /api/v1/admin/hospitalities
     */
    public function getAllHospitalities(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $activeOnly = isset($queryParams['active']) && $queryParams['active'] === 'true';

            $hospitalities = $this->hospitalityRepository->getAllHospitalities($activeOnly);

            $this->logger->info('Retrieved all hospitalities', [
                'count' => count($hospitalities),
                'active_only' => $activeOnly
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $hospitalities,
                'count' => count($hospitalities)
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get hospitalities', [
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get a single hospitality service by ID
     * GET /api/v1/admin/hospitalities/{id}
     */
    public function getHospitalityById(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $hospitality = $this->hospitalityRepository->getHospitalityById($id);

            if (!$hospitality) {
                return $this->errorResponse($response, 'Hospitality service not found', 404);
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $hospitality
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get hospitality', [
                'id' => $args['id'] ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Create a new hospitality service
     * POST /api/v1/admin/hospitalities
     */
    public function createHospitality(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            // Validate required fields
            if (empty($data['name'])) {
                return $this->errorResponse($response, 'name is required', 400);
            }

            if (!isset($data['price_usd']) || !is_numeric($data['price_usd'])) {
                return $this->errorResponse($response, 'price_usd must be a valid number', 400);
            }

            $hospitalityId = $this->hospitalityRepository->createHospitality($data, $adminUser['id']);
            $hospitality = $this->hospitalityRepository->getHospitalityById($hospitalityId);

            $this->logger->info('Created hospitality service', [
                'hospitality_id' => $hospitalityId,
                'name' => $data['name'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $hospitality,
                'message' => 'Hospitality service created successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

        } catch (Exception $e) {
            $this->logger->error('Failed to create hospitality', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Update an existing hospitality service
     * PUT /api/v1/admin/hospitalities/{id}
     */
    public function updateHospitality(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            // Check if hospitality exists
            $existing = $this->hospitalityRepository->getHospitalityById($id);
            if (!$existing) {
                return $this->errorResponse($response, 'Hospitality service not found', 404);
            }

            // Validate price if provided
            if (isset($data['price_usd']) && !is_numeric($data['price_usd'])) {
                return $this->errorResponse($response, 'price_usd must be a valid number', 400);
            }

            $success = $this->hospitalityRepository->updateHospitality($id, $data, $adminUser['id']);

            if (!$success) {
                return $this->errorResponse($response, 'Failed to update hospitality service', 500);
            }

            $hospitality = $this->hospitalityRepository->getHospitalityById($id);

            $this->logger->info('Updated hospitality service', [
                'hospitality_id' => $id,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $hospitality,
                'message' => 'Hospitality service updated successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to update hospitality', [
                'id' => $args['id'] ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Delete a hospitality service
     * DELETE /api/v1/admin/hospitalities/{id}
     */
    public function deleteHospitality(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            // Check if hospitality exists
            $existing = $this->hospitalityRepository->getHospitalityById($id);
            if (!$existing) {
                return $this->errorResponse($response, 'Hospitality service not found', 404);
            }

            $success = $this->hospitalityRepository->deleteHospitality($id);

            if (!$success) {
                return $this->errorResponse($response, 'Failed to delete hospitality service', 500);
            }

            $this->logger->info('Deleted hospitality service', [
                'hospitality_id' => $id,
                'name' => $existing['name'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Hospitality service deleted successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to delete hospitality', [
                'id' => $args['id'] ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get hospitality statistics
     * GET /api/v1/admin/hospitalities/stats
     */
    public function getHospitalityStats(Request $request, Response $response): ResponseInterface
    {
        try {
            $stats = $this->hospitalityRepository->getHospitalityStats();

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $stats
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get hospitality stats', [
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    // ========================================================================
    // Ticket-Hospitality Assignment Operations
    // ========================================================================

    /**
     * Get hospitalities assigned to a specific ticket
     * GET /api/v1/admin/hospitalities/ticket/{eventId}/{ticketId}
     */
    public function getTicketHospitalities(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $eventId = $args['eventId'];
            $ticketId = $args['ticketId'];

            $hospitalities = $this->hospitalityRepository->getHospitalitiesByTicket($eventId, $ticketId);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $hospitalities,
                'count' => count($hospitalities)
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get ticket hospitalities', [
                'event_id' => $args['eventId'] ?? null,
                'ticket_id' => $args['ticketId'] ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get all hospitality assignments for an event
     * GET /api/v1/admin/hospitalities/event/{eventId}
     */
    public function getEventHospitalities(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $eventId = $args['eventId'];

            $hospitalities = $this->hospitalityRepository->getHospitalitiesByEvent($eventId);

            // Group by ticket_id for easier frontend processing
            $groupedByTicket = [];
            foreach ($hospitalities as $h) {
                $ticketId = $h['ticket_id'];
                if (!isset($groupedByTicket[$ticketId])) {
                    $groupedByTicket[$ticketId] = [];
                }
                $groupedByTicket[$ticketId][] = $h;
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $hospitalities,
                'grouped_by_ticket' => $groupedByTicket,
                'count' => count($hospitalities)
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get event hospitalities', [
                'event_id' => $args['eventId'] ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Assign hospitalities to a ticket
     * POST /api/v1/admin/hospitalities/ticket/{eventId}/{ticketId}
     * 
     * Request body:
     * {
     *   "hospitality_ids": [1, 2, 3]
     * }
     */
    public function assignTicketHospitalities(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $eventId = $args['eventId'];
            $ticketId = $args['ticketId'];
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            if (!isset($data['hospitality_ids']) || !is_array($data['hospitality_ids'])) {
                return $this->errorResponse($response, 'hospitality_ids array is required', 400);
            }

            $result = $this->hospitalityRepository->assignHospitalitiesToTicket(
                $eventId,
                $ticketId,
                $data['hospitality_ids'],
                $adminUser['id']
            );

            $this->logger->info('Assigned hospitalities to ticket', [
                'event_id' => $eventId,
                'ticket_id' => $ticketId,
                'hospitality_count' => count($data['hospitality_ids']),
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'message' => $result['message']
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to assign ticket hospitalities', [
                'event_id' => $args['eventId'] ?? null,
                'ticket_id' => $args['ticketId'] ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Batch assign hospitalities to multiple tickets in an event
     * POST /api/v1/admin/hospitalities/batch
     * 
     * Request body:
     * {
     *   "event_id": "event123",
     *   "tickets": {
     *     "ticket1": [1, 2, 3],
     *     "ticket2": [1, 4],
     *     "ticket3": []
     *   }
     * }
     */
    public function batchAssignHospitalities(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            // Validate required fields
            if (empty($data['event_id'])) {
                return $this->errorResponse($response, 'event_id is required', 400);
            }

            if (!isset($data['tickets']) || !is_array($data['tickets'])) {
                return $this->errorResponse($response, 'tickets object is required', 400);
            }

            $result = $this->hospitalityRepository->batchAssignHospitalities(
                $data['event_id'],
                $data['tickets'],
                $adminUser['id']
            );

            $this->logger->info('Batch assigned hospitalities', [
                'event_id' => $data['event_id'],
                'tickets_processed' => $result['tickets_processed'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'message' => $result['message']
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to batch assign hospitalities', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Remove all hospitalities from a ticket
     * DELETE /api/v1/admin/hospitalities/ticket/{eventId}/{ticketId}
     */
    public function removeTicketHospitalities(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $eventId = $args['eventId'];
            $ticketId = $args['ticketId'];
            $adminUser = $request->getAttribute('user');

            $deletedCount = $this->hospitalityRepository->removeTicketHospitalities($eventId, $ticketId);

            $this->logger->info('Removed ticket hospitalities', [
                'event_id' => $eventId,
                'ticket_id' => $ticketId,
                'deleted_count' => $deletedCount,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'deleted_count' => $deletedCount,
                'message' => "Removed {$deletedCount} hospitality assignments from ticket"
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to remove ticket hospitalities', [
                'event_id' => $args['eventId'] ?? null,
                'ticket_id' => $args['ticketId'] ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Remove all hospitalities from an event
     * DELETE /api/v1/admin/hospitalities/event/{eventId}
     */
    public function removeEventHospitalities(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $eventId = $args['eventId'];
            $adminUser = $request->getAttribute('user');

            $deletedCount = $this->hospitalityRepository->removeEventHospitalities($eventId);

            $this->logger->info('Removed event hospitalities', [
                'event_id' => $eventId,
                'deleted_count' => $deletedCount,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'deleted_count' => $deletedCount,
                'message' => "Removed {$deletedCount} hospitality assignments from event"
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to remove event hospitalities', [
                'event_id' => $args['eventId'] ?? null,
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    /**
     * Create error response
     */
    private function errorResponse(Response $response, string $message, int $statusCode): ResponseInterface
    {
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => $message
        ]));

        return $response->withHeader('Content-Type', 'application/json')->withStatus($statusCode);
    }
}
