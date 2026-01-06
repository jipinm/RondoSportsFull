<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use PDO;
use Exception;
use PDOException;

class RefundRepository
{
    private DatabaseService $db;

    public function __construct(DatabaseService $db)
    {
        $this->db = $db;
    }

    /**
     * Get refund requests with pagination and filters
     */
    public function getRefundRequests(array $filters = [], int $page = 1, int $limit = 20): array
    {
        try {
            $whereClause = '';
            $params = [];

            // Build WHERE conditions
            $conditions = [];

            // Search filter
            if (!empty($filters['search'])) {
                $searchTerm = '%' . $filters['search'] . '%';
                $conditions[] = '(
                    r.refund_reference LIKE ? OR 
                    b.booking_reference LIKE ? OR 
                    CONCAT(c.first_name, " ", IFNULL(c.last_name, "")) LIKE ? OR 
                    r.refund_reason LIKE ?
                )';
                $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
            }

            // Status filter
            if (!empty($filters['status'])) {
                $conditions[] = 'r.status = ?';
                $params[] = $filters['status'];
            }

            // Date range filters
            if (!empty($filters['start_date'])) {
                $conditions[] = 'DATE(r.requested_at) >= ?';
                $params[] = $filters['start_date'];
            }

            if (!empty($filters['end_date'])) {
                $conditions[] = 'DATE(r.requested_at) <= ?';
                $params[] = $filters['end_date'];
            }

            // Priority filter
            if (!empty($filters['priority'])) {
                $conditions[] = 'r.priority = ?';
                $params[] = $filters['priority'];
            }

            if (!empty($conditions)) {
                $whereClause = ' WHERE ' . implode(' AND ', $conditions);
            }

            // Count total records for pagination
            $countSql = "
                SELECT COUNT(*) 
                FROM refund_requests r
                LEFT JOIN bookings b ON r.booking_id = b.id
                LEFT JOIN customer_users c ON r.customer_user_id = c.id
                {$whereClause}
            ";

            $countStmt = $this->db->getConnection()->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = (int)$countStmt->fetchColumn();

            // Calculate pagination
            $offset = ($page - 1) * $limit;
            $totalPages = (int)ceil($totalRecords / $limit);

            // Get refund requests data
            $sql = "
                SELECT 
                    r.id,
                    r.refund_reference,
                    r.booking_id,
                    r.customer_user_id,
                    r.requested_amount,
                    r.approved_amount,
                    r.processing_fee,
                    r.net_refund_amount,
                    r.refund_reason,
                    r.refund_type,
                    r.status,
                    r.priority,
                    r.reviewed_by,
                    r.processed_by,
                    r.admin_notes,
                    r.rejection_reason,
                    r.payment_system_reference,
                    r.external_status,
                    r.requested_at,
                    r.reviewed_at,
                    r.approved_at,
                    r.processed_at,
                    r.completed_at,
                    r.created_at,
                    r.updated_at,
                    b.booking_reference,
                    b.event_name,
                    CONCAT(c.first_name, ' ', IFNULL(c.last_name, '')) as customer_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    reviewer.name as reviewed_by_name,
                    processor.name as processed_by_name
                FROM refund_requests r
                LEFT JOIN bookings b ON r.booking_id = b.id
                LEFT JOIN customer_users c ON r.customer_user_id = c.id
                LEFT JOIN admin_users reviewer ON r.reviewed_by = reviewer.id
                LEFT JOIN admin_users processor ON r.processed_by = processor.id
                {$whereClause}
                ORDER BY r.created_at DESC, r.updated_at DESC
                LIMIT {$limit} OFFSET {$offset}
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute($params);
            $refunds = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format data for frontend compatibility
            foreach ($refunds as &$refund) {
                // Convert amounts to float
                $refund['requested_amount'] = (float)$refund['requested_amount'];
                $refund['approved_amount'] = (float)$refund['approved_amount'];
                $refund['processing_fee'] = (float)$refund['processing_fee'];
                $refund['net_refund_amount'] = (float)$refund['net_refund_amount'];

                // Create user object for frontend compatibility
                $refund['user'] = [
                    'id' => $refund['customer_user_id'],
                    'name' => $refund['customer_name'] ?? 'Unknown Customer',
                    'email' => $refund['customer_email'] ?? '',
                    'phone' => $refund['customer_phone'] ?? null
                ];

                // Add booking info
                $refund['booking'] = [
                    'id' => $refund['booking_id'],
                    'reference' => $refund['booking_reference'],
                    'event_name' => $refund['event_name']
                ];

                // Frontend expects these field names
                $refund['amount'] = $refund['requested_amount'];
                $refund['reason'] = $refund['refund_reason'];
                $refund['requestDate'] = $refund['requested_at'];
                $refund['bookingId'] = $refund['booking_reference'];
            }

            return [
                'refunds' => $refunds,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total_items' => $totalRecords,
                    'total_pages' => $totalPages,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1
                ]
            ];

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching refund requests: " . $e->getMessage());
        }
    }

    /**
     * Get refund request by ID
     */
    public function getRefundRequestById(int $refundId): ?array
    {
        try {
            $sql = "
                SELECT 
                    r.*,
                    b.booking_reference,
                    b.event_name,
                    b.event_date,
                    b.venue_name,
                    b.total_amount as booking_amount,
                    CONCAT(c.first_name, ' ', IFNULL(c.last_name, '')) as customer_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    c.country_code as customer_country,
                    reviewer.name as reviewed_by_name,
                    processor.name as processed_by_name
                FROM refund_requests r
                LEFT JOIN bookings b ON r.booking_id = b.id
                LEFT JOIN customer_users c ON r.customer_user_id = c.id
                LEFT JOIN admin_users reviewer ON r.reviewed_by = reviewer.id
                LEFT JOIN admin_users processor ON r.processed_by = processor.id
                WHERE r.id = ?
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$refundId]);
            $refund = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$refund) {
                return null;
            }

            // Format data
            $refund['requested_amount'] = (float)$refund['requested_amount'];
            $refund['approved_amount'] = (float)$refund['approved_amount'];
            $refund['processing_fee'] = (float)$refund['processing_fee'];
            $refund['net_refund_amount'] = (float)$refund['net_refund_amount'];
            $refund['booking_amount'] = (float)$refund['booking_amount'];

            // Decode JSON fields if any
            if ($refund['customer_bank_details']) {
                $refund['customer_bank_details'] = json_decode($refund['customer_bank_details'], true) ?? [];
            }

            // Create user object
            $refund['user'] = [
                'id' => $refund['customer_user_id'],
                'name' => $refund['customer_name'] ?? 'Unknown Customer',
                'email' => $refund['customer_email'] ?? '',
                'phone' => $refund['customer_phone'] ?? null
            ];

            // Frontend compatibility
            $refund['amount'] = $refund['requested_amount'];
            $refund['reason'] = $refund['refund_reason'];
            $refund['requestDate'] = $refund['requested_at'];
            $refund['bookingId'] = $refund['booking_reference'];

            return $refund;

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching refund request: " . $e->getMessage());
        }
    }

    /**
     * Update refund request status
     */
    public function updateRefundStatus(
        int $refundId, 
        string $status, 
        ?int $adminUserId = null,
        ?string $adminNotes = null,
        ?string $rejectionReason = null,
        ?float $approvedAmount = null
    ): bool {
        try {
            $this->db->getConnection()->beginTransaction();

            // Get current refund request
            $refund = $this->getRefundRequestById($refundId);
            if (!$refund) {
                throw new Exception("Refund request not found");
            }

            // Build update fields dynamically
            $updateFields = ['status = ?', 'updated_at = NOW()'];
            $params = [$status];

            // Add timestamp fields based on status
            switch ($status) {
                case 'under_review':
                    $updateFields[] = 'reviewed_by = ?';
                    $updateFields[] = 'reviewed_at = NOW()';
                    $params[] = $adminUserId;
                    break;

                case 'approved':
                    $updateFields[] = 'reviewed_by = ?';
                    $updateFields[] = 'reviewed_at = NOW()';
                    $updateFields[] = 'approved_at = NOW()';
                    $params[] = $adminUserId;
                    
                    if ($approvedAmount !== null) {
                        $updateFields[] = 'approved_amount = ?';
                        $params[] = $approvedAmount;
                        
                        // Calculate net refund amount (approved - processing fee)
                        $processingFee = $refund['processing_fee'] ?? 0;
                        $netAmount = max(0, $approvedAmount - $processingFee);
                        $updateFields[] = 'net_refund_amount = ?';
                        $params[] = $netAmount;
                    }
                    break;

                case 'rejected':
                    $updateFields[] = 'reviewed_by = ?';
                    $updateFields[] = 'reviewed_at = NOW()';
                    $params[] = $adminUserId;
                    
                    if ($rejectionReason) {
                        $updateFields[] = 'rejection_reason = ?';
                        $params[] = $rejectionReason;
                    }
                    break;

                case 'processed':
                    $updateFields[] = 'processed_by = ?';
                    $updateFields[] = 'processed_at = NOW()';
                    $params[] = $adminUserId;
                    break;

                case 'failed':
                    $updateFields[] = 'processed_by = ?';
                    $updateFields[] = 'processed_at = NOW()';
                    $params[] = $adminUserId;
                    break;
            }

            // Add admin notes if provided
            if ($adminNotes) {
                $updateFields[] = 'admin_notes = ?';
                $params[] = $adminNotes;
            }

            $sql = "UPDATE refund_requests SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $params[] = $refundId;

            $stmt = $this->db->getConnection()->prepare($sql);
            $result = $stmt->execute($params);

            $this->db->getConnection()->commit();
            return $result;

        } catch (Exception $e) {
            $this->db->getConnection()->rollBack();
            throw new Exception("Failed to update refund status: " . $e->getMessage());
        }
    }

    /**
     * Get refund statistics
     */
    public function getRefundStats(): array
    {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
                    SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review_requests,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests,
                    SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) as processed_requests,
                    SUM(CASE WHEN status IN ('approved', 'processed') THEN requested_amount ELSE 0 END) as total_approved_amount,
                    SUM(CASE WHEN status = 'processed' THEN net_refund_amount ELSE 0 END) as total_processed_amount,
                    AVG(CASE WHEN status IN ('approved', 'processed') THEN requested_amount ELSE NULL END) as avg_refund_amount
                FROM refund_requests
            ";

            $stmt = $this->db->getConnection()->query($sql);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            // Convert to proper types
            return [
                'total_requests' => (int)$stats['total_requests'],
                'pending_requests' => (int)$stats['pending_requests'],
                'under_review_requests' => (int)$stats['under_review_requests'],
                'approved_requests' => (int)$stats['approved_requests'],
                'rejected_requests' => (int)$stats['rejected_requests'],
                'processed_requests' => (int)$stats['processed_requests'],
                'total_approved_amount' => (float)$stats['total_approved_amount'],
                'total_processed_amount' => (float)$stats['total_processed_amount'],
                'avg_refund_amount' => $stats['avg_refund_amount'] ? (float)$stats['avg_refund_amount'] : 0.0
            ];

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching refund stats: " . $e->getMessage());
        }
    }

    /**
     * Get refunds by customer ID
     */
    public function getRefundsByCustomer(int $customerId, int $limit = 10): array
    {
        try {
            $sql = "
                SELECT 
                    r.id,
                    r.refund_reference,
                    r.booking_id,
                    r.requested_amount,
                    r.status,
                    r.refund_reason,
                    r.requested_at,
                    b.booking_reference,
                    b.event_name
                FROM refund_requests r
                LEFT JOIN bookings b ON r.booking_id = b.id
                WHERE r.customer_user_id = ?
                ORDER BY r.requested_at DESC
                LIMIT ?
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$customerId, $limit]);
            $refunds = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($refunds as &$refund) {
                $refund['requested_amount'] = (float)$refund['requested_amount'];
            }

            return $refunds;

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching customer refunds: " . $e->getMessage());
        }
    }

    /**
     * Create a new refund request log entry
     */
    public function create(array $data): int
    {
        try {
            $sql = "
                INSERT INTO refund_requests (
                    refund_reference,
                    booking_id,
                    customer_user_id,
                    requested_amount,
                    approved_amount,
                    processing_fee,
                    net_refund_amount,
                    refund_reason,
                    refund_type,
                    status,
                    priority,
                    reviewed_by,
                    processed_by,
                    admin_notes,
                    rejection_reason,
                    payment_system_reference,
                    external_status,
                    requested_at,
                    reviewed_at,
                    approved_at,
                    processed_at,
                    completed_at,
                    created_at,
                    updated_at
                ) VALUES (
                    :refund_reference,
                    :booking_id,
                    :customer_user_id,
                    :requested_amount,
                    :approved_amount,
                    :processing_fee,
                    :net_refund_amount,
                    :refund_reason,
                    :refund_type,
                    :status,
                    :priority,
                    :reviewed_by,
                    :processed_by,
                    :admin_notes,
                    :rejection_reason,
                    :payment_system_reference,
                    :external_status,
                    :requested_at,
                    :reviewed_at,
                    :approved_at,
                    :processed_at,
                    :completed_at,
                    NOW(),
                    NOW()
                )
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([
                ':refund_reference' => $data['refund_reference'] ?? null,
                ':booking_id' => $data['booking_id'] ?? null,
                ':customer_user_id' => $data['customer_user_id'] ?? null,
                ':requested_amount' => $data['requested_amount'] ?? 0,
                ':approved_amount' => $data['approved_amount'] ?? 0,
                ':processing_fee' => $data['processing_fee'] ?? 0,
                ':net_refund_amount' => $data['net_refund_amount'] ?? 0,
                ':refund_reason' => $data['refund_reason'] ?? null,
                ':refund_type' => $data['refund_type'] ?? 'full',
                ':status' => $data['status'] ?? 'pending',
                ':priority' => $data['priority'] ?? 'normal',
                ':reviewed_by' => $data['reviewed_by'] ?? null,
                ':processed_by' => $data['processed_by'] ?? null,
                ':admin_notes' => $data['admin_notes'] ?? null,
                ':rejection_reason' => $data['rejection_reason'] ?? null,
                ':payment_system_reference' => $data['payment_system_reference'] ?? null,
                ':external_status' => $data['external_status'] ?? null,
                ':requested_at' => $data['requested_at'] ?? null,
                ':reviewed_at' => $data['reviewed_at'] ?? null,
                ':approved_at' => $data['approved_at'] ?? null,
                ':processed_at' => $data['processed_at'] ?? null,
                ':completed_at' => $data['completed_at'] ?? null
            ]);

            return (int)$this->db->getConnection()->lastInsertId();

        } catch (PDOException $e) {
            throw new Exception("Database error while creating refund request: " . $e->getMessage());
        }
    }
}