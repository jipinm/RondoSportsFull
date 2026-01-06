<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use PDO;
use Exception;
use Psr\Log\LoggerInterface;

class CancellationRequestRepository
{
    private DatabaseService $db;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $db, LoggerInterface $logger)
    {
        $this->db = $db;
        $this->logger = $logger;
    }

    /**
     * Create a new cancellation request
     * 
     * @param array $data Request data
     * @return int Created request ID
     */
    public function create(array $data): int
    {
        try {
            $sql = "
                INSERT INTO booking_cancellation_requests (
                    booking_id,
                    customer_user_id,
                    cancellation_reason,
                    customer_notes,
                    status,
                    request_date
                ) VALUES (?, ?, ?, ?, ?, NOW())
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([
                $data['booking_id'],
                $data['customer_user_id'],
                $data['cancellation_reason'],
                $data['customer_notes'] ?? null,
                $data['status'] ?? 'pending'
            ]);

            $requestId = (int)$this->db->getConnection()->lastInsertId();

            $this->logger->info('Cancellation request created', [
                'request_id' => $requestId,
                'booking_id' => $data['booking_id'],
                'customer_user_id' => $data['customer_user_id']
            ]);

            return $requestId;

        } catch (Exception $e) {
            $this->logger->error('Failed to create cancellation request', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw $e;
        }
    }

    /**
     * Get cancellation request by ID
     * 
     * @param int $id Request ID
     * @return array|null Request data or null if not found
     */
    public function getById(int $id): ?array
    {
        try {
            $sql = "
                SELECT 
                    cr.*,
                    b.booking_reference,
                    b.api_booking_id,
                    b.api_reservation_id,
                    b.event_name,
                    b.event_date,
                    b.venue_name,
                    b.total_amount,
                    b.currency,
                    b.payment_status,
                    b.status as booking_status,
                    c.id as customer_id,
                    c.customer_id as customer_customer_id,
                    c.first_name as customer_first_name,
                    c.last_name as customer_last_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    u.name as admin_name
                FROM booking_cancellation_requests cr
                INNER JOIN bookings b ON cr.booking_id = b.id
                INNER JOIN customer_users c ON cr.customer_user_id = c.id
                LEFT JOIN admin_users u ON cr.admin_user_id = u.id
                WHERE cr.id = ?
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            return $result ?: null;

        } catch (Exception $e) {
            $this->logger->error('Failed to get cancellation request by ID', [
                'error' => $e->getMessage(),
                'request_id' => $id
            ]);
            throw $e;
        }
    }

    /**
     * Get cancellation request by booking ID
     * 
     * @param int $bookingId Booking ID
     * @return array|null Request data or null if not found
     */
    public function getByBookingId(int $bookingId): ?array
    {
        try {
            $sql = "
                SELECT 
                    cr.*,
                    b.booking_reference,
                    b.event_name,
                    b.event_date,
                    b.total_amount,
                    c.first_name as customer_first_name,
                    c.last_name as customer_last_name,
                    c.email as customer_email,
                    u.name as admin_name
                FROM booking_cancellation_requests cr
                INNER JOIN bookings b ON cr.booking_id = b.id
                INNER JOIN customer_users c ON cr.customer_user_id = c.id
                LEFT JOIN admin_users u ON cr.admin_user_id = u.id
                WHERE cr.booking_id = ?
                ORDER BY cr.created_at DESC
                LIMIT 1
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$bookingId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            return $result ?: null;

        } catch (Exception $e) {
            $this->logger->error('Failed to get cancellation request by booking ID', [
                'error' => $e->getMessage(),
                'booking_id' => $bookingId
            ]);
            throw $e;
        }
    }

    /**
     * Get all cancellation requests with filters and pagination
     * 
     * @param array $filters Filter criteria
     * @param int $page Page number
     * @param int $perPage Items per page
     * @return array Requests and pagination data
     */
    public function getAll(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        try {
            $whereConditions = [];
            $params = [];

            // Status filter (ignore 'all')
            if (!empty($filters['status']) && $filters['status'] !== 'all') {
                $whereConditions[] = "cr.status = ?";
                $params[] = $filters['status'];
            }

            // Search filter (booking reference, customer name, email)
            if (!empty($filters['search'])) {
                $whereConditions[] = "(
                    b.booking_reference LIKE ? OR 
                    CONCAT(c.first_name, ' ', IFNULL(c.last_name, '')) LIKE ? OR 
                    c.email LIKE ? OR
                    b.event_name LIKE ?
                )";
                $searchTerm = '%' . $filters['search'] . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            // Date range filter
            if (!empty($filters['date_from'])) {
                $whereConditions[] = "DATE(cr.request_date) >= ?";
                $params[] = $filters['date_from'];
            }

            if (!empty($filters['date_to'])) {
                $whereConditions[] = "DATE(cr.request_date) <= ?";
                $params[] = $filters['date_to'];
            }

            // Customer filter
            if (!empty($filters['customer_user_id'])) {
                $whereConditions[] = "cr.customer_user_id = ?";
                $params[] = $filters['customer_user_id'];
            }

            // Refund status filter
            if (!empty($filters['refund_status'])) {
                $whereConditions[] = "cr.refund_status = ?";
                $params[] = $filters['refund_status'];
            }

            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

            // Count total records
            $countSql = "
                SELECT COUNT(*) as total 
                FROM booking_cancellation_requests cr
                INNER JOIN bookings b ON cr.booking_id = b.id
                INNER JOIN customer_users c ON cr.customer_user_id = c.id
                {$whereClause}
            ";

            $countStmt = $this->db->getConnection()->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = (int)$countStmt->fetchColumn();

            // Calculate pagination
            $offset = ($page - 1) * $perPage;
            $totalPages = (int)ceil($totalRecords / $perPage);

            // Get requests
            $sql = "
                SELECT 
                    cr.*,
                    b.booking_reference,
                    b.api_booking_id,
                    b.api_reservation_id,
                    b.event_name,
                    b.event_date,
                    b.venue_name,
                    b.total_amount,
                    b.currency,
                    b.payment_status,
                    b.status as booking_status,
                    c.id as customer_id,
                    c.customer_id as customer_customer_id,
                    c.first_name as customer_first_name,
                    c.last_name as customer_last_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    u.name as admin_name
                FROM booking_cancellation_requests cr
                INNER JOIN bookings b ON cr.booking_id = b.id
                INNER JOIN customer_users c ON cr.customer_user_id = c.id
                LEFT JOIN admin_users u ON cr.admin_user_id = u.id
                {$whereClause}
                ORDER BY cr.created_at DESC, cr.updated_at DESC
                LIMIT ? OFFSET ?
            ";

            $params[] = $perPage;
            $params[] = $offset;

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute($params);
            $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'requests' => $requests,
                'pagination' => [
                    'total' => $totalRecords,
                    'page' => $page,
                    'per_page' => $perPage,
                    'total_pages' => $totalPages
                ]
            ];

        } catch (Exception $e) {
            $this->logger->error('Failed to get cancellation requests', [
                'error' => $e->getMessage(),
                'filters' => $filters
            ]);
            throw $e;
        }
    }

    /**
     * Update cancellation request
     * 
     * @param int $id Request ID
     * @param array $data Update data
     * @return bool Success status
     */
    public function update(int $id, array $data): bool
    {
        try {
            $fields = [];
            $params = [];

            // Build dynamic update query
            if (isset($data['status'])) {
                $fields[] = "status = ?";
                $params[] = $data['status'];
            }

            if (isset($data['admin_user_id'])) {
                $fields[] = "admin_user_id = ?";
                $params[] = $data['admin_user_id'];
            }

            if (isset($data['admin_notes'])) {
                $fields[] = "admin_notes = ?";
                $params[] = $data['admin_notes'];
            }

            if (isset($data['reviewed_date'])) {
                $fields[] = "reviewed_date = ?";
                $params[] = $data['reviewed_date'];
            }

            if (isset($data['completed_date'])) {
                $fields[] = "completed_date = ?";
                $params[] = $data['completed_date'];
            }

            if (isset($data['refund_amount'])) {
                $fields[] = "refund_amount = ?";
                $params[] = $data['refund_amount'];
            }

            if (isset($data['refund_status'])) {
                $fields[] = "refund_status = ?";
                $params[] = $data['refund_status'];
            }

            if (isset($data['refund_reference'])) {
                $fields[] = "refund_reference = ?";
                $params[] = $data['refund_reference'];
            }

            if (isset($data['refund_date'])) {
                $fields[] = "refund_date = ?";
                $params[] = $data['refund_date'];
            }

            if (empty($fields)) {
                return false;
            }

            $params[] = $id;

            $sql = "
                UPDATE booking_cancellation_requests 
                SET " . implode(', ', $fields) . "
                WHERE id = ?
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $result = $stmt->execute($params);

            $this->logger->info('Cancellation request updated', [
                'request_id' => $id,
                'updated_fields' => array_keys($data)
            ]);

            return $result;

        } catch (Exception $e) {
            $this->logger->error('Failed to update cancellation request', [
                'error' => $e->getMessage(),
                'request_id' => $id,
                'data' => $data
            ]);
            throw $e;
        }
    }

    /**
     * Update only the status of a cancellation request
     * 
     * @param int $id Request ID
     * @param string $status New status
     * @return bool Success status
     */
    public function updateStatus(int $id, string $status): bool
    {
        try {
            $sql = "UPDATE booking_cancellation_requests SET status = ? WHERE id = ?";
            $stmt = $this->db->getConnection()->prepare($sql);
            $result = $stmt->execute([$status, $id]);

            $this->logger->info('Cancellation request status updated', [
                'request_id' => $id,
                'status' => $status
            ]);

            return $result;

        } catch (Exception $e) {
            $this->logger->error('Failed to update cancellation request status', [
                'error' => $e->getMessage(),
                'request_id' => $id,
                'status' => $status
            ]);
            throw $e;
        }
    }

    /**
     * Get cancellation statistics
     * 
     * @return array Statistics data
     */
    public function getStatistics(): array
    {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'declined' OR status = 'rejected' THEN 1 ELSE 0 END) as declined,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN DATE(request_date) = CURDATE() THEN 1 ELSE 0 END) as today,
                    SUM(CASE WHEN DATE(request_date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as this_week,
                    SUM(CASE WHEN DATE(request_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as this_month,
                    COALESCE(SUM(refund_amount), 0) as total_refund_amount,
                    SUM(CASE WHEN refund_status = 'processed' THEN 1 ELSE 0 END) as refunds_processed
                FROM booking_cancellation_requests
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute();
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            return $stats ?: [];

        } catch (Exception $e) {
            $this->logger->error('Failed to get cancellation statistics', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Check if booking has an active cancellation request
     * 
     * @param int $bookingId Booking ID
     * @return bool True if active request exists
     */
    public function hasActiveCancellationRequest(int $bookingId): bool
    {
        try {
            $sql = "
                SELECT COUNT(*) 
                FROM booking_cancellation_requests 
                WHERE booking_id = ? 
                AND status IN ('pending', 'approved')
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$bookingId]);
            $count = (int)$stmt->fetchColumn();

            return $count > 0;

        } catch (Exception $e) {
            $this->logger->error('Failed to check active cancellation request', [
                'error' => $e->getMessage(),
                'booking_id' => $bookingId
            ]);
            throw $e;
        }
    }

    /**
     * Delete a cancellation request (for customer cancelling their own request)
     * 
     * @param int $id Request ID
     * @return bool Success status
     */
    public function delete(int $id): bool
    {
        try {
            $sql = "DELETE FROM booking_cancellation_requests WHERE id = ? AND status = 'pending'";
            $stmt = $this->db->getConnection()->prepare($sql);
            $result = $stmt->execute([$id]);

            $this->logger->info('Cancellation request deleted', [
                'request_id' => $id
            ]);

            return $result && $stmt->rowCount() > 0;

        } catch (Exception $e) {
            $this->logger->error('Failed to delete cancellation request', [
                'error' => $e->getMessage(),
                'request_id' => $id
            ]);
            throw $e;
        }
    }
}
