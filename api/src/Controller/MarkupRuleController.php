<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use XS2EventProxy\Repository\MarkupRuleRepository;
use Psr\Log\LoggerInterface;
use Exception;

/**
 * Controller for hierarchical markup rule management (Admin)
 * 
 * Supports markup at 5 levels:
 *   sport > tournament > team > event > ticket
 */
class MarkupRuleController
{
    private MarkupRuleRepository $ruleRepository;
    private LoggerInterface $logger;

    public function __construct(
        MarkupRuleRepository $ruleRepository,
        LoggerInterface $logger
    ) {
        $this->ruleRepository = $ruleRepository;
        $this->logger = $logger;
    }

    /**
     * Create or update a markup rule
     * POST /api/v1/admin/markup-rules
     * 
     * Request body:
     * {
     *   "sport_type": "soccer",           // required for all levels
     *   "tournament_id": "abc",           // optional - set for tournament level and below
     *   "team_id": "def",                 // optional - set for team level and below
     *   "event_id": "ghi",               // optional - set for event level and below
     *   "ticket_id": "jkl",              // optional - set for ticket level only
     *   "markup_type": "fixed",           // "fixed" or "percentage"
     *   "markup_amount": 50.00,           // USD amount or percentage value
     *   "sport_name": "Soccer",           // display names (optional)
     *   "tournament_name": "Premier League",
     *   "team_name": "Manchester United",
     *   "event_name": "Man Utd vs Liverpool",
     *   "ticket_name": "VIP Zone"
     * }
     */
    public function createOrUpdateRule(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            // Validate required fields
            if (empty($data['sport_type'])) {
                return $this->errorResponse($response, 'sport_type is required', 400);
            }

            if (!isset($data['markup_amount']) || !is_numeric($data['markup_amount'])) {
                return $this->errorResponse($response, 'markup_amount must be numeric', 400);
            }

            if ((float) $data['markup_amount'] < 0) {
                return $this->errorResponse($response, 'markup_amount must be non-negative', 400);
            }

            // Validate markup_type
            $validTypes = ['fixed', 'percentage'];
            if (isset($data['markup_type']) && !in_array($data['markup_type'], $validTypes)) {
                return $this->errorResponse($response, "markup_type must be 'fixed' or 'percentage'", 400);
            }

            // Percentage validation
            if (($data['markup_type'] ?? 'fixed') === 'percentage' && (float) $data['markup_amount'] > 1000) {
                return $this->errorResponse($response, 'markup_amount (percentage) must be between 0 and 1000', 400);
            }

            $result = $this->ruleRepository->upsertRule($data, $adminUser['id']);

            $this->logger->info('Markup rule created/updated', [
                'admin_user_id' => $adminUser['id'],
                'sport_type' => $data['sport_type'],
                'level' => $this->determineLevel($data),
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'message' => 'Markup rule saved successfully',
            ]));

            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (Exception $e) {
            $this->logger->error('Failed to create/update markup rule', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null,
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get all markup rules with filtering and pagination
     * GET /api/v1/admin/markup-rules
     * 
     * Query params: level, sport_type, tournament_id, team_id, event_id, is_active, page, per_page
     */
    public function getAllRules(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $page = max(1, (int) ($queryParams['page'] ?? 1));
            $limit = min(100, max(1, (int) ($queryParams['per_page'] ?? 50)));

            $filters = [];
            foreach (['level', 'sport_type', 'tournament_id', 'team_id', 'event_id', 'is_active'] as $key) {
                if (isset($queryParams[$key]) && $queryParams[$key] !== '') {
                    $filters[$key] = $queryParams[$key];
                }
            }

            $result = $this->ruleRepository->getAllRules($filters, $page, $limit);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result['data'],
                'pagination' => $result['pagination'],
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get markup rules', [
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get a single markup rule by ID
     * GET /api/v1/admin/markup-rules/{id}
     */
    public function getRuleById(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $rule = $this->ruleRepository->getRuleById($id);

            if (!$rule) {
                return $this->errorResponse($response, 'Markup rule not found', 404);
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $rule,
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get markup rule', [
                'rule_id' => $args['id'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Update a markup rule
     * PUT /api/v1/admin/markup-rules/{id}
     */
    public function updateRule(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            // Validate
            if (!isset($data['markup_amount']) || !is_numeric($data['markup_amount'])) {
                return $this->errorResponse($response, 'markup_amount must be numeric', 400);
            }

            $validTypes = ['fixed', 'percentage'];
            if (isset($data['markup_type']) && !in_array($data['markup_type'], $validTypes)) {
                return $this->errorResponse($response, "markup_type must be 'fixed' or 'percentage'", 400);
            }

            // Check exists
            $existing = $this->ruleRepository->getRuleById($id);
            if (!$existing) {
                return $this->errorResponse($response, 'Markup rule not found', 404);
            }

            $success = $this->ruleRepository->updateRule($id, $data, $adminUser['id']);

            if (!$success) {
                return $this->errorResponse($response, 'Failed to update markup rule', 500);
            }

            $updated = $this->ruleRepository->getRuleById($id);

            $this->logger->info('Markup rule updated', [
                'rule_id' => $id,
                'admin_user_id' => $adminUser['id'],
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $updated,
                'message' => 'Markup rule updated successfully',
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to update markup rule', [
                'rule_id' => $args['id'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Delete a markup rule
     * DELETE /api/v1/admin/markup-rules/{id}
     */
    public function deleteRule(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $id = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            $existing = $this->ruleRepository->getRuleById($id);
            if (!$existing) {
                return $this->errorResponse($response, 'Markup rule not found', 404);
            }

            $success = $this->ruleRepository->deleteRule($id);

            if (!$success) {
                return $this->errorResponse($response, 'Failed to delete markup rule', 500);
            }

            $this->logger->info('Markup rule deleted', [
                'rule_id' => $id,
                'admin_user_id' => $adminUser['id'],
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Markup rule deleted successfully',
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to delete markup rule', [
                'rule_id' => $args['id'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Get rules by sport type
     * GET /api/v1/admin/markup-rules/sport/{sportType}
     */
    public function getRulesBySport(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $sportType = $args['sportType'];
            $rules = $this->ruleRepository->getRulesBySport($sportType);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $rules,
                'count' => count($rules),
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to get rules by sport', [
                'sport_type' => $args['sportType'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    /**
     * Resolve effective markup for a ticket (for testing/preview)
     * POST /api/v1/admin/markup-rules/resolve
     * 
     * Request body:
     * {
     *   "sport_type": "soccer",
     *   "tournament_id": "abc",
     *   "team_id": "def",
     *   "event_id": "ghi",
     *   "ticket_id": "jkl"
     * }
     */
    public function resolveMarkup(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();

            if (empty($data['sport_type']) || empty($data['event_id']) || empty($data['ticket_id'])) {
                return $this->errorResponse($response, 'sport_type, event_id, and ticket_id are required', 400);
            }

            $resolved = $this->ruleRepository->resolveMarkup(
                $data['sport_type'],
                $data['tournament_id'] ?? null,
                $data['team_id'] ?? null,
                $data['event_id'],
                $data['ticket_id']
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $resolved,
                'message' => $resolved
                    ? "Markup resolved at '{$resolved['level']}' level (source: {$resolved['source']})"
                    : 'No markup rule applies to this ticket',
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (Exception $e) {
            $this->logger->error('Failed to resolve markup', [
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse($response, $e->getMessage(), 500);
        }
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private function determineLevel(array $data): string
    {
        if (!empty($data['ticket_id'])) return 'ticket';
        if (!empty($data['event_id'])) return 'event';
        if (!empty($data['team_id'])) return 'team';
        if (!empty($data['tournament_id'])) return 'tournament';
        return 'sport';
    }

    private function errorResponse(Response $response, string $message, int $status = 400): ResponseInterface
    {
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => $message,
        ]));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
