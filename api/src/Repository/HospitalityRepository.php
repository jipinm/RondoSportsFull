<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use PDO;
use Exception;

/**
 * Repository for hospitality services management.
 * 
 * Supports hierarchical hospitality assignment at 5 levels (most-specific wins):
 *   ticket > event > team > tournament > sport
 * 
 * The existing ticket_hospitalities table is treated as legacy "ticket" level
 * assignments for backward compatibility. The new hospitality_assignments table
 * handles all 5 levels.
 * 
 * Unlike markup rules (where one value overrides another), hospitality is
 * ADDITIVE: we collect all applicable hospitality services from all matching
 * levels and return the union. However, if a hospitality service is assigned
 * at a more specific level, it takes precedence over the same service at a
 * broader level (deduplication by hospitality_id).
 */
class HospitalityRepository
{
    private DatabaseService $db;

    public function __construct(DatabaseService $db)
    {
        $this->db = $db;
    }

    // ========================================================================
    // Hospitality Service CRUD Operations (Price removed)
    // ========================================================================

    /**
     * Get all hospitality services
     */
    public function getAllHospitalities(bool $activeOnly = false): array
    {
        $sql = "
            SELECT 
                h.*,
                cu.name as created_by_name,
                uu.name as updated_by_name
            FROM hospitalities h
            LEFT JOIN admin_users cu ON h.created_by = cu.id
            LEFT JOIN admin_users uu ON h.updated_by = uu.id
        ";
        
        if ($activeOnly) {
            $sql .= " WHERE h.is_active = 1";
        }
        
        $sql .= " ORDER BY h.sort_order ASC, h.name ASC";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get a hospitality service by ID
     */
    public function getHospitalityById(int $id): ?array
    {
        $sql = "
            SELECT 
                h.*,
                cu.name as created_by_name,
                uu.name as updated_by_name
            FROM hospitalities h
            LEFT JOIN admin_users cu ON h.created_by = cu.id
            LEFT JOIN admin_users uu ON h.updated_by = uu.id
            WHERE h.id = ?
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$id]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Create a new hospitality service (no price field)
     */
    public function createHospitality(array $data, int $adminUserId): int
    {
        $sql = "
            INSERT INTO hospitalities (
                name, 
                description, 
                is_active, 
                sort_order,
                created_by,
                updated_by
            ) VALUES (?, ?, ?, ?, ?, ?)
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['description'] ?? null,
            $data['is_active'] ?? 1,
            $data['sort_order'] ?? 0,
            $adminUserId,
            $adminUserId
        ]);

