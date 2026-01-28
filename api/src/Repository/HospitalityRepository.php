<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use PDO;
use Exception;

/**
 * Repository for hospitality services management
 */
class HospitalityRepository
{
    private DatabaseService $db;

    public function __construct(DatabaseService $db)
    {
        $this->db = $db;
    }

    /**
     * Get all hospitality services
     * 
     * @param bool $activeOnly Only return active services
     * @return array Array of hospitality records
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
     * 
     * @param int $id Hospitality ID
     * @return array|null Hospitality record or null if not found
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
     * Create a new hospitality service
     * 
     * @param array $data Hospitality data
     * @param int $adminUserId Admin user creating the service
     * @return int The ID of the created hospitality
     */
    public function createHospitality(array $data, int $adminUserId): int
    {
        $sql = "
            INSERT INTO hospitalities (
                name, 
                description, 
                price_usd, 
                is_active, 
                sort_order,
                created_by,
                updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['description'] ?? null,
            $data['price_usd'] ?? 0.00,
            $data['is_active'] ?? 1,
            $data['sort_order'] ?? 0,
            $adminUserId,
            $adminUserId
        ]);

        return (int) $this->db->getConnection()->lastInsertId();
    }

    /**
     * Update an existing hospitality service
     * 
     * @param int $id Hospitality ID
     * @param array $data Updated hospitality data
     * @param int $adminUserId Admin user updating the service
     * @return bool Success status
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
        if (isset($data['price_usd'])) {
            $fields[] = 'price_usd = ?';
            $values[] = $data['price_usd'];
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
     * 
     * @param int $id Hospitality ID
     * @return bool Success status
     */
    public function deleteHospitality(int $id): bool
    {
        $sql = "DELETE FROM hospitalities WHERE id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        return $stmt->execute([$id]);
    }

    /**
     * Get all active hospitality services (for public API)
     * 
     * @return array Array of active hospitality records
     */
    public function getAllActiveHospitalities(): array
    {
        return $this->getAllHospitalities(true);
    }

    /**
     * Get hospitalities for an event (public API alias)
     * 
     * @param string $eventId XS2Event event ID
     * @return array Array of hospitality assignments grouped by ticket
     */
    public function getEventHospitalities(string $eventId): array
    {
        return $this->getHospitalitiesByEvent($eventId);
    }

    /**
     * Get hospitalities for a specific ticket (public API alias)
     * 
     * @param string $eventId XS2Event event ID
     * @param string $ticketId XS2Event ticket ID
     * @return array Array of hospitality assignments
     */
    public function getTicketHospitalities(string $eventId, string $ticketId): array
    {
        return $this->getHospitalitiesByTicket($eventId, $ticketId);
    }

    /**
     * Get hospitalities assigned to a ticket
     * 
     * @param string $eventId XS2Event event ID
     * @param string $ticketId XS2Event ticket ID
     * @return array Array of hospitality assignments
     */
    public function getHospitalitiesByTicket(string $eventId, string $ticketId): array
    {
        $sql = "
            SELECT 
                th.*,
                h.name,
                h.description,
                h.price_usd as base_price_usd,
                h.is_active,
                COALESCE(th.custom_price_usd, h.price_usd) as effective_price_usd,
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

    /**
     * Get hospitalities assigned to all tickets in an event
     * 
     * @param string $eventId XS2Event event ID
     * @return array Array of hospitality assignments grouped by ticket
     */
    public function getHospitalitiesByEvent(string $eventId): array
    {
        $sql = "
            SELECT 
                th.*,
                h.name,
                h.description,
                h.price_usd as base_price_usd,
                h.is_active,
                COALESCE(th.custom_price_usd, h.price_usd) as effective_price_usd,
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

    /**
     * Assign hospitalities to a ticket (replaces existing assignments)
     * 
     * @param string $eventId XS2Event event ID
     * @param string $ticketId XS2Event ticket ID
     * @param array $hospitalityIds Array of hospitality IDs to assign
     * @param int $adminUserId Admin user performing the action
     * @return array Result with success status
     */
    public function assignHospitalitiesToTicket(
        string $eventId, 
        string $ticketId, 
        array $hospitalityIds, 
        int $adminUserId
    ): array {
        try {
            $conn = $this->db->getConnection();
            $conn->beginTransaction();

            // First, delete existing assignments for this ticket
            $deleteSql = "DELETE FROM ticket_hospitalities WHERE event_id = ? AND ticket_id = ?";
            $deleteStmt = $conn->prepare($deleteSql);
            $deleteStmt->execute([$eventId, $ticketId]);
            $deletedCount = $deleteStmt->rowCount();

            // Then, insert new assignments
            $insertedCount = 0;
            if (!empty($hospitalityIds)) {
                $insertSql = "
                    INSERT INTO ticket_hospitalities (
                        event_id, 
                        ticket_id, 
                        hospitality_id, 
                        created_by
                    ) VALUES (?, ?, ?, ?)
                ";
                $insertStmt = $conn->prepare($insertSql);

                foreach ($hospitalityIds as $hospitalityId) {
                    $insertStmt->execute([
                        $eventId,
                        $ticketId,
                        $hospitalityId,
                        $adminUserId
                    ]);
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
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw new Exception("Failed to assign hospitalities: " . $e->getMessage());
        }
    }

    /**
     * Batch assign hospitalities to multiple tickets in an event
     * 
     * @param string $eventId XS2Event event ID
     * @param array $ticketAssignments Array of [ticket_id => [hospitality_ids]]
     * @param int $adminUserId Admin user performing the action
     * @return array Result with success status
     */
    public function batchAssignHospitalities(
        string $eventId, 
        array $ticketAssignments, 
        int $adminUserId
    ): array {
        try {
            $conn = $this->db->getConnection();
            $conn->beginTransaction();

            $totalDeleted = 0;
            $totalInserted = 0;

            foreach ($ticketAssignments as $ticketId => $hospitalityIds) {
                // Delete existing assignments for this ticket
                $deleteSql = "DELETE FROM ticket_hospitalities WHERE event_id = ? AND ticket_id = ?";
                $deleteStmt = $conn->prepare($deleteSql);
                $deleteStmt->execute([$eventId, $ticketId]);
                $totalDeleted += $deleteStmt->rowCount();

                // Insert new assignments
                if (!empty($hospitalityIds)) {
                    $insertSql = "
                        INSERT INTO ticket_hospitalities (
                            event_id, 
                            ticket_id, 
                            hospitality_id, 
                            created_by
                        ) VALUES (?, ?, ?, ?)
                    ";
                    $insertStmt = $conn->prepare($insertSql);

                    foreach ($hospitalityIds as $hospitalityId) {
                        $insertStmt->execute([
                            $eventId,
                            $ticketId,
                            $hospitalityId,
                            $adminUserId
                        ]);
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
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw new Exception("Failed to batch assign hospitalities: " . $e->getMessage());
        }
    }

    /**
     * Remove all hospitality assignments for a ticket
     * 
     * @param string $eventId XS2Event event ID
     * @param string $ticketId XS2Event ticket ID
     * @return int Number of deleted assignments
     */
    public function removeTicketHospitalities(string $eventId, string $ticketId): int
    {
        $sql = "DELETE FROM ticket_hospitalities WHERE event_id = ? AND ticket_id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId, $ticketId]);
        return $stmt->rowCount();
    }

    /**
     * Remove all hospitality assignments for an event
     * 
     * @param string $eventId XS2Event event ID
     * @return int Number of deleted assignments
     */
    public function removeEventHospitalities(string $eventId): int
    {
        $sql = "DELETE FROM ticket_hospitalities WHERE event_id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId]);
        return $stmt->rowCount();
    }

    /**
     * Get statistics about hospitality usage
     * 
     * @return array Statistics data
     */
    public function getHospitalityStats(): array
    {
        // Total hospitalities
        $totalSql = "SELECT COUNT(*) as total FROM hospitalities";
        $totalStmt = $this->db->getConnection()->query($totalSql);
        $total = (int) $totalStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Active hospitalities
        $activeSql = "SELECT COUNT(*) as active FROM hospitalities WHERE is_active = 1";
        $activeStmt = $this->db->getConnection()->query($activeSql);
        $active = (int) $activeStmt->fetch(PDO::FETCH_ASSOC)['active'];

        // Total assignments
        $assignmentsSql = "SELECT COUNT(*) as total FROM ticket_hospitalities";
        $assignmentsStmt = $this->db->getConnection()->query($assignmentsSql);
        $totalAssignments = (int) $assignmentsStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Unique events with hospitalities
        $eventsSql = "SELECT COUNT(DISTINCT event_id) as events FROM ticket_hospitalities";
        $eventsStmt = $this->db->getConnection()->query($eventsSql);
        $uniqueEvents = (int) $eventsStmt->fetch(PDO::FETCH_ASSOC)['events'];

        // Most assigned hospitalities
        $topSql = "
            SELECT 
                h.id,
                h.name,
                COUNT(th.id) as assignment_count
            FROM hospitalities h
            LEFT JOIN ticket_hospitalities th ON h.id = th.hospitality_id
            GROUP BY h.id, h.name
            ORDER BY assignment_count DESC
            LIMIT 5
        ";
        $topStmt = $this->db->getConnection()->query($topSql);
        $topHospitalities = $topStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total_hospitalities' => $total,
            'active_hospitalities' => $active,
            'total_assignments' => $totalAssignments,
            'unique_events_with_hospitalities' => $uniqueEvents,
            'top_hospitalities' => $topHospitalities
        ];
    }
}
