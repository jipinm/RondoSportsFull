<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use PDO;
use Exception;

/**
 * Repository for hierarchical markup pricing rules.
 * 
 * Supports markup at 5 levels (most-specific wins):
 *   ticket > event > team > tournament > sport
 * 
 * The existing ticket_markups table is treated as the "ticket" level
 * for backward compatibility. This repository manages the NEW markup_rules table
 * which handles sport/tournament/team/event levels.
 */
class MarkupRuleRepository
{
    private DatabaseService $db;

    public function __construct(DatabaseService $db)
    {
        $this->db = $db;
    }

    // ========================================================================
    // CRUD Operations
    // ========================================================================

    /**
     * Create or update a markup rule at a specific hierarchy level
     */
    public function upsertRule(array $data, int $adminUserId): array
    {
        $level = $this->determineLevel($data);

        $conn = $this->db->getConnection();

        $sql = "
            INSERT INTO markup_rules (
                sport_type, tournament_id, team_id, event_id, ticket_id,
                markup_type, markup_amount,
                sport_name, tournament_name, team_name, event_name, ticket_name,
                level, is_active,
                created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                markup_type = VALUES(markup_type),
                markup_amount = VALUES(markup_amount),
                sport_name = VALUES(sport_name),
                tournament_name = VALUES(tournament_name),
                team_name = VALUES(team_name),
                event_name = VALUES(event_name),
                ticket_name = VALUES(ticket_name),
                level = VALUES(level),
                is_active = VALUES(is_active),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $data['sport_type'] ?? null,
            $data['tournament_id'] ?? null,
            $data['team_id'] ?? null,
            $data['event_id'] ?? null,
            $data['ticket_id'] ?? null,
            $data['markup_type'] ?? 'fixed',
            $data['markup_amount'] ?? 0,
            $data['sport_name'] ?? null,
            $data['tournament_name'] ?? null,
            $data['team_name'] ?? null,
            $data['event_name'] ?? null,
            $data['ticket_name'] ?? null,
            $level,
            $data['is_active'] ?? 1,
            $adminUserId,
            $adminUserId,
        ]);

        // Return the created/updated rule
        return $this->findRuleByScope($data) ?? $data;
    }

    /**
     * Get a markup rule by ID
     */
    public function getRuleById(int $id): ?array
    {
        $sql = "
            SELECT mr.*, 
                   cu.name as created_by_name, 
                   uu.name as updated_by_name
            FROM markup_rules mr
            LEFT JOIN admin_users cu ON mr.created_by = cu.id
            LEFT JOIN admin_users uu ON mr.updated_by = uu.id
            WHERE mr.id = ?
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Update a markup rule by ID
     */
    public function updateRule(int $id, array $data, int $adminUserId): bool
    {
        $sql = "
            UPDATE markup_rules SET
                markup_type = ?,
                markup_amount = ?,
                is_active = ?,
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        return $stmt->execute([
            $data['markup_type'] ?? 'fixed',
            $data['markup_amount'] ?? 0,
            $data['is_active'] ?? 1,
            $adminUserId,
            $id,
        ]);
    }

    /**
     * Delete a markup rule by ID
     */
    public function deleteRule(int $id): bool
    {
        $sql = "DELETE FROM markup_rules WHERE id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        return $stmt->execute([$id]);
    }

    /**
     * Get all markup rules with optional filters and pagination
     */
    public function getAllRules(array $filters = [], int $page = 1, int $limit = 50): array
    {
        $conditions = [];
        $params = [];

        if (!empty($filters['level'])) {
            $conditions[] = "mr.level = ?";
            $params[] = $filters['level'];
        }
        if (!empty($filters['sport_type'])) {
            $conditions[] = "mr.sport_type = ?";
            $params[] = $filters['sport_type'];
        }
        if (!empty($filters['tournament_id'])) {
            $conditions[] = "mr.tournament_id = ?";
            $params[] = $filters['tournament_id'];
        }
        if (!empty($filters['team_id'])) {
            $conditions[] = "mr.team_id = ?";
            $params[] = $filters['team_id'];
        }
        if (!empty($filters['event_id'])) {
            $conditions[] = "mr.event_id = ?";
            $params[] = $filters['event_id'];
        }
        if (isset($filters['is_active'])) {
            $conditions[] = "mr.is_active = ?";
            $params[] = (int) $filters['is_active'];
        }

        $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

        // Count
        $countSql = "SELECT COUNT(*) as total FROM markup_rules mr {$whereClause}";
        $countStmt = $this->db->getConnection()->prepare($countSql);
        $countStmt->execute($params);
        $totalRecords = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $limit;
        $totalPages = (int) ceil($totalRecords / $limit);

        // Data
        $sql = "
            SELECT mr.*, 
                   cu.name as created_by_name, 
                   uu.name as updated_by_name
            FROM markup_rules mr
            LEFT JOIN admin_users cu ON mr.created_by = cu.id
            LEFT JOIN admin_users uu ON mr.updated_by = uu.id
            {$whereClause}
            ORDER BY 
                FIELD(mr.level, 'sport', 'tournament', 'team', 'event', 'ticket'),
                mr.sport_name, mr.tournament_name, mr.team_name, mr.event_name, mr.ticket_name,
                mr.updated_at DESC
            LIMIT ? OFFSET ?
        ";

        $allParams = array_merge($params, [$limit, $offset]);
        $stmt = $this->db->getConnection()->prepare($sql);

        // Bind params with proper types
        foreach ($allParams as $i => $val) {
            $paramIndex = $i + 1;
            if ($paramIndex > count($params)) {
                $stmt->bindValue($paramIndex, $val, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($paramIndex, $val);
            }
        }
        $stmt->execute();
        $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'data' => $rules,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $totalRecords,
                'total_pages' => $totalPages,
                'has_more' => $page < $totalPages,
            ],
        ];
    }

    /**
     * Get all rules for a given sport type (at all levels under it)
     */
    public function getRulesBySport(string $sportType): array
    {
        $sql = "
            SELECT mr.*, 
                   cu.name as created_by_name, 
                   uu.name as updated_by_name
            FROM markup_rules mr
            LEFT JOIN admin_users cu ON mr.created_by = cu.id
            LEFT JOIN admin_users uu ON mr.updated_by = uu.id
            WHERE mr.sport_type = ? AND mr.is_active = 1
            ORDER BY FIELD(mr.level, 'sport', 'tournament', 'team', 'event', 'ticket')
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$sportType]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ========================================================================
    // Markup Resolution (Most-Specific-Wins)
    // ========================================================================

    /**
     * Resolve the effective markup for a ticket.
     * 
     * Priority order (highest wins):
     *   1. ticket_id match (ticket level)
     *   2. event_id match (event level)  
     *   3. team_id match (team level, for team sports)
     *   4. tournament_id match (tournament level)
     *   5. sport_type match (sport level)
     * 
     * Also checks the legacy ticket_markups table as the ticket-level source.
     * 
     * Returns the resolved rule or null if no markup applies.
     * 
     * @param string $sportType     The sport type slug
     * @param string|null $tournamentId  The tournament ID
     * @param string|null $teamId        The team ID (null for non-team sports)
     * @param string $eventId       The event ID
     * @param string $ticketId      The ticket ID
     * @return array|null The resolved markup rule
     */
    public function resolveMarkup(
        string $sportType,
        ?string $tournamentId,
        ?string $teamId,
        string $eventId,
        string $ticketId
    ): ?array {
        // First check the legacy ticket_markups table (highest priority for ticket level)
        $legacyMarkup = $this->getLegacyTicketMarkup($eventId, $ticketId);
        if ($legacyMarkup) {
            return [
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
                'rule_id' => $legacyMarkup['id'],
            ];
        }

        // Build the resolution query - check from most specific to least specific  
        // in the markup_rules table
        $sql = "
            SELECT *
            FROM markup_rules
            WHERE is_active = 1
              AND (
                -- Level 1: Ticket match (most specific in markup_rules)
                (ticket_id = ? AND event_id = ?)
                -- Level 2: Event match
                OR (event_id = ? AND ticket_id IS NULL AND team_id IS NULL AND tournament_id IS NULL)
                -- Level 2b: Event match with ancestors set
                OR (event_id = ?)
                -- Level 3: Team match (for team sports)
                OR (team_id = ? AND event_id IS NULL AND ticket_id IS NULL)
                -- Level 4: Tournament match
                OR (tournament_id = ? AND team_id IS NULL AND event_id IS NULL AND ticket_id IS NULL)
                -- Level 5: Sport match (least specific)
                OR (sport_type = ? AND tournament_id IS NULL AND team_id IS NULL AND event_id IS NULL AND ticket_id IS NULL)
              )
            ORDER BY 
                FIELD(level, 'ticket', 'event', 'team', 'tournament', 'sport')
            LIMIT 1
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([
            $ticketId, $eventId,        // ticket level
            $eventId,                    // event level (strict)
            $eventId,                    // event level (with ancestors)
            $teamId ?? '',               // team level
            $tournamentId ?? '',         // tournament level
            $sportType,                  // sport level
        ]);

        $rule = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$rule) {
            return null;
        }

        return [
            'level' => $rule['level'],
            'source' => 'markup_rules',
            'markup_type' => $rule['markup_type'],
            'markup_amount' => (float) $rule['markup_amount'],
            'markup_percentage' => $rule['markup_type'] === 'percentage' 
                ? (float) $rule['markup_amount'] 
                : null,
            'rule_id' => (int) $rule['id'],
            'sport_name' => $rule['sport_name'],
            'tournament_name' => $rule['tournament_name'],
            'team_name' => $rule['team_name'],
            'event_name' => $rule['event_name'],
            'ticket_name' => $rule['ticket_name'],
        ];
    }

    /**
     * Resolve effective markup for all tickets in an event.
     * Returns an array with ticket_id as key and resolved markup as value.
     * 
     * @param string $sportType
     * @param string|null $tournamentId
     * @param string|null $teamId
     * @param string $eventId
     * @param array $ticketIds Array of ticket IDs
     * @return array Map of ticket_id => resolved markup
     */
    public function resolveMarkupsForEvent(
        string $sportType,
        ?string $tournamentId,
        ?string $teamId,
        string $eventId,
        array $ticketIds
    ): array {
        $results = [];

        // 1. Get all legacy ticket markups for this event
        $legacyMarkups = $this->getLegacyMarkupsByEvent($eventId);
        $legacyByTicket = [];
        foreach ($legacyMarkups as $m) {
            $legacyByTicket[$m['ticket_id']] = $m;
        }

        // 2. Get all markup_rules that could apply (from ticket-level down to sport-level)
        $placeholders = implode(',', array_fill(0, count($ticketIds), '?'));
        $sql = "
            SELECT *
            FROM markup_rules
            WHERE is_active = 1
              AND (
                (ticket_id IN ({$placeholders}) AND event_id = ?)
                OR (event_id = ? AND ticket_id IS NULL)
                OR (team_id = ? AND event_id IS NULL AND ticket_id IS NULL)
                OR (tournament_id = ? AND team_id IS NULL AND event_id IS NULL AND ticket_id IS NULL)
                OR (sport_type = ? AND tournament_id IS NULL AND team_id IS NULL AND event_id IS NULL AND ticket_id IS NULL)
              )
            ORDER BY FIELD(level, 'ticket', 'event', 'team', 'tournament', 'sport')
        ";

        $params = array_merge($ticketIds, [
            $eventId,
            $eventId,
            $teamId ?? '',
            $tournamentId ?? '',
            $sportType,
        ]);

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute($params);
        $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Index rules by level and specificity
        $rulesByTicket = [];  // ticket-level rules indexed by ticket_id
        $eventRule = null;
        $teamRule = null;
        $tournamentRule = null;
        $sportRule = null;

        foreach ($rules as $rule) {
            switch ($rule['level']) {
                case 'ticket':
                    if ($rule['ticket_id']) {
                        $rulesByTicket[$rule['ticket_id']] = $rule;
                    }
                    break;
                case 'event':
                    if (!$eventRule) $eventRule = $rule;
                    break;
                case 'team':
                    if (!$teamRule) $teamRule = $rule;
                    break;
                case 'tournament':
                    if (!$tournamentRule) $tournamentRule = $rule;
                    break;
                case 'sport':
                    if (!$sportRule) $sportRule = $rule;
                    break;
            }
        }

        // 3. For each ticket, resolve the most specific markup
        foreach ($ticketIds as $ticketId) {
            // Priority 1: Legacy ticket_markups table
            if (isset($legacyByTicket[$ticketId])) {
                $legacy = $legacyByTicket[$ticketId];
                $results[$ticketId] = [
                    'level' => 'ticket',
                    'source' => 'legacy',
                    'markup_type' => $legacy['markup_type'] ?? 'fixed',
                    'markup_amount' => $legacy['markup_type'] === 'percentage'
                        ? (float) $legacy['markup_percentage']
                        : (float) $legacy['markup_price_usd'],
                    'markup_price_usd' => (float) $legacy['markup_price_usd'],
                    'markup_percentage' => $legacy['markup_percentage'] !== null
                        ? (float) $legacy['markup_percentage']
                        : null,
                    'base_price_usd' => (float) $legacy['base_price_usd'],
                    'final_price_usd' => (float) $legacy['final_price_usd'],
                ];
                continue;
            }

            // Priority 2: markup_rules ticket level
            if (isset($rulesByTicket[$ticketId])) {
                $results[$ticketId] = $this->formatRuleResult($rulesByTicket[$ticketId]);
                continue;
            }

            // Priority 3: Event level
            if ($eventRule) {
                $results[$ticketId] = $this->formatRuleResult($eventRule);
                continue;
            }

            // Priority 4: Team level
            if ($teamRule) {
                $results[$ticketId] = $this->formatRuleResult($teamRule);
                continue;
            }

            // Priority 5: Tournament level
            if ($tournamentRule) {
                $results[$ticketId] = $this->formatRuleResult($tournamentRule);
                continue;
            }

            // Priority 6: Sport level
            if ($sportRule) {
                $results[$ticketId] = $this->formatRuleResult($sportRule);
                continue;
            }

            // No markup found
            $results[$ticketId] = null;
        }

        return $results;
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    /**
     * Determine the hierarchy level from the data
     */
    private function determineLevel(array $data): string
    {
        if (!empty($data['ticket_id'])) return 'ticket';
        if (!empty($data['event_id'])) return 'event';
        if (!empty($data['team_id'])) return 'team';
        if (!empty($data['tournament_id'])) return 'tournament';
        if (!empty($data['sport_type'])) return 'sport';

        throw new Exception('At least one hierarchy level identifier must be provided');
    }

    /**
     * Find a rule by its exact scope
     */
    private function findRuleByScope(array $data): ?array
    {
        $sql = "
            SELECT mr.*, 
                   cu.name as created_by_name, 
                   uu.name as updated_by_name
            FROM markup_rules mr
            LEFT JOIN admin_users cu ON mr.created_by = cu.id
            LEFT JOIN admin_users uu ON mr.updated_by = uu.id
            WHERE (mr.sport_type <=> ?) 
              AND (mr.tournament_id <=> ?) 
              AND (mr.team_id <=> ?) 
              AND (mr.event_id <=> ?) 
              AND (mr.ticket_id <=> ?)
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([
            $data['sport_type'] ?? null,
            $data['tournament_id'] ?? null,
            $data['team_id'] ?? null,
            $data['event_id'] ?? null,
            $data['ticket_id'] ?? null,
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Get legacy ticket markup from the ticket_markups table
     */
    private function getLegacyTicketMarkup(string $eventId, string $ticketId): ?array
    {
        $sql = "SELECT * FROM ticket_markups WHERE event_id = ? AND ticket_id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId, $ticketId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Get all legacy markups for an event
     */
    private function getLegacyMarkupsByEvent(string $eventId): array
    {
        $sql = "SELECT * FROM ticket_markups WHERE event_id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Format a markup_rules row into a standard result format
     */
    private function formatRuleResult(array $rule): array
    {
        return [
            'level' => $rule['level'],
            'source' => 'markup_rules',
            'markup_type' => $rule['markup_type'],
            'markup_amount' => (float) $rule['markup_amount'],
            'markup_percentage' => $rule['markup_type'] === 'percentage'
                ? (float) $rule['markup_amount']
                : null,
            'rule_id' => (int) $rule['id'],
            'sport_name' => $rule['sport_name'] ?? null,
            'tournament_name' => $rule['tournament_name'] ?? null,
            'team_name' => $rule['team_name'] ?? null,
            'event_name' => $rule['event_name'] ?? null,
            'ticket_name' => $rule['ticket_name'] ?? null,
        ];
    }
}