        return (int) $this->db->getConnection()->lastInsertId();
    }

    /**
     * Update an existing hospitality service (no price field)
     */
    public function updateHospitality(int $id, array $data, int $adminUserId): bool
    {
        $fields = [];
        $values = [];

        if (isset($data['name'])) {
            $fields[] = 'name = ?';
            $values[] = $data['name'];
        }
        if (array_key_exists('description', $data)) {
            $fields[] = 'description = ?';
            $values[] = $data['description'];
        }
        if (isset($data['is_active'])) {
            $fields[] = 'is_active = ?';
            $values[] = $data['is_active'] ? 1 : 0;
        }
        if (isset($data['sort_order'])) {
            $fields[] = 'sort_order = ?';
            $values[] = $data['sort_order'];
        }

        if (empty($fields)) {
            return false;
        }

        $fields[] = 'updated_by = ?';
        $values[] = $adminUserId;
        $values[] = $id;

        $sql = "UPDATE hospitalities SET " . implode(', ', $fields) . " WHERE id = ?";

        $stmt = $this->db->getConnection()->prepare($sql);
        return $stmt->execute($values);
    }

    /**
     * Delete a hospitality service
     */
    public function deleteHospitality(int $id): bool
    {
        $sql = "DELETE FROM hospitalities WHERE id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        return $stmt->execute([$id]);
    }

    /**
     * Get all active hospitality services (for public API)
     */
    public function getAllActiveHospitalities(): array
    {
        return $this->getAllHospitalities(true);
    }

    // ========================================================================
    // Hierarchical Hospitality Assignment Operations
    // ========================================================================

    /**
     * Determine the hierarchy level from assignment data
     */
    private function determineLevel(array $data): string
    {
        if (!empty($data['ticket_id'])) return 'ticket';
        if (!empty($data['event_id'])) return 'event';
        if (!empty($data['team_id'])) return 'team';
        if (!empty($data['tournament_id'])) return 'tournament';
        if (!empty($data['sport_type'])) return 'sport';
        throw new Exception('At least sport_type must be specified for an assignment');
    }

    /**
     * Create or update a hospitality assignment at a specific hierarchy level
     */
    public function upsertAssignment(array $data, int $adminUserId): array
    {
        $level = $this->determineLevel($data);
        $hospitalityId = (int) $data['hospitality_id'];

        $conn = $this->db->getConnection();

        $sql = "
            INSERT INTO hospitality_assignments (
                hospitality_id,
                sport_type, tournament_id, team_id, event_id, ticket_id,
                sport_name, tournament_name, team_name, event_name, ticket_name,
                level, is_active,
                created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
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
            $hospitalityId,
            $data['sport_type'] ?? null,
            $data['tournament_id'] ?? null,
            $data['team_id'] ?? null,
            $data['event_id'] ?? null,
            $data['ticket_id'] ?? null,
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

        return $this->findAssignmentByScope($data) ?? $data;
    }

    /**
     * Batch upsert: assign multiple hospitality services at a given scope
     */
    public function batchUpsertAssignments(array $scopeData, array $hospitalityIds, int $adminUserId): array
    {
        $conn = $this->db->getConnection();
        $conn->beginTransaction();

        try {
            $results = [];
            foreach ($hospitalityIds as $hospitalityId) {
                $data = array_merge($scopeData, ['hospitality_id' => $hospitalityId]);
                $results[] = $this->upsertAssignment($data, $adminUserId);
            }

            $conn->commit();
            return [
                'success' => true,
                'count' => count($results),
                'assignments' => $results,
                'message' => 'Successfully assigned ' . count($results) . ' hospitality services'
            ];
        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Replace all assignments at a specific scope (delete existing at scope + insert new)
     */
    public function replaceAssignmentsAtScope(array $scopeData, array $hospitalityIds, int $adminUserId): array
    {
        $conn = $this->db->getConnection();
        $conn->beginTransaction();

        try {
            // Remove all existing assignments at this exact scope
            $deletedCount = $this->removeAssignmentsAtScope($scopeData);

            // Insert new assignments
            $insertedCount = 0;
            foreach ($hospitalityIds as $hospitalityId) {
                $data = array_merge($scopeData, ['hospitality_id' => $hospitalityId]);
                $this->upsertAssignment($data, $adminUserId);
                $insertedCount++;
            }

            $conn->commit();

            return [
                'success' => true,
                'deleted_count' => $deletedCount,
                'inserted_count' => $insertedCount,
                'message' => "Replaced assignments: removed {$deletedCount}, added {$insertedCount}"
            ];
        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw new Exception("Failed to replace assignments: " . $e->getMessage());
        }
    }

    /**
     * Remove hospitality assignments at a specific scope
     * If hospitalityIds provided, only remove those; otherwise remove all at scope
     */
    public function removeAssignmentsAtScope(array $scopeData, array $hospitalityIds = []): int
    {
        $conditions = [];
        $params = [];

        foreach (['sport_type', 'tournament_id', 'team_id', 'event_id', 'ticket_id'] as $field) {
            if (!empty($scopeData[$field])) {
                $conditions[] = "{$field} = ?";
                $params[] = $scopeData[$field];
            } else {
                $conditions[] = "{$field} IS NULL";
            }
        }

        if (!empty($hospitalityIds)) {
            $placeholders = implode(',', array_fill(0, count($hospitalityIds), '?'));
            $conditions[] = "hospitality_id IN ($placeholders)";
            $params = array_merge($params, array_map('intval', $hospitalityIds));
        }

        $sql = "DELETE FROM hospitality_assignments WHERE " . implode(' AND ', $conditions);
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * Find assignment by scope (exact match)
     */
    private function findAssignmentByScope(array $data): ?array
    {
        $conditions = [];
        $params = [];

        $conditions[] = 'ha.hospitality_id = ?';
        $params[] = $data['hospitality_id'];

        foreach (['sport_type', 'tournament_id', 'team_id', 'event_id', 'ticket_id'] as $field) {
            if (!empty($data[$field])) {
                $conditions[] = "ha.{$field} = ?";
                $params[] = $data[$field];
            } else {
                $conditions[] = "ha.{$field} IS NULL";
            }
        }

        $sql = "
            SELECT ha.*, h.name as hospitality_name, h.description as hospitality_description,
                   h.is_active as hospitality_is_active,
                   cu.name as created_by_name,
                   uu.name as updated_by_name
            FROM hospitality_assignments ha
            INNER JOIN hospitalities h ON ha.hospitality_id = h.id
            LEFT JOIN admin_users cu ON ha.created_by = cu.id
            LEFT JOIN admin_users uu ON ha.updated_by = uu.id
            WHERE " . implode(' AND ', $conditions) . "
            LIMIT 1
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Get an assignment by ID
     */
    public function getAssignmentById(int $id): ?array
    {
        $sql = "
            SELECT ha.*, h.name as hospitality_name, h.description as hospitality_description,
                   h.is_active as hospitality_is_active,
                   cu.name as created_by_name,
                   uu.name as updated_by_name
            FROM hospitality_assignments ha
            INNER JOIN hospitalities h ON ha.hospitality_id = h.id
            LEFT JOIN admin_users cu ON ha.created_by = cu.id
            LEFT JOIN admin_users uu ON ha.updated_by = uu.id
            WHERE ha.id = ?
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Delete an assignment by ID
     */
    public function deleteAssignment(int $id): bool
    {
        $sql = "DELETE FROM hospitality_assignments WHERE id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        return $stmt->execute([$id]);
    }

    /**
     * Get all assignments with optional filters and pagination
     */
    public function getAllAssignments(array $filters = [], int $page = 1, int $limit = 50): array
    {
        $conditions = [];
        $params = [];

        if (!empty($filters['level'])) {
            $conditions[] = "ha.level = ?";
            $params[] = $filters['level'];
        }
        if (!empty($filters['sport_type'])) {
            $conditions[] = "ha.sport_type = ?";
            $params[] = $filters['sport_type'];
        }
        if (!empty($filters['tournament_id'])) {
            $conditions[] = "ha.tournament_id = ?";
            $params[] = $filters['tournament_id'];
        }
        if (!empty($filters['team_id'])) {
            $conditions[] = "ha.team_id = ?";
            $params[] = $filters['team_id'];
        }
        if (!empty($filters['event_id'])) {
            $conditions[] = "ha.event_id = ?";
            $params[] = $filters['event_id'];
        }
        if (!empty($filters['hospitality_id'])) {
            $conditions[] = "ha.hospitality_id = ?";
            $params[] = $filters['hospitality_id'];
        }
        if (isset($filters['is_active'])) {
            $conditions[] = "ha.is_active = ?";
            $params[] = (int) $filters['is_active'];
        }

        $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

        // Count
        $countSql = "SELECT COUNT(*) as total FROM hospitality_assignments ha {$whereClause}";
        $countStmt = $this->db->getConnection()->prepare($countSql);
        $countStmt->execute($params);
        $totalRecords = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $limit;
        $totalPages = (int) ceil($totalRecords / $limit);

        // Data
        $sql = "
            SELECT ha.*, 
                   h.name as hospitality_name, h.description as hospitality_description,
                   h.is_active as hospitality_is_active,
                   cu.name as created_by_name, 
                   uu.name as updated_by_name
            FROM hospitality_assignments ha
            INNER JOIN hospitalities h ON ha.hospitality_id = h.id
            LEFT JOIN admin_users cu ON ha.created_by = cu.id
            LEFT JOIN admin_users uu ON ha.updated_by = uu.id
            {$whereClause}
            ORDER BY 
                FIELD(ha.level, 'sport', 'tournament', 'team', 'event', 'ticket'),
                ha.sport_name, ha.tournament_name, ha.team_name, ha.event_name, ha.ticket_name,
                h.sort_order, h.name
            LIMIT ? OFFSET ?
        ";

        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'data' => $results,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total_records' => $totalRecords,
                'total_pages' => $totalPages,
            ],
        ];
    }

    /**
     * Get assignments at a specific scope level (exact match for admin display)
     */
    public function getAssignmentsAtScope(array $scopeData): array
    {
        $conditions = [];
        $params = [];

        foreach (['sport_type', 'tournament_id', 'team_id', 'event_id', 'ticket_id'] as $field) {
            if (!empty($scopeData[$field])) {
                $conditions[] = "ha.{$field} = ?";
                $params[] = $scopeData[$field];
            } else {
                $conditions[] = "ha.{$field} IS NULL";
            }
        }

        $sql = "
            SELECT ha.*, 
                   h.name as hospitality_name, h.description as hospitality_description,
                   h.is_active as hospitality_is_active,
                   cu.name as created_by_name,
                   uu.name as updated_by_name
            FROM hospitality_assignments ha
            INNER JOIN hospitalities h ON ha.hospitality_id = h.id
            LEFT JOIN admin_users cu ON ha.created_by = cu.id
            LEFT JOIN admin_users uu ON ha.updated_by = uu.id
            WHERE " . implode(' AND ', $conditions) . "
                AND ha.is_active = 1
            ORDER BY h.sort_order ASC, h.name ASC
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ========================================================================
    // Hierarchical Resolution Logic
    // ========================================================================

    /**
     * Resolve all effective hospitality services for a specific ticket.
     * 
     * Collects hospitality assignments from ALL matching hierarchy levels
     * and returns the union (deduplicated by hospitality_id, most-specific wins).
     */
    public function resolveHospitalitiesForTicket(
        string $sportType,
        ?string $tournamentId,
        ?string $teamId,
        string $eventId,
        string $ticketId
    ): array {
        $conditions = [];
        $params = [];

        // Sport level
        $conditions[] = "(ha.sport_type = ? AND ha.tournament_id IS NULL AND ha.team_id IS NULL AND ha.event_id IS NULL AND ha.ticket_id IS NULL)";
        $params[] = $sportType;

        // Tournament level
        if ($tournamentId) {
            $conditions[] = "(ha.sport_type = ? AND ha.tournament_id = ? AND ha.team_id IS NULL AND ha.event_id IS NULL AND ha.ticket_id IS NULL)";
            $params[] = $sportType;
            $params[] = $tournamentId;
        }

        // Team level
        if ($teamId) {
            $conditions[] = "(ha.sport_type = ? AND ha.tournament_id = ? AND ha.team_id = ? AND ha.event_id IS NULL AND ha.ticket_id IS NULL)";
            $params[] = $sportType;
            $params[] = $tournamentId;
            $params[] = $teamId;
        }

        // Event level
        $conditions[] = "(ha.event_id = ? AND ha.ticket_id IS NULL)";
        $params[] = $eventId;

        // Ticket level
        $conditions[] = "(ha.event_id = ? AND ha.ticket_id = ?)";
        $params[] = $eventId;
        $params[] = $ticketId;

        $whereClause = "(" . implode(" OR ", $conditions) . ")";

        $sql = "
            SELECT ha.*, 
                   h.name as hospitality_name, 
                   h.description as hospitality_description,
                   h.is_active as hospitality_is_active,
                   h.sort_order as hospitality_sort_order
            FROM hospitality_assignments ha
            INNER JOIN hospitalities h ON ha.hospitality_id = h.id
            WHERE {$whereClause}
                AND ha.is_active = 1
                AND h.is_active = 1
            ORDER BY 
                FIELD(ha.level, 'ticket', 'event', 'team', 'tournament', 'sport'),
                h.sort_order ASC, h.name ASC
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute($params);
        $allMatches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Deduplicate: same hospitality_id at multiple levels → keep most-specific
        $resolved = [];
        foreach ($allMatches as $match) {
            $hId = (int) $match['hospitality_id'];
            if (!isset($resolved[$hId])) {
                $match['source'] = 'hospitality_assignments';
                $resolved[$hId] = $match;
            }
        }

        // Also check legacy ticket_hospitalities table
        $legacyResults = $this->getLegacyTicketHospitalities($eventId, $ticketId);
        foreach ($legacyResults as $legacy) {
            $hId = (int) $legacy['hospitality_id'];
            if (!isset($resolved[$hId])) {
                $legacy['level'] = 'ticket';
                $legacy['source'] = 'legacy';
                $resolved[$hId] = $legacy;
            }
        }

        return array_values($resolved);
    }

    /**
     * Resolve all effective hospitality services for ALL tickets in an event.
     * Returns a map of ticket_id → hospitality services.
     */
    public function resolveHospitalitiesForEvent(
        string $eventId,
        string $sportType,
        ?string $tournamentId,
        ?string $teamId,
        array $ticketIds
    ): array {
        if (empty($ticketIds)) {
            return [];
        }

        $conditions = [];
        $params = [];

        // Sport level
        $conditions[] = "(ha.sport_type = ? AND ha.tournament_id IS NULL AND ha.team_id IS NULL AND ha.event_id IS NULL AND ha.ticket_id IS NULL)";
        $params[] = $sportType;

        // Tournament level
        if ($tournamentId) {
            $conditions[] = "(ha.sport_type = ? AND ha.tournament_id = ? AND ha.team_id IS NULL AND ha.event_id IS NULL AND ha.ticket_id IS NULL)";
            $params[] = $sportType;
            $params[] = $tournamentId;
        }

        // Team level
        if ($teamId) {
            $conditions[] = "(ha.sport_type = ? AND ha.tournament_id = ? AND ha.team_id = ? AND ha.event_id IS NULL AND ha.ticket_id IS NULL)";
            $params[] = $sportType;
            $params[] = $tournamentId;
            $params[] = $teamId;
        }

        // Event level
        $conditions[] = "(ha.event_id = ? AND ha.ticket_id IS NULL)";
        $params[] = $eventId;

        // Ticket level (all tickets)
        $ticketPlaceholders = implode(',', array_fill(0, count($ticketIds), '?'));
        $conditions[] = "(ha.event_id = ? AND ha.ticket_id IN ({$ticketPlaceholders}))";
        $params[] = $eventId;
        $params = array_merge($params, $ticketIds);

        $whereClause = "(" . implode(" OR ", $conditions) . ")";

        $sql = "
            SELECT ha.*, 
                   h.name as hospitality_name, 
                   h.description as hospitality_description,
                   h.is_active as hospitality_is_active,
                   h.sort_order as hospitality_sort_order
            FROM hospitality_assignments ha
            INNER JOIN hospitalities h ON ha.hospitality_id = h.id
            WHERE {$whereClause}
                AND ha.is_active = 1
                AND h.is_active = 1
            ORDER BY 
                FIELD(ha.level, 'ticket', 'event', 'team', 'tournament', 'sport'),
                h.sort_order ASC, h.name ASC
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute($params);
        $allMatches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Categorize by level
        $sportLevel = [];
        $tournamentLevel = [];
        $teamLevel = [];
        $eventLevel = [];
        $ticketLevel = [];

        foreach ($allMatches as $match) {
            switch ($match['level']) {
                case 'sport': $sportLevel[] = $match; break;
                case 'tournament': $tournamentLevel[] = $match; break;
                case 'team': $teamLevel[] = $match; break;
                case 'event': $eventLevel[] = $match; break;
                case 'ticket':
                    $tId = $match['ticket_id'];
                    $ticketLevel[$tId] = $ticketLevel[$tId] ?? [];
                    $ticketLevel[$tId][] = $match;
                    break;
            }
        }

        // Legacy assignments
        $legacyAssignments = $this->getLegacyEventHospitalities($eventId);
        $legacyByTicket = [];
        foreach ($legacyAssignments as $legacy) {
            $tId = $legacy['ticket_id'];
            $legacy['level'] = 'ticket';
            $legacy['source'] = 'legacy';
            $legacyByTicket[$tId] = $legacyByTicket[$tId] ?? [];
            $legacyByTicket[$tId][] = $legacy;
        }

        // Build resolved map per ticket
        $result = [];
        foreach ($ticketIds as $tId) {
            $resolved = [];

            // Most-specific first for dedup
            $allForTicket = array_merge(
                $ticketLevel[$tId] ?? [],
                $eventLevel,
                $teamLevel,
                $tournamentLevel,
                $sportLevel
            );

            foreach ($allForTicket as $match) {
                $hId = (int) $match['hospitality_id'];
                if (!isset($resolved[$hId])) {
                    $match['source'] = $match['source'] ?? 'hospitality_assignments';
                    $resolved[$hId] = $match;
                }
            }

            // Legacy
            foreach (($legacyByTicket[$tId] ?? []) as $legacy) {
                $hId = (int) $legacy['hospitality_id'];
                if (!isset($resolved[$hId])) {
                    $resolved[$hId] = $legacy;
                }
            }

            $result[$tId] = array_values($resolved);
        }

        return $result;
    }

    // ========================================================================
    // Legacy ticket_hospitalities compatibility
    // ========================================================================

    private function getLegacyTicketHospitalities(string $eventId, string $ticketId): array
    {
        $sql = "
            SELECT 
                th.hospitality_id, th.event_id, th.ticket_id,
                h.name as hospitality_name,
                h.description as hospitality_description,
                h.is_active as hospitality_is_active,
                h.sort_order as hospitality_sort_order
            FROM ticket_hospitalities th
            INNER JOIN hospitalities h ON th.hospitality_id = h.id
            WHERE th.event_id = ? AND th.ticket_id = ? AND h.is_active = 1
            ORDER BY h.sort_order ASC, h.name ASC
        ";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId, $ticketId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getLegacyEventHospitalities(string $eventId): array
    {
        $sql = "
            SELECT 
                th.hospitality_id, th.event_id, th.ticket_id,
                h.name as hospitality_name,
                h.description as hospitality_description,
                h.is_active as hospitality_is_active,
                h.sort_order as hospitality_sort_order
            FROM ticket_hospitalities th
            INNER JOIN hospitalities h ON th.hospitality_id = h.id
            WHERE th.event_id = ? AND h.is_active = 1
            ORDER BY th.ticket_id, h.sort_order ASC, h.name ASC
        ";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ========================================================================
    // Backward-compatible methods (used by existing controllers/public API)
    // ========================================================================

    public function getEventHospitalities(string $eventId): array
    {
        return $this->getHospitalitiesByEvent($eventId);
    }

    public function getTicketHospitalities(string $eventId, string $ticketId): array
    {
        return $this->getHospitalitiesByTicket($eventId, $ticketId);
    }

    public function getHospitalitiesByTicket(string $eventId, string $ticketId): array
    {
        $sql = "
            SELECT th.*, h.name, h.description, h.is_active,
                   cu.name as created_by_name
            FROM ticket_hospitalities th
            INNER JOIN hospitalities h ON th.hospitality_id = h.id
            LEFT JOIN admin_users cu ON th.created_by = cu.id
            WHERE th.event_id = ? AND th.ticket_id = ?
            ORDER BY h.sort_order ASC, h.name ASC
        ";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId, $ticketId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getHospitalitiesByEvent(string $eventId): array
    {
        $sql = "
            SELECT th.*, h.name, h.description, h.is_active,
                   cu.name as created_by_name
            FROM ticket_hospitalities th
            INNER JOIN hospitalities h ON th.hospitality_id = h.id
            LEFT JOIN admin_users cu ON th.created_by = cu.id
            WHERE th.event_id = ?
            ORDER BY th.ticket_id, h.sort_order ASC, h.name ASC
        ";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function assignHospitalitiesToTicket(
        string $eventId, string $ticketId, array $hospitalityIds, int $adminUserId
    ): array {
        try {
            $conn = $this->db->getConnection();
            $conn->beginTransaction();

            $deleteSql = "DELETE FROM ticket_hospitalities WHERE event_id = ? AND ticket_id = ?";
            $deleteStmt = $conn->prepare($deleteSql);
            $deleteStmt->execute([$eventId, $ticketId]);
            $deletedCount = $deleteStmt->rowCount();

            $insertedCount = 0;
            if (!empty($hospitalityIds)) {
                $insertSql = "INSERT INTO ticket_hospitalities (event_id, ticket_id, hospitality_id, created_by) VALUES (?, ?, ?, ?)";
                $insertStmt = $conn->prepare($insertSql);
                foreach ($hospitalityIds as $hospitalityId) {
                    $insertStmt->execute([$eventId, $ticketId, $hospitalityId, $adminUserId]);
                    $insertedCount++;
                }
            }

            $conn->commit();
            return [
                'success' => true,
                'deleted_count' => $deletedCount,
                'inserted_count' => $insertedCount,
                'message' => "Successfully assigned {$insertedCount} hospitalities to ticket"
            ];
        } catch (Exception $e) {
            if ($conn->inTransaction()) { $conn->rollBack(); }
            throw new Exception("Failed to assign hospitalities: " . $e->getMessage());
        }
    }

    public function batchAssignHospitalities(
        string $eventId, array $ticketAssignments, int $adminUserId
    ): array {
        try {
            $conn = $this->db->getConnection();
            $conn->beginTransaction();

            $totalDeleted = 0;
            $totalInserted = 0;

            foreach ($ticketAssignments as $ticketId => $hospitalityIds) {
                $deleteSql = "DELETE FROM ticket_hospitalities WHERE event_id = ? AND ticket_id = ?";
                $deleteStmt = $conn->prepare($deleteSql);
                $deleteStmt->execute([$eventId, $ticketId]);
                $totalDeleted += $deleteStmt->rowCount();

                if (!empty($hospitalityIds)) {
                    $insertSql = "INSERT INTO ticket_hospitalities (event_id, ticket_id, hospitality_id, created_by) VALUES (?, ?, ?, ?)";
                    $insertStmt = $conn->prepare($insertSql);
                    foreach ($hospitalityIds as $hospitalityId) {
                        $insertStmt->execute([$eventId, $ticketId, $hospitalityId, $adminUserId]);
                        $totalInserted++;
                    }
                }
            }

            $conn->commit();
            return [
                'success' => true,
                'deleted_count' => $totalDeleted,
                'inserted_count' => $totalInserted,
                'tickets_processed' => count($ticketAssignments),
                'message' => "Successfully processed " . count($ticketAssignments) . " tickets with {$totalInserted} hospitality assignments"
            ];
        } catch (Exception $e) {
            if ($conn->inTransaction()) { $conn->rollBack(); }
            throw new Exception("Failed to batch assign hospitalities: " . $e->getMessage());
        }
    }

    public function removeTicketHospitalities(string $eventId, string $ticketId): int
    {
        $sql = "DELETE FROM ticket_hospitalities WHERE event_id = ? AND ticket_id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId, $ticketId]);
        return $stmt->rowCount();
    }

    public function removeEventHospitalities(string $eventId): int
    {
        $sql = "DELETE FROM ticket_hospitalities WHERE event_id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId]);
        return $stmt->rowCount();
    }

    // ========================================================================
    // Statistics
    // ========================================================================

    public function getHospitalityStats(): array
    {
        $conn = $this->db->getConnection();

        $totalStmt = $conn->query("SELECT COUNT(*) as total FROM hospitalities");
        $total = (int) $totalStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $activeStmt = $conn->query("SELECT COUNT(*) as active FROM hospitalities WHERE is_active = 1");
        $active = (int) $activeStmt->fetch(PDO::FETCH_ASSOC)['active'];

        // Hierarchical assignments
        $haStmt = $conn->query("SELECT COUNT(*) as total FROM hospitality_assignments WHERE is_active = 1");
        $haTotal = (int) $haStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Legacy assignments
        $legacyStmt = $conn->query("SELECT COUNT(*) as total FROM ticket_hospitalities");
        $legacyTotal = (int) $legacyStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // By level
        $levelStmt = $conn->query("
            SELECT level, COUNT(*) as count 
            FROM hospitality_assignments 
            WHERE is_active = 1 
            GROUP BY level 
            ORDER BY FIELD(level, 'sport', 'tournament', 'team', 'event', 'ticket')
        ");
        $byLevel = $levelStmt->fetchAll(PDO::FETCH_ASSOC);

        // Top hospitalities
        $topStmt = $conn->query("
            SELECT h.id, h.name, COUNT(ha.id) as assignment_count
            FROM hospitalities h
            LEFT JOIN hospitality_assignments ha ON h.id = ha.hospitality_id AND ha.is_active = 1
            GROUP BY h.id, h.name
            ORDER BY assignment_count DESC
            LIMIT 5
        ");
        $topHospitalities = $topStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total_hospitalities' => $total,
            'active_hospitalities' => $active,
            'total_assignments' => $haTotal,
            'legacy_assignments' => $legacyTotal,
            'assignments_by_level' => $byLevel,
            'top_hospitalities' => $topHospitalities,
        ];
    }
}
