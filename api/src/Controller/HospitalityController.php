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
 * Controller for hospitality services management.
 * 
 * Handles:
 *  - CRUD for hospitality services (price removed)
 *  - Hierarchical assignment at 5 levels (sport, tournament, team, event, ticket)
 *  - Legacy ticket-level assignments (backward compatibility)
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
    // Hospitality CRUD Operations (Price Removed)
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

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $hospitalities,
                'count' => count($hospitalities)
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get hospitalities', ['error' => $e->getMessage()]);
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
            $this->logger->error('Failed to get hospitality', ['id' => $args['id'] ?? null, 'error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Create a new hospitality service (no price_usd)
     * POST /api/v1/admin/hospitalities
     */
    public function createHospitality(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            if (empty($data['name'])) {
                return $this->errorResponse($response, 'name is required', 400);
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
            $this->logger->error('Failed to create hospitality', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Update an existing hospitality service (no price_usd)
     * PUT /api/v1/admin/hospitalities/{id}
     */
    public function updateHospitality(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            $existing = $this->hospitalityRepository->getHospitalityById($id);
            if (!$existing) {
                return $this->errorResponse($response, 'Hospitality service not found', 404);
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
            $this->logger->error('Failed to update hospitality', ['id' => $args['id'] ?? null, 'error' => $e->getMessage()]);
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
            $this->logger->error('Failed to delete hospitality', ['id' => $args['id'] ?? null, 'error' => $e->getMessage()]);
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
            $this->logger->error('Failed to get hospitality stats', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    // ========================================================================
    // Hierarchical Assignment Operations (NEW)
    // ========================================================================

    /**
     * Create/update a hospitality assignment at a hierarchy level
     * POST /api/v1/admin/hospitality-assignments
     * 
     * Body: { hospitality_id, sport_type, tournament_id?, team_id?, event_id?, ticket_id?,
     *         sport_name?, tournament_name?, team_name?, event_name?, ticket_name? }
     */
    public function createAssignment(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            if (empty($data['hospitality_id'])) {
                return $this->errorResponse($response, 'hospitality_id is required', 400);
            }

            if (empty($data['sport_type']) && empty($data['event_id'])) {
                return $this->errorResponse($response, 'At least sport_type or event_id is required', 400);
            }

            $result = $this->hospitalityRepository->upsertAssignment($data, $adminUser['id']);

            $this->logger->info('Created/updated hospitality assignment', [
                'hospitality_id' => $data['hospitality_id'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'message' => 'Hospitality assignment saved successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

        } catch (Exception $e) {
            $this->logger->error('Failed to create hospitality assignment', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Batch assign multiple hospitality services at a scope level
     * POST /api/v1/admin/hospitality-assignments/batch
     * 
     * Body: { hospitality_ids: [1,2,3], sport_type, tournament_id?, team_id?, event_id?, ticket_id?,
     *         sport_name?, tournament_name?, team_name?, event_name?, ticket_name? }
     */
    public function batchCreateAssignments(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            if (empty($data['hospitality_ids']) || !is_array($data['hospitality_ids'])) {
                return $this->errorResponse($response, 'hospitality_ids array is required', 400);
            }

            if (empty($data['sport_type']) && empty($data['event_id'])) {
                return $this->errorResponse($response, 'At least sport_type or event_id is required', 400);
            }

            // Extract scope data (everything except hospitality_ids)
            $scopeData = $data;
            unset($scopeData['hospitality_ids']);

            $result = $this->hospitalityRepository->batchUpsertAssignments(
                $scopeData,
                $data['hospitality_ids'],
                $adminUser['id']
            );

            $this->logger->info('Batch assigned hospitalities', [
                'count' => count($data['hospitality_ids']),
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'message' => $result['message']
            ]));

            return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

        } catch (Exception $e) {
            $this->logger->error('Failed to batch assign hospitalities', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Replace all assignments at a scope level
     * PUT /api/v1/admin/hospitality-assignments/scope
     * 
     * Body: { hospitality_ids: [1,2,3], sport_type, tournament_id?, team_id?, event_id?, ticket_id?,
     *         sport_name?, tournament_name?, team_name?, event_name?, ticket_name? }
     */
    public function replaceAssignmentsAtScope(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            if (!isset($data['hospitality_ids']) || !is_array($data['hospitality_ids'])) {
                return $this->errorResponse($response, 'hospitality_ids array is required', 400);
            }

            // Extract scope data
            $scopeData = $data;
            unset($scopeData['hospitality_ids']);

            $result = $this->hospitalityRepository->replaceAssignmentsAtScope(
                $scopeData,
                $data['hospitality_ids'],
                $adminUser['id']
            );

            $this->logger->info('Replaced hospitality assignments at scope', [
                'deleted_count' => $result['deleted_count'],
                'inserted_count' => $result['inserted_count'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'message' => $result['message']
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to replace hospitality assignments', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get assignments at a scope (exact match)
     * GET /api/v1/admin/hospitality-assignments/scope
     * 
     * Query params: sport_type, tournament_id, team_id, event_id, ticket_id
     */
    public function getAssignmentsAtScope(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();

            $scopeData = [
                'sport_type' => $queryParams['sport_type'] ?? null,
                'tournament_id' => $queryParams['tournament_id'] ?? null,
                'team_id' => $queryParams['team_id'] ?? null,
                'event_id' => $queryParams['event_id'] ?? null,
                'ticket_id' => $queryParams['ticket_id'] ?? null,
            ];

            $assignments = $this->hospitalityRepository->getAssignmentsAtScope($scopeData);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $assignments,
                'count' => count($assignments)
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get assignments at scope', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get all assignments with optional filters
     * GET /api/v1/admin/hospitality-assignments
     * 
     * Query params: level, sport_type, tournament_id, team_id, event_id, hospitality_id, is_active, page, limit
     */
    public function getAllAssignments(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $page = max(1, (int) ($queryParams['page'] ?? 1));
            $limit = min(100, max(1, (int) ($queryParams['limit'] ?? 50)));

            $filters = [];
            foreach (['level', 'sport_type', 'tournament_id', 'team_id', 'event_id', 'hospitality_id'] as $key) {
                if (!empty($queryParams[$key])) {
                    $filters[$key] = $queryParams[$key];
                }
            }
            if (isset($queryParams['is_active'])) {
                $filters['is_active'] = (int) $queryParams['is_active'];
            }

            $result = $this->hospitalityRepository->getAllAssignments($filters, $page, $limit);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result['data'],
                'pagination' => $result['pagination']
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get all assignments', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get a single assignment by ID
     * GET /api/v1/admin/hospitality-assignments/{id}
     */
    public function getAssignmentById(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $assignment = $this->hospitalityRepository->getAssignmentById($id);

            if (!$assignment) {
                return $this->errorResponse($response, 'Hospitality assignment not found', 404);
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $assignment
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get assignment', ['id' => $args['id'] ?? null, 'error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Delete a specific assignment by ID
     * DELETE /api/v1/admin/hospitality-assignments/{id}
     */
    public function deleteAssignment(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            $existing = $this->hospitalityRepository->getAssignmentById($id);
            if (!$existing) {
                return $this->errorResponse($response, 'Hospitality assignment not found', 404);
            }

            $success = $this->hospitalityRepository->deleteAssignment($id);

            if (!$success) {
                return $this->errorResponse($response, 'Failed to delete hospitality assignment', 500);
            }

            $this->logger->info('Deleted hospitality assignment', [
                'assignment_id' => $id,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Hospitality assignment deleted successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to delete assignment', ['id' => $args['id'] ?? null, 'error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Remove all assignments at a scope
     * DELETE /api/v1/admin/hospitality-assignments/scope
     * 
     * Query params: sport_type, tournament_id, team_id, event_id, ticket_id
     */
    public function removeAssignmentsAtScope(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $adminUser = $request->getAttribute('user');

            $scopeData = [
                'sport_type' => $queryParams['sport_type'] ?? null,
                'tournament_id' => $queryParams['tournament_id'] ?? null,
                'team_id' => $queryParams['team_id'] ?? null,
                'event_id' => $queryParams['event_id'] ?? null,
                'ticket_id' => $queryParams['ticket_id'] ?? null,
            ];

            $deletedCount = $this->hospitalityRepository->removeAssignmentsAtScope($scopeData);

            $this->logger->info('Removed hospitality assignments at scope', [
                'deleted_count' => $deletedCount,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'deleted_count' => $deletedCount,
                'message' => "Removed {$deletedCount} hospitality assignments"
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to remove assignments at scope', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Resolve effective hospitalities for a ticket (admin preview)
     * POST /api/v1/admin/hospitality-assignments/resolve
     * 
     * Body: { sport_type, tournament_id?, team_id?, event_id, ticket_id }
     */
    public function resolveForTicket(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();

            if (empty($data['sport_type']) || empty($data['event_id']) || empty($data['ticket_id'])) {
                return $this->errorResponse($response, 'sport_type, event_id, and ticket_id are required', 400);
            }

            $resolved = $this->hospitalityRepository->resolveHospitalitiesForTicket(
                $data['sport_type'],
                $data['tournament_id'] ?? null,
                $data['team_id'] ?? null,
                $data['event_id'],
                $data['ticket_id']
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $resolved,
                'count' => count($resolved)
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to resolve hospitalities', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    // ========================================================================
    // Legacy Ticket-Hospitality Assignment Operations (Backward Compatible)
    // ========================================================================

    /**
     * Get hospitalities assigned to a specific ticket (legacy)
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
            $this->logger->error('Failed to get ticket hospitalities', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get all hospitality assignments for an event (legacy)
     * GET /api/v1/admin/hospitalities/event/{eventId}
     */
    public function getEventHospitalities(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $eventId = $args['eventId'];

            $hospitalities = $this->hospitalityRepository->getHospitalitiesByEvent($eventId);

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
            $this->logger->error('Failed to get event hospitalities', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Assign hospitalities to a ticket (legacy)
     * POST /api/v1/admin/hospitalities/ticket/{eventId}/{ticketId}
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
                $eventId, $ticketId, $data['hospitality_ids'], $adminUser['id']
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'message' => $result['message']
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to assign ticket hospitalities', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Batch assign hospitalities to multiple tickets in an event (legacy)
     * POST /api/v1/admin/hospitalities/batch
     */
    public function batchAssignHospitalities(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            if (empty($data['event_id'])) {
                return $this->errorResponse($response, 'event_id is required', 400);
            }

            if (!isset($data['tickets']) || !is_array($data['tickets'])) {
                return $this->errorResponse($response, 'tickets object is required', 400);
            }

            $result = $this->hospitalityRepository->batchAssignHospitalities(
                $data['event_id'], $data['tickets'], $adminUser['id']
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'message' => $result['message']
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to batch assign hospitalities', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Remove all hospitalities from a ticket (legacy)
     * DELETE /api/v1/admin/hospitalities/ticket/{eventId}/{ticketId}
     */
    public function removeTicketHospitalities(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $eventId = $args['eventId'];
            $ticketId = $args['ticketId'];

            $deletedCount = $this->hospitalityRepository->removeTicketHospitalities($eventId, $ticketId);

            $response->getBody()->write(json_encode([
                'success' => true,
                'deleted_count' => $deletedCount,
                'message' => "Removed {$deletedCount} hospitality assignments from ticket"
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to remove ticket hospitalities', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Remove all hospitalities from an event (legacy)
     * DELETE /api/v1/admin/hospitalities/event/{eventId}
     */
    public function removeEventHospitalities(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $eventId = $args['eventId'];

            $deletedCount = $this->hospitalityRepository->removeEventHospitalities($eventId);

            $response->getBody()->write(json_encode([
                'success' => true,
                'deleted_count' => $deletedCount,
                'message' => "Removed {$deletedCount} hospitality assignments from event"
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to remove event hospitalities', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    private function errorResponse(Response $response, string $message, int $statusCode): ResponseInterface
    {
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => $message
        ]));

        return $response->withHeader('Content-Type', 'application/json')->withStatus($statusCode);
    }
}
