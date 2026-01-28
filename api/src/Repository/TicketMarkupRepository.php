<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use PDO;
use Exception;

class TicketMarkupRepository
{
    private DatabaseService $db;

    public function __construct(DatabaseService $db)
    {
        $this->db = $db;
    }

    /**
     * Create or update markup pricing for multiple tickets in a single event
     * 
     * @param string $eventId XS2Event event ID
     * @param array $ticketsData Array of ticket data with markup info
     * @param int $adminUserId Admin user performing the action
     * @return array Result with success status and affected count
     */
    public function batchUpsertMarkups(string $eventId, array $ticketsData, int $adminUserId): array
    {
        try {
            $conn = $this->db->getConnection();
            $conn->beginTransaction();

            $affectedCount = 0;

            foreach ($ticketsData as $ticketData) {
                // Determine markup type (default to 'fixed' for backward compatibility)
                $markupType = $ticketData['markup_type'] ?? 'fixed';
                $markupPercentage = $markupType === 'percentage' ? ($ticketData['markup_percentage'] ?? null) : null;
                
                $sql = "
                    INSERT INTO ticket_markups (
                        event_id, 
                        ticket_id, 
                        markup_price_usd,
                        markup_type,
                        markup_percentage,
                        base_price_usd, 
                        final_price_usd,
                        created_by,
                        updated_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        markup_price_usd = VALUES(markup_price_usd),
                        markup_type = VALUES(markup_type),
                        markup_percentage = VALUES(markup_percentage),
                        base_price_usd = VALUES(base_price_usd),
                        final_price_usd = VALUES(final_price_usd),
                        updated_by = VALUES(updated_by),
                        updated_at = CURRENT_TIMESTAMP
                ";

                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    $eventId,
                    $ticketData['ticket_id'],
                    $ticketData['markup_price_usd'],
                    $markupType,
                    $markupPercentage,
                    $ticketData['base_price_usd'],
                    $ticketData['final_price_usd'],
                    $adminUserId,
                    $adminUserId
                ]);

                $affectedCount += $stmt->rowCount();
            }

            $conn->commit();

            return [
                'success' => true,
                'affected_count' => $affectedCount,
                'message' => "Successfully updated markup for {$affectedCount} tickets"
            ];

        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw new Exception("Failed to batch upsert markups: " . $e->getMessage());
        }
    }

    /**
     * Get all markups for a specific event
     * 
     * @param string $eventId XS2Event event ID
     * @return array Array of markup records
     */
    public function getMarkupsByEvent(string $eventId): array
    {
        $sql = "
            SELECT 
                tm.*,
                cu.name as created_by_name,
                uu.name as updated_by_name
            FROM ticket_markups tm
            LEFT JOIN admin_users cu ON tm.created_by = cu.id
            LEFT JOIN admin_users uu ON tm.updated_by = uu.id
            WHERE tm.event_id = ?
            ORDER BY tm.created_at DESC
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get markup for a specific ticket
     * 
     * @param string $ticketId XS2Event ticket ID
     * @return array|null Markup record or null if not found
     */
    public function getMarkupByTicket(string $ticketId): ?array
    {
        $sql = "
            SELECT 
                tm.*,
                cu.name as created_by_name,
                uu.name as updated_by_name
            FROM ticket_markups tm
            LEFT JOIN admin_users cu ON tm.created_by = cu.id
            LEFT JOIN admin_users uu ON tm.updated_by = uu.id
            WHERE tm.ticket_id = ?
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$ticketId]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Get markup by ID
     * 
     * @param int $id Markup ID
     * @return array|null Markup record or null if not found
     */
    public function getMarkupById(int $id): ?array
    {
        $sql = "
            SELECT 
                tm.*,
                cu.name as created_by_name,
                uu.name as updated_by_name
            FROM ticket_markups tm
            LEFT JOIN admin_users cu ON tm.created_by = cu.id
            LEFT JOIN admin_users uu ON tm.updated_by = uu.id
            WHERE tm.id = ?
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$id]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Update a single markup record
     * 
     * @param int $id Markup ID
     * @param array $data Update data
     * @param int $adminUserId Admin user performing the update
     * @return bool Success status
     */
    public function updateMarkup(int $id, array $data, int $adminUserId): bool
    {
        // Determine markup type (default to 'fixed' for backward compatibility)
        $markupType = $data['markup_type'] ?? 'fixed';
        $markupPercentage = $markupType === 'percentage' ? ($data['markup_percentage'] ?? null) : null;
        
        $sql = "
            UPDATE ticket_markups 
            SET 
                markup_price_usd = ?,
                markup_type = ?,
                markup_percentage = ?,
                base_price_usd = ?,
                final_price_usd = ?,
                updated_by = ?
            WHERE id = ?
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        return $stmt->execute([
            $data['markup_price_usd'],
            $markupType,
            $markupPercentage,
            $data['base_price_usd'],
            $data['final_price_usd'],
            $adminUserId,
            $id
        ]);
    }

    /**
     * Delete markup for a specific ticket
     * 
     * @param string $ticketId XS2Event ticket ID
     * @return bool Success status
     */
    public function deleteMarkupByTicket(string $ticketId): bool
    {
        $sql = "DELETE FROM ticket_markups WHERE ticket_id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        return $stmt->execute([$ticketId]);
    }

    /**
     * Delete markup by ID
     * 
     * @param int $id Markup ID
     * @return bool Success status
     */
    public function deleteMarkupById(int $id): bool
    {
        $sql = "DELETE FROM ticket_markups WHERE id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        return $stmt->execute([$id]);
    }

    /**
     * Delete all markups for a specific event
     * 
     * @param string $eventId XS2Event event ID
     * @return int Number of deleted records
     */
    public function deleteMarkupsByEvent(string $eventId): int
    {
        $sql = "DELETE FROM ticket_markups WHERE event_id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$eventId]);
        return $stmt->rowCount();
    }

    /**
     * Get all markups with pagination
     * 
     * @param int $page Page number
     * @param int $limit Records per page
     * @return array Paginated results with metadata
     */
    public function getAllMarkups(int $page = 1, int $limit = 50): array
    {
        // Count total records
        $countSql = "SELECT COUNT(*) as total FROM ticket_markups";
        $countStmt = $this->db->getConnection()->prepare($countSql);
        $countStmt->execute();
        $totalRecords = (int)$countStmt->fetchColumn();

        // Calculate pagination
        $offset = ($page - 1) * $limit;
        $totalPages = (int)ceil($totalRecords / $limit);

        // Get data
        $sql = "
            SELECT 
                tm.*,
                cu.name as created_by_name,
                uu.name as updated_by_name
            FROM ticket_markups tm
            LEFT JOIN admin_users cu ON tm.created_by = cu.id
            LEFT JOIN admin_users uu ON tm.updated_by = uu.id
            ORDER BY tm.updated_at DESC
            LIMIT ? OFFSET ?
        ";

        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $markups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'data' => $markups,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $totalRecords,
                'total_pages' => $totalPages,
                'has_more' => $page < $totalPages
            ]
        ];
    }

    /**
     * Check if markup exists for a ticket
     * 
     * @param string $ticketId XS2Event ticket ID
     * @return bool
     */
    public function markupExists(string $ticketId): bool
    {
        $sql = "SELECT COUNT(*) FROM ticket_markups WHERE ticket_id = ?";
        $stmt = $this->db->getConnection()->prepare($sql);
        $stmt->execute([$ticketId]);
        return (int)$stmt->fetchColumn() > 0;
    }
}
