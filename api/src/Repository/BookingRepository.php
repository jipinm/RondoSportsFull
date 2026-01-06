<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use PDO;
use Exception;
use PDOException;

class BookingRepository
{
    private DatabaseService $db;

    public function __construct(DatabaseService $db)
    {
        $this->db = $db;
    }

    /**
     * Get bookings with pagination and filters
     */
    public function getBookings(array $filters = [], int $page = 1, int $limit = 20): array
    {
        try {
            // Build WHERE clause
            $whereConditions = [];
            $params = [];

            if (!empty($filters['search'])) {
                $whereConditions[] = "(b.event_name LIKE ? OR b.booking_reference LIKE ? OR CONCAT(c.first_name, ' ', IFNULL(c.last_name, '')) LIKE ? OR c.email LIKE ?)";
                $searchTerm = '%' . $filters['search'] . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            if (!empty($filters['status'])) {
                $whereConditions[] = "b.status = ?";
                $params[] = $filters['status'];
            }

            if (!empty($filters['payment_status'])) {
                $whereConditions[] = "b.payment_status = ?";
                $params[] = $filters['payment_status'];
            }

            if (!empty($filters['cancellation_status'])) {
                $whereConditions[] = "b.cancellation_status = ?";
                $params[] = $filters['cancellation_status'];
            }

            if (!empty($filters['event_date_from'])) {
                $whereConditions[] = "DATE(b.event_date) >= ?";
                $params[] = $filters['event_date_from'];
            }

            if (!empty($filters['event_date_to'])) {
                $whereConditions[] = "DATE(b.event_date) <= ?";
                $params[] = $filters['event_date_to'];
            }

            if (!empty($filters['booking_date_from'])) {
                $whereConditions[] = "DATE(b.booking_date) >= ?";
                $params[] = $filters['booking_date_from'];
            }

            if (!empty($filters['booking_date_to'])) {
                $whereConditions[] = "DATE(b.booking_date) <= ?";
                $params[] = $filters['booking_date_to'];
            }

            if (!empty($filters['sport_type'])) {
                $whereConditions[] = "b.sport_type = ?";
                $params[] = $filters['sport_type'];
            }

            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

            // Count total records
            $countSql = "
                SELECT COUNT(*) as total 
                FROM bookings b 
                LEFT JOIN customer_users c ON b.customer_user_id = c.id 
                {$whereClause}
            ";
            
            $countStmt = $this->db->getConnection()->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = (int)$countStmt->fetchColumn();

            // Calculate pagination
            $offset = ($page - 1) * $limit;
            $totalPages = (int)ceil($totalRecords / $limit);

            // Get bookings data
            $sql = "
                SELECT 
                    b.id,
                    b.booking_reference,
                    b.api_booking_id,
                    b.api_reservation_id,
                    b.customer_user_id,
                    CONCAT(c.first_name, ' ', IFNULL(c.last_name, '')) as customer_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    b.event_name,
                    b.event_id,
                    b.event_date,
                    b.venue_name,
                    b.venue_id,
                    b.sport_type,
                    b.tournament_name,
                    b.total_amount,
                    b.currency,
                    b.payment_method,
                    b.payment_reference,
                    b.stripe_session_id,
                    b.payment_intent_id,
                    b.commission_amount,
                    b.status,
                    b.payment_status,
                    b.ticket_count,
                    b.seat_info,
                    b.ticket_info,
                    b.category_name,
                    b.booking_date,
                    b.confirmed_at,
                    b.cancelled_at,
                    b.event_start_time,
                    b.source,
                    b.customer_notes,
                    b.admin_notes,
                    b.last_sync_at,
                    b.modified_by,
                    b.created_at,
                    b.updated_at,
                    -- XS2Event fields
                    b.xs2event_booking_status,
                    b.xs2event_logistic_status,
                    b.xs2event_distribution_channel,
                    b.xs2event_booking_code,
                    b.xs2event_synced_at,
                    b.xs2event_sync_attempts,
                    b.xs2event_last_error,
                    -- E-Ticket fields
                    b.eticket_status,
                    b.eticket_available_date,
                    b.eticket_urls,
                    b.zip_download_url,
                    b.last_download_attempt,
                    b.download_count,
                    b.first_downloaded_at,
                    b.ticket_expiry_date,
                    -- Stripe payment fields
                    b.stripe_payment_method_id,
                    b.stripe_customer_id,
                    b.stripe_charge_id,
                    b.payment_gateway_fee,
                    b.payment_completed_at,
                    -- Refund fields
                    b.refund_id,
                    b.refund_amount,
                    b.refund_reason,
                    b.refunded_at,
                    -- Cancellation fields
                    b.cancellation_status,
                    b.cancellation_date,
                    -- Legacy Cancellation Request fields
                    bcr.id as cancellation_request_id,
                    bcr.status as cancellation_request_status,
                    bcr.request_date as cancellation_request_date,
                    bcr.cancellation_reason,
                    bcr.customer_notes as cancellation_customer_notes,
                    bcr.admin_notes as cancellation_admin_notes,
                    bcr.reviewed_date as cancellation_reviewed_date,
                    bcr.refund_amount as cancellation_refund_amount,
                    bcr.refund_status as cancellation_refund_status
                FROM bookings b 
                LEFT JOIN customer_users c ON b.customer_user_id = c.id
                LEFT JOIN booking_cancellation_requests bcr ON b.id = bcr.booking_id
                {$whereClause}
                ORDER BY b.created_at DESC, b.updated_at DESC
                LIMIT {$limit} OFFSET {$offset}
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute($params);
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Decode JSON fields and format data
            foreach ($bookings as &$booking) {
                $booking['seat_info'] = json_decode($booking['seat_info'] ?? '[]', true) ?? [];
                $booking['ticket_info'] = json_decode($booking['ticket_info'] ?? '[]', true) ?? [];
                $booking['total_amount'] = (float)$booking['total_amount'];
                $booking['ticket_count'] = (int)$booking['ticket_count'];
                
                // Create user object for frontend compatibility
                $booking['user'] = [
                    'id' => $booking['customer_user_id'],
                    'name' => $booking['customer_name'] ?? 'Unknown Customer',
                    'email' => $booking['customer_email'] ?? '',
                    'phone' => $booking['customer_phone'] ?? null
                ];
                
                // Also add number_of_tickets and ticket_price for frontend compatibility
                $booking['number_of_tickets'] = $booking['ticket_count'];
                $booking['ticket_price'] = $booking['ticket_count'] > 0 
                    ? $booking['total_amount'] / $booking['ticket_count'] 
                    : 0;
            }

            return [
                'bookings' => $bookings,
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
            throw new Exception("Database error while fetching bookings: " . $e->getMessage());
        }
    }

    /**
     * Get a single booking by ID
     */
    public function getBookingById(int $bookingId): ?array
    {
        try {
            $sql = "
                SELECT 
                    b.*,
                    CONCAT(c.first_name, ' ', IFNULL(c.last_name, '')) as customer_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    c.country_code as customer_country,
                    au.name as modified_by_name,
                    -- Cancellation Request fields
                    bcr.id as cancellation_request_id,
                    bcr.status as cancellation_request_status,
                    bcr.request_date as cancellation_request_date,
                    bcr.cancellation_reason,
                    bcr.customer_notes as cancellation_customer_notes,
                    bcr.admin_notes as cancellation_admin_notes,
                    bcr.reviewed_date as cancellation_reviewed_date,
                    bcr.refund_amount as cancellation_refund_amount,
                    bcr.refund_status as cancellation_refund_status
                FROM bookings b 
                LEFT JOIN customer_users c ON b.customer_user_id = c.id 
                LEFT JOIN admin_users au ON b.modified_by = au.id
                LEFT JOIN booking_cancellation_requests bcr ON b.id = bcr.booking_id
                WHERE b.id = ?
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$bookingId]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$booking) {
                return null;
            }

            // Decode JSON fields and format data
            $booking['seat_info'] = json_decode($booking['seat_info'] ?? '[]', true) ?? [];
            $booking['ticket_info'] = json_decode($booking['ticket_info'] ?? '[]', true) ?? [];
            $booking['api_data'] = json_decode($booking['api_data'] ?? '{}', true) ?? [];
            $booking['total_amount'] = (float)$booking['total_amount'];
            $booking['commission_amount'] = (float)$booking['commission_amount'];
            $booking['ticket_count'] = (int)$booking['ticket_count'];
            
            // Create user object for frontend compatibility
            $booking['user'] = [
                'id' => $booking['customer_user_id'],
                'name' => $booking['customer_name'] ?? 'Unknown Customer',
                'email' => $booking['customer_email'] ?? '',
                'phone' => $booking['customer_phone'] ?? null
            ];
            
            // Also add number_of_tickets and ticket_price for frontend compatibility
            $booking['number_of_tickets'] = $booking['ticket_count'];
            $booking['ticket_price'] = $booking['ticket_count'] > 0 
                ? $booking['total_amount'] / $booking['ticket_count'] 
                : 0;

            return $booking;

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching booking: " . $e->getMessage());
        }
    }

    /**
     * Update booking status
     */
    public function updateBookingStatus(int $bookingId, string $status, ?int $adminUserId = null, ?string $reason = null): bool
    {
        try {
            $this->db->getConnection()->beginTransaction();

            // Get current booking
            $booking = $this->getBookingById($bookingId);
            if (!$booking) {
                throw new Exception("Booking not found");
            }

            // Update booking status
            $updateFields = ['status = ?', 'modified_by = ?', 'updated_at = NOW()'];
            $params = [$status, $adminUserId];

            // Set status-specific timestamps
            if ($status === 'confirmed' && empty($booking['confirmed_at'])) {
                $updateFields[] = 'confirmed_at = NOW()';
            } elseif ($status === 'cancelled' && empty($booking['cancelled_at'])) {
                $updateFields[] = 'cancelled_at = NOW()';
            }

            // Update admin notes if reason provided
            if ($reason) {
                $currentNotes = $booking['admin_notes'] ?? '';
                $newNote = date('Y-m-d H:i:s') . " - Status changed to {$status}: {$reason}";
                $updatedNotes = $currentNotes ? $currentNotes . "\n" . $newNote : $newNote;
                $updateFields[] = 'admin_notes = ?';
                $params[] = $updatedNotes;
            }

            $sql = "UPDATE bookings SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $params[] = $bookingId;

            $stmt = $this->db->getConnection()->prepare($sql);
            $result = $stmt->execute($params);

            $this->db->getConnection()->commit();
            return $result;

        } catch (Exception $e) {
            $this->db->getConnection()->rollBack();
            throw new Exception("Failed to update booking status: " . $e->getMessage());
        }
    }

    /**
     * Get booking statistics
     */
    public function getBookingStats(): array
    {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_bookings,
                    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                    COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_bookings,
                    SUM(CASE WHEN status = 'confirmed' AND payment_status = 'completed' THEN total_amount ELSE 0 END) as total_revenue,
                    SUM(CASE WHEN status = 'confirmed' THEN total_amount ELSE 0 END) as active_revenue,
                    AVG(CASE WHEN status = 'confirmed' THEN total_amount ELSE NULL END) as avg_booking_value
                FROM bookings
            ";

            $stmt = $this->db->getConnection()->query($sql);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            // Convert to proper types
            return [
                'total_bookings' => (int)$stats['total_bookings'],
                'confirmed_bookings' => (int)$stats['confirmed_bookings'],
                'pending_bookings' => (int)$stats['pending_bookings'],
                'cancelled_bookings' => (int)$stats['cancelled_bookings'],
                'refunded_bookings' => (int)$stats['refunded_bookings'],
                'total_revenue' => (float)($stats['total_revenue'] ?? 0),
                'active_revenue' => (float)($stats['active_revenue'] ?? 0),
                'avg_booking_value' => (float)($stats['avg_booking_value'] ?? 0)
            ];

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching booking stats: " . $e->getMessage());
        }
    }

    /**
     * Get total revenue for previous month
     */
    public function getRevenuePreviousMonth(): float
    {
        try {
            $sql = "
                SELECT SUM(total_amount) as revenue
                FROM bookings
                WHERE MONTH(booking_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
                AND YEAR(booking_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
                AND status = 'confirmed'
                AND payment_status = 'completed'
            ";

            $stmt = $this->db->getConnection()->query($sql);
            return (float)($stmt->fetchColumn() ?? 0);

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching previous month's revenue: " . $e->getMessage());
        }
    }

    /**
     * Get distinct sport types for filtering
     */
    public function getSportTypes(): array
    {
        try {
            $sql = "SELECT DISTINCT sport_type FROM bookings WHERE sport_type IS NOT NULL ORDER BY sport_type";
            $stmt = $this->db->getConnection()->query($sql);
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
        } catch (PDOException $e) {
            throw new Exception("Database error while fetching sport types: " . $e->getMessage());
        }
    }

    /**
     * Get bookings by customer ID
     */
    public function getBookingsByCustomer(int $customerId, int $limit = 10): array
    {
        try {
            $sql = "
                SELECT 
                    b.id,
                    b.booking_reference,
                    b.event_name,
                    b.event_date,
                    b.venue_name,
                    b.total_amount,
                    b.currency,
                    b.status,
                    b.booking_date
                FROM bookings b 
                WHERE b.customer_user_id = ?
                ORDER BY b.booking_date DESC
                LIMIT ?
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$customerId, $limit]);
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($bookings as &$booking) {
                $booking['total_amount'] = (float)$booking['total_amount'];
            }

            return $bookings;

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching customer bookings: " . $e->getMessage());
        }
    }

    /**
     * Get bookings by customer ID with filtering and pagination
     */
    public function findByCustomerId(int $customerId, array $options = []): array
    {
        try {
            $page = $options['page'] ?? 1;
            $limit = $options['limit'] ?? 10;
            $status = $options['status'] ?? null;
            $offset = ($page - 1) * $limit;

            // Build WHERE clause
            $whereConditions = ['b.customer_user_id = ?'];
            $params = [$customerId];

            if ($status) {
                $whereConditions[] = 'b.status = ?';
                $params[] = $status;
            }

            $whereClause = implode(' AND ', $whereConditions);

            $sql = "
                SELECT 
                    b.id,
                    b.booking_reference,
                    b.api_booking_id,
                    b.api_reservation_id,
                    b.event_name,
                    b.event_id,
                    b.event_date,
                    b.venue_name,
                    b.venue_id,
                    b.sport_type,
                    b.tournament_name,
                    b.total_amount,
                    b.currency,
                    b.payment_method,
                    b.payment_reference,
                    b.stripe_session_id,
                    b.payment_intent_id,
                    b.status,
                    b.payment_status,
                    b.ticket_count,
                    b.category_name,
                    b.seat_info,
                    b.ticket_info,
                    b.booking_date,
                    b.confirmed_at,
                    b.cancelled_at,
                    b.customer_notes,
                    b.event_start_time,
                    b.created_at,
                    b.updated_at,
                    b.eticket_status,
                    b.eticket_available_date,
                    b.download_count,
                    b.xs2event_booking_status,
                    b.xs2event_booking_code,
                    b.cancellation_status,
                    b.cancellation_date,
                    bcr.id AS cancellation_request_id,
                    bcr.created_at AS cancellation_request_date,
                    bcr.cancellation_reason,
                    bcr.status AS cancellation_request_status
                FROM bookings b 
                LEFT JOIN booking_cancellation_requests bcr ON b.id = bcr.booking_id
                WHERE {$whereClause}
                ORDER BY b.booking_date DESC
                LIMIT ? OFFSET ?
            ";

            $params[] = $limit;
            $params[] = $offset;

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute($params);
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Convert numeric fields to proper types
            foreach ($bookings as &$booking) {
                $booking['id'] = (int)$booking['id'];
                $booking['total_amount'] = (float)$booking['total_amount'];
                $booking['ticket_count'] = (int)$booking['ticket_count'];
            }

            return $bookings;

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching customer bookings: " . $e->getMessage());
        }
    }

    /**
     * Update booking with new data
     */
    public function update(int $bookingId, array $data): bool
    {
        try {
            if (empty($data)) {
                return false;
            }

            // Build SET clause
            $setClause = [];
            $params = [];
            
            foreach ($data as $column => $value) {
                $setClause[] = "{$column} = ?";
                $params[] = $value;
            }
            
            $params[] = $bookingId;
            
            $sql = "UPDATE bookings SET " . implode(', ', $setClause) . " WHERE id = ?";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            return $stmt->execute($params);
            
        } catch (PDOException $e) {
            throw new Exception("Database error while updating booking: " . $e->getMessage());
        }
    }

    /**
     * Create a new booking
     */
    public function create(array $bookingData): int
    {
        try {
            $sql = "INSERT INTO bookings (
                booking_reference,
                api_reservation_id,
                customer_user_id,
                event_name,
                event_id,
                event_date,
                venue_name,
                venue_id,
                sport_type,
                tournament_name,
                total_amount,
                currency,
                payment_method,
                payment_reference,
                payment_intent_id,
                stripe_payment_method_id,
                stripe_customer_id,
                stripe_charge_id,
                payment_gateway_response,
                payment_gateway_fee,
                status,
                payment_status,
                payment_completed_at,
                ticket_count,
                seat_info,
                ticket_info,
                category_name,
                event_start_time,
                api_data,
                customer_notes,
                source
            ) VALUES (
                :booking_reference,
                :api_reservation_id,
                :customer_user_id,
                :event_name,
                :event_id,
                :event_date,
                :venue_name,
                :venue_id,
                :sport_type,
                :tournament_name,
                :total_amount,
                :currency,
                :payment_method,
                :payment_reference,
                :payment_intent_id,
                :stripe_payment_method_id,
                :stripe_customer_id,
                :stripe_charge_id,
                :payment_gateway_response,
                :payment_gateway_fee,
                :status,
                :payment_status,
                :payment_completed_at,
                :ticket_count,
                :seat_info,
                :ticket_info,
                :category_name,
                :event_start_time,
                :api_data,
                :customer_notes,
                :source
            )";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            
            // Set default values for all required fields
            $defaults = [
                'booking_reference' => null,
                'api_reservation_id' => null,
                'customer_user_id' => null,
                'event_name' => null,
                'event_id' => null,
                'event_date' => null,
                'venue_name' => null,
                'venue_id' => null,
                'sport_type' => null,
                'tournament_name' => null,
                'total_amount' => 0,
                'currency' => 'USD',
                'payment_method' => 'stripe',
                'payment_reference' => null,
                'payment_intent_id' => null,
                'stripe_payment_method_id' => null,
                'stripe_customer_id' => null,
                'stripe_charge_id' => null,
                'payment_gateway_response' => null,
                'payment_gateway_fee' => null,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_completed_at' => null,
                'ticket_count' => 1,
                'seat_info' => null,
                'ticket_info' => null,
                'category_name' => null,
                'event_start_time' => null,
                'api_data' => null,
                'customer_notes' => null,
                'source' => 'website'
            ];
            
            $data = array_merge($defaults, $bookingData);
            
            // Convert arrays to JSON for JSON fields
            if (isset($data['seat_info']) && is_array($data['seat_info'])) {
                $data['seat_info'] = json_encode($data['seat_info']);
            }
            if (isset($data['ticket_info']) && is_array($data['ticket_info'])) {
                $data['ticket_info'] = json_encode($data['ticket_info']);
            }
            if (isset($data['api_data']) && is_array($data['api_data'])) {
                $data['api_data'] = json_encode($data['api_data']);
            }
            
            $stmt->execute($data);
            
            return (int) $this->db->getConnection()->lastInsertId();
            
        } catch (PDOException $e) {
            throw new Exception("Database error while creating booking: " . $e->getMessage());
        }
    }

    /**
     * Find booking by ID
     */
    public function findById(int $bookingId): ?array
    {
        try {
            $sql = "SELECT * FROM bookings WHERE id = ?";
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$bookingId]);
            
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            return $booking ?: null;
            
        } catch (PDOException $e) {
            throw new Exception("Database error while finding booking: " . $e->getMessage());
        }
    }

    /**
     * Update api_booking_id field
     * 
     * @param int $bookingId Local booking ID
     * @param string $apiBookingId XS2Event booking ID
     * @return bool Success status
     */
    public function updateApiBookingId(int $bookingId, string $apiBookingId): bool
    {
        try {
            $sql = "UPDATE bookings SET api_booking_id = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$apiBookingId, $bookingId]);
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            throw new Exception("Failed to update api_booking_id: " . $e->getMessage());
        }
    }

    /**
     * Update XS2Event status fields
     * 
     * @param int $bookingId Local booking ID
     * @param string $status XS2Event booking status
     * @param string $logisticStatus XS2Event logistic status
     * @param string|null $distributionChannel Distribution channel
     * @param string|null $bookingCode XS2Event booking code
     * @return bool Success status
     */
    public function updateXS2EventStatus(
        int $bookingId, 
        string $status, 
        string $logisticStatus,
        ?string $distributionChannel = null,
        ?string $bookingCode = null
    ): bool {
        try {
            $sql = "UPDATE bookings 
                    SET xs2event_booking_status = ?, 
                        xs2event_logistic_status = ?,
                        xs2event_distribution_channel = ?,
                        xs2event_booking_code = ?,
                        updated_at = NOW() 
                    WHERE id = ?";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([
                $status, 
                $logisticStatus, 
                $distributionChannel,
                $bookingCode,
                $bookingId
            ]);
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            throw new Exception("Failed to update XS2Event status: " . $e->getMessage());
        }
    }

    /**
     * Update e-ticket status
     * 
     * @param int $bookingId Local booking ID
     * @param string $status E-ticket status
     * @param string|null $availableDate Date when tickets became available
     * @return bool Success status
     */
    public function updateETicketStatus(int $bookingId, string $status, ?string $availableDate = null): bool
    {
        try {
            $sql = "UPDATE bookings 
                    SET eticket_status = ?, 
                        eticket_available_date = ?,
                        updated_at = NOW() 
                    WHERE id = ?";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$status, $availableDate, $bookingId]);
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            throw new Exception("Failed to update e-ticket status: " . $e->getMessage());
        }
    }

    /**
     * Get bookings without api_booking_id (not synced with XS2Event)
     * 
     * @param int $limit Maximum number of records
     * @return array List of unsynced bookings
     */
    public function getBookingsWithoutApiId(int $limit = 50): array
    {
        try {
            $sql = "SELECT 
                        b.*,
                        CONCAT(c.first_name, ' ', IFNULL(c.last_name, '')) as customer_name,
                        c.email as customer_email
                    FROM bookings b
                    LEFT JOIN customer_users c ON b.customer_user_id = c.id
                    WHERE b.api_booking_id IS NULL 
                      AND b.payment_status = 'succeeded'
                      AND b.status != 'cancelled'
                    ORDER BY b.created_at ASC
                    LIMIT ?";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$limit]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            throw new Exception("Failed to get bookings without API ID: " . $e->getMessage());
        }
    }

    /**
     * Get bookings ready for e-ticket download
     * 
     * @return array List of bookings with available tickets
     */
    public function getBookingsReadyForTickets(): array
    {
        try {
            $sql = "SELECT 
                        b.*,
                        CONCAT(c.first_name, ' ', IFNULL(c.last_name, '')) as customer_name,
                        c.email as customer_email
                    FROM bookings b
                    LEFT JOIN customer_users c ON b.customer_user_id = c.id
                    WHERE b.api_booking_id IS NOT NULL 
                      AND b.eticket_status = 'available'
                      AND b.payment_status = 'succeeded'
                    ORDER BY b.eticket_available_date DESC";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            throw new Exception("Failed to get bookings ready for tickets: " . $e->getMessage());
        }
    }

    /**
     * Update payment gateway data
     * 
     * @param int $bookingId Local booking ID
     * @param array $gatewayData Payment gateway data
     * @return bool Success status
     */
    public function updatePaymentGatewayData(int $bookingId, array $gatewayData): bool
    {
        try {
            $sql = "UPDATE bookings 
                    SET stripe_payment_method_id = ?,
                        stripe_customer_id = ?,
                        stripe_charge_id = ?,
                        payment_gateway_response = ?,
                        payment_gateway_fee = ?,
                        payment_completed_at = ?,
                        updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([
                $gatewayData['stripe_payment_method_id'] ?? null,
                $gatewayData['stripe_customer_id'] ?? null,
                $gatewayData['stripe_charge_id'] ?? null,
                $gatewayData['payment_gateway_response'] ?? null,
                $gatewayData['payment_gateway_fee'] ?? null,
                $gatewayData['payment_completed_at'] ?? null,
                $bookingId
            ]);
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            throw new Exception("Failed to update payment gateway data: " . $e->getMessage());
        }
    }

    /**
     * Update XS2Event sync attempt count
     * 
     * @param int $bookingId Local booking ID
     * @param int $attempts Number of sync attempts
     * @return bool Success status
     */
    public function updateXS2EventSyncAttempt(int $bookingId, int $attempts): bool
    {
        try {
            $sql = "UPDATE bookings 
                    SET xs2event_sync_attempts = ?,
                        updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$attempts, $bookingId]);
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            throw new Exception("Failed to update sync attempt count: " . $e->getMessage());
        }
    }

    /**
     * Update XS2Event error message
     * 
     * @param int $bookingId Local booking ID
     * @param string $errorMessage Error message
     * @return bool Success status
     */
    public function updateXS2EventError(int $bookingId, string $errorMessage): bool
    {
        try {
            $sql = "UPDATE bookings 
                    SET xs2event_last_error = ?,
                        updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$errorMessage, $bookingId]);
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            throw new Exception("Failed to update XS2Event error: " . $e->getMessage());
        }
    }

    /**
     * Update XS2Event response data
     * 
     * @param int $bookingId Local booking ID
     * @param string $responseData JSON response from XS2Event
     * @return bool Success status
     */
    public function updateXS2EventResponseData(int $bookingId, string $responseData): bool
    {
        try {
            $sql = "UPDATE bookings 
                    SET xs2event_response_data = ?,
                        updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$responseData, $bookingId]);
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            throw new Exception("Failed to update XS2Event response data: " . $e->getMessage());
        }
    }

    /**
     * Update XS2Event synced_at timestamp
     * 
     * @param int $bookingId Local booking ID
     * @return bool Success status
     */
    public function updateXS2EventSyncedAt(int $bookingId): bool
    {
        try {
            $sql = "UPDATE bookings 
                    SET xs2event_synced_at = NOW(),
                        updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$bookingId]);
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            throw new Exception("Failed to update XS2Event sync timestamp: " . $e->getMessage());
        }
    }

    /**
     * Update e-ticket URLs and metadata
     * 
     * @param int $bookingId Local booking ID
     * @param array $ticketData E-ticket data from XS2Event
     * @return bool Success status
     */
    public function updateETicketData(int $bookingId, array $ticketData): bool
    {
        try {
            $sql = "UPDATE bookings 
                    SET eticket_urls = ?,
                        zip_download_url = ?,
                        ticket_sha_checksums = ?,
                        eticket_status = 'available',
                        eticket_available_date = NOW(),
                        updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([
                json_encode($ticketData['ticket_urls'] ?? []),
                $ticketData['zip_url'] ?? null,
                json_encode($ticketData['checksums'] ?? []),
                $bookingId
            ]);
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            throw new Exception("Failed to update e-ticket data: " . $e->getMessage());
        }
    }

    /**
     * Log download attempt
     * 
     * @param int $bookingId Local booking ID
     * @param bool $success Whether download was successful
     * @param string|null $errorMessage Error message if failed
     * @return bool Success status
     */
    public function logDownloadAttempt(int $bookingId, bool $success, ?string $errorMessage = null): bool
    {
        try {
            if ($success) {
                $sql = "UPDATE bookings 
                        SET download_count = download_count + 1,
                            first_downloaded_at = COALESCE(first_downloaded_at, NOW()),
                            last_download_attempt = NOW(),
                            download_error_message = NULL,
                            updated_at = NOW()
                        WHERE id = ?";
                
                $stmt = $this->db->getConnection()->prepare($sql);
                $stmt->execute([$bookingId]);
            } else {
                $sql = "UPDATE bookings 
                        SET last_download_attempt = NOW(),
                            download_error_message = ?,
                            updated_at = NOW()
                        WHERE id = ?";
                
                $stmt = $this->db->getConnection()->prepare($sql);
                $stmt->execute([$errorMessage, $bookingId]);
            }
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            throw new Exception("Failed to log download attempt: " . $e->getMessage());
        }
    }

    /**
     * Get bookings count for today
     */
    public function getBookingsToday(): int
    {
        try {
            $sql = "
                SELECT COUNT(*) as count
                FROM bookings
                WHERE DATE(booking_date) = CURDATE()
                AND status IN ('confirmed', 'pending')
            ";

            $stmt = $this->db->getConnection()->query($sql);
            return (int)$stmt->fetchColumn();

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching today's bookings: " . $e->getMessage());
        }
    }

    /**
     * Get bookings count for yesterday
     */
    public function getBookingsYesterday(): int
    {
        try {
            $sql = "
                SELECT COUNT(*) as count
                FROM bookings
                WHERE DATE(booking_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
                AND status IN ('confirmed', 'pending')
            ";

            $stmt = $this->db->getConnection()->query($sql);
            return (int)$stmt->fetchColumn();

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching yesterday's bookings: " . $e->getMessage());
        }
    }

    /**
     * Get bookings count for this week (last 7 days)
     */
    public function getBookingsThisWeek(): int
    {
        try {
            $sql = "
                SELECT COUNT(*) as count
                FROM bookings
                WHERE booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                AND status IN ('confirmed', 'pending')
            ";

            $stmt = $this->db->getConnection()->query($sql);
            return (int)$stmt->fetchColumn();

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching this week's bookings: " . $e->getMessage());
        }
    }

    /**
     * Get bookings count for previous week (8-14 days ago)
     */
    public function getBookingsPreviousWeek(): int
    {
        try {
            $sql = "
                SELECT COUNT(*) as count
                FROM bookings
                WHERE booking_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
                AND booking_date < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                AND status IN ('confirmed', 'pending')
            ";

            $stmt = $this->db->getConnection()->query($sql);
            return (int)$stmt->fetchColumn();

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching previous week's bookings: " . $e->getMessage());
        }
    }

    /**
     * Get bookings count for this month
     */
    public function getBookingsThisMonth(): int
    {
        try {
            $sql = "
                SELECT COUNT(*) as count
                FROM bookings
                WHERE MONTH(booking_date) = MONTH(CURDATE())
                AND YEAR(booking_date) = YEAR(CURDATE())
                AND status IN ('confirmed', 'pending')
            ";

            $stmt = $this->db->getConnection()->query($sql);
            return (int)$stmt->fetchColumn();

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching this month's bookings: " . $e->getMessage());
        }
    }

    /**
     * Get bookings count for previous month
     */
    public function getBookingsPreviousMonth(): int
    {
        try {
            $sql = "
                SELECT COUNT(*) as count
                FROM bookings
                WHERE MONTH(booking_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
                AND YEAR(booking_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
                AND status IN ('confirmed', 'pending')
            ";

            $stmt = $this->db->getConnection()->query($sql);
            return (int)$stmt->fetchColumn();

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching previous month's bookings: " . $e->getMessage());
        }
    }

    /**
     * Get bookings trend data for chart (last N days)
     * 
     * @param int $days Number of days to include (default 30)
     * @return array Array of ['date' => 'YYYY-MM-DD', 'count' => int]
     */
    public function getBookingsTrend(int $days = 30): array
    {
        try {
            $sql = "
                SELECT 
                    DATE(booking_date) as date,
                    COUNT(*) as count
                FROM bookings
                WHERE booking_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                AND status IN ('confirmed', 'pending')
                GROUP BY DATE(booking_date)
                ORDER BY date ASC
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$days]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Convert count to integer
            foreach ($results as &$row) {
                $row['count'] = (int)$row['count'];
            }

            return $results;

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching bookings trend: " . $e->getMessage());
        }
    }

    /**
     * Get revenue trend data for chart (last N days)
     * 
     * @param int $days Number of days to include (default 30)
     * @return array Array of ['date' => 'YYYY-MM-DD', 'amount' => float]
     */
    public function getRevenueTrend(int $days = 30): array
    {
        try {
            $sql = "
                SELECT 
                    DATE(booking_date) as date,
                    SUM(total_amount) as amount
                FROM bookings
                WHERE booking_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                AND status = 'confirmed'
                AND payment_status = 'completed'
                GROUP BY DATE(booking_date)
                ORDER BY date ASC
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$days]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Convert amount to float
            foreach ($results as &$row) {
                $row['amount'] = (float)($row['amount'] ?? 0);
            }

            return $results;

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching revenue trend: " . $e->getMessage());
        }
    }

    /**
     * Get top events by booking count
     * 
     * @param int $limit Maximum number of events to return (default 5)
     * @return array Array of ['name' => string, 'bookings' => int]
     */
    public function getTopEventsByBookings(int $limit = 5): array
    {
        try {
            $sql = "
                SELECT 
                    event_name as name,
                    COUNT(*) as bookings
                FROM bookings
                WHERE status IN ('confirmed', 'pending')
                AND event_name IS NOT NULL
                AND event_name != ''
                GROUP BY event_name
                ORDER BY bookings DESC
                LIMIT ?
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$limit]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Convert bookings count to integer
            foreach ($results as &$row) {
                $row['bookings'] = (int)$row['bookings'];
            }

            return $results;

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching top events: " . $e->getMessage());
        }
    }

    /**
     * Get recent activities (bookings, refunds, cancellations)
     * 
     * @param int $limit Maximum number of activities to return (default 10)
     * @return array Array of activity items with type, title, description, time, icon
     */
    public function getRecentActivities(int $limit = 10): array
    {
        try {
            // Get recent bookings
            $sql = "
                (
                    SELECT 
                        CONCAT('BK-', b.id) as id,
                        'booking' as type,
                        'New Booking' as title,
                        CONCAT('Booking #', b.booking_reference, ' for ', b.event_name) as description,
                        b.created_at as time,
                        '🎫' as icon
                    FROM bookings b
                    WHERE b.status = 'confirmed'
                    ORDER BY b.created_at DESC
                    LIMIT ?
                )
                UNION ALL
                (
                    SELECT 
                        CONCAT('RF-', b.id) as id,
                        'refund' as type,
                        'Refund Processed' as title,
                        CONCAT('Refund for Booking #', b.booking_reference, ' - $', ROUND(b.total_amount, 2)) as description,
                        COALESCE(b.cancelled_at, b.updated_at) as time,
                        '💰' as icon
                    FROM bookings b
                    WHERE b.status = 'refunded'
                    ORDER BY COALESCE(b.cancelled_at, b.updated_at) DESC
                    LIMIT ?
                )
                UNION ALL
                (
                    SELECT 
                        CONCAT('CL-', b.id) as id,
                        'cancellation' as type,
                        'Booking Cancelled' as title,
                        CONCAT('Booking #', b.booking_reference, ' was cancelled') as description,
                        COALESCE(b.cancelled_at, b.updated_at) as time,
                        '❌' as icon
                    FROM bookings b
                    WHERE b.status = 'cancelled'
                    ORDER BY COALESCE(b.cancelled_at, b.updated_at) DESC
                    LIMIT ?
                )
                ORDER BY time DESC
                LIMIT ?
            ";

            $limitPerType = (int)ceil($limit / 2); // Get more items per type to ensure we have enough after sorting
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$limitPerType, $limitPerType, $limitPerType, $limit]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching recent activities: " . $e->getMessage());
        }
    }

    /**
     * Get revenue grouped by month for a date range
     * 
     * @param string $startDate Start date (YYYY-MM-DD)
     * @param string $endDate End date (YYYY-MM-DD)
     * @return array Monthly revenue data
     */
    public function getRevenueByMonth(string $startDate, string $endDate): array
    {
        try {
            $sql = "
                SELECT 
                    DATE_FORMAT(booking_date, '%Y-%m') as month,
                    SUM(total_amount) as revenue,
                    COUNT(*) as bookings
                FROM bookings
                WHERE booking_date BETWEEN :start_date AND :end_date
                    AND status IN ('confirmed', 'refunded')
                    AND payment_status = 'completed'
                GROUP BY DATE_FORMAT(booking_date, '%Y-%m')
                ORDER BY month ASC
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format revenue as float
            return array_map(function($row) {
                return [
                    'month' => $row['month'],
                    'revenue' => (float)$row['revenue'],
                    'bookings' => (int)$row['bookings']
                ];
            }, $results);

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching revenue by month: " . $e->getMessage());
        }
    }

    /**
     * Get booking statistics for a specific date range
     * 
     * @param string $startDate Start date (YYYY-MM-DD)
     * @param string $endDate End date (YYYY-MM-DD)
     * @return array Statistics for the date range
     */
    public function getBookingStatsForDateRange(string $startDate, string $endDate): array
    {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_bookings,
                    COUNT(CASE WHEN status = 'confirmed' AND (cancellation_status IS NULL OR cancellation_status = 'none' OR cancellation_status = '') THEN 1 END) as confirmed_bookings,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
                    COUNT(CASE WHEN status IN ('cancelled', 'refunded') OR cancellation_status IN ('approved', 'cancelled') THEN 1 END) as cancelled_bookings,
                    COUNT(CASE WHEN status = 'refunded' OR (cancellation_status = 'approved' AND refund_amount > 0) THEN 1 END) as refunded_bookings,
                    SUM(CASE WHEN status IN ('confirmed', 'refunded') AND payment_status = 'completed' THEN total_amount ELSE 0 END) as total_revenue,
                    AVG(CASE WHEN status = 'confirmed' AND payment_status = 'completed' THEN total_amount ELSE NULL END) as avg_booking_value
                FROM bookings
                WHERE booking_date BETWEEN :start_date AND :end_date
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return [
                'total_bookings' => (int)$result['total_bookings'],
                'confirmed_bookings' => (int)$result['confirmed_bookings'],
                'pending_bookings' => (int)$result['pending_bookings'],
                'cancelled_bookings' => (int)$result['cancelled_bookings'],
                'refunded_bookings' => (int)$result['refunded_bookings'],
                'total_revenue' => (float)$result['total_revenue'],
                'avg_booking_value' => $result['avg_booking_value'] ? (float)$result['avg_booking_value'] : 0.0
            ];

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching booking stats for date range: " . $e->getMessage());
        }
    }

    /**
     * Get revenue statistics for a specific date range
     * 
     * @param string $startDate Start date (YYYY-MM-DD)
     * @param string $endDate End date (YYYY-MM-DD)
     * @return array Revenue statistics
     */
    public function getRevenueStatsForDateRange(string $startDate, string $endDate): array
    {
        try {
            $sql = "
                SELECT 
                    COUNT(CASE WHEN status IN ('confirmed', 'pending', 'refunded', 'cancelled') THEN 1 END) as total_bookings,
                    SUM(CASE WHEN status IN ('confirmed', 'refunded') AND payment_status = 'completed' THEN total_amount ELSE 0 END) as total_revenue,
                    AVG(CASE WHEN status = 'confirmed' AND payment_status = 'completed' THEN total_amount ELSE NULL END) as avg_order_value,
                    COUNT(CASE WHEN status = 'refunded' OR (cancellation_status = 'approved' AND refund_amount IS NOT NULL AND refund_amount > 0) THEN 1 END) as refunded_bookings,
                    SUM(CASE WHEN status = 'refunded' THEN total_amount WHEN cancellation_status = 'approved' AND refund_amount IS NOT NULL THEN refund_amount ELSE 0 END) as refunded_amount
                FROM bookings
                WHERE booking_date BETWEEN :start_date AND :end_date
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $totalBookings = (int)$result['total_bookings'];
            $refundedBookings = (int)$result['refunded_bookings'];
            $refundRate = $totalBookings > 0 ? ($refundedBookings / $totalBookings) * 100 : 0;
            
            return [
                'total_bookings' => $totalBookings,
                'total_revenue' => (float)$result['total_revenue'],
                'avg_order_value' => $result['avg_order_value'] ? (float)$result['avg_order_value'] : 0.0,
                'refunded_bookings' => $refundedBookings,
                'refunded_amount' => (float)$result['refunded_amount'],
                'refund_rate' => round($refundRate, 2)
            ];

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching revenue stats for date range: " . $e->getMessage());
        }
    }

    /**
     * Get event performance data (bookings + revenue per event)
     * 
     * @param int $limit Number of events to return
     * @param string|null $startDate Optional start date filter
     * @param string|null $endDate Optional end date filter
     * @return array Event performance metrics
     */
    public function getEventPerformance(int $limit = 10, ?string $startDate = null, ?string $endDate = null): array
    {
        try {
            $sql = "
                SELECT 
                    event_name as name,
                    COUNT(*) as bookings,
                    SUM(CASE WHEN status IN ('confirmed', 'refunded') AND payment_status = 'completed' THEN total_amount ELSE 0 END) as revenue,
                    MIN(event_date) as earliest_date,
                    MAX(event_date) as latest_date
                FROM bookings
                WHERE status IN ('confirmed', 'pending', 'refunded')
                    AND event_name IS NOT NULL
                    AND event_name != ''
            ";

            $params = [];
            
            if ($startDate && $endDate) {
                $sql .= " AND booking_date BETWEEN :start_date AND :end_date";
                $params['start_date'] = $startDate;
                $params['end_date'] = $endDate;
            }
            
            $sql .= "
                GROUP BY event_name
                ORDER BY bookings DESC, revenue DESC
                LIMIT :limit
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            
            $stmt->execute();
            
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return array_map(function($row) {
                return [
                    'name' => $row['name'],
                    'bookings' => (int)$row['bookings'],
                    'revenue' => (float)$row['revenue']
                ];
            }, $results);

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching event performance: " . $e->getMessage());
        }
    }

    /**
     * Update cancellation status of a booking
     * 
     * @param int $bookingId Booking ID
     * @param string $cancellationStatus Cancellation status
     * @param string|null $cancellationDate Cancellation date
     * @return bool Success status
     */
    public function updateCancellationStatus(int $bookingId, string $cancellationStatus, ?string $cancellationDate = null): bool
    {
        try {
            $sql = "
                UPDATE bookings 
                SET cancellation_status = ?,
                    cancellation_date = ?
                WHERE id = ?
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            return $stmt->execute([
                $cancellationStatus,
                $cancellationDate,
                $bookingId
            ]);

        } catch (PDOException $e) {
            throw new Exception("Database error while updating cancellation status: " . $e->getMessage());
        }
    }

    /**
     * Get booking with cancellation request details
     * 
     * @param int $bookingId Booking ID
     * @return array|null Booking with cancellation data
     */
    public function getBookingWithCancellationRequest(int $bookingId): ?array
    {
        try {
            $sql = "
                SELECT 
                    b.*,
                    c.first_name,
                    c.last_name,
                    c.email,
                    c.phone,
                    cr.id as cancellation_request_id,
                    cr.status as cancellation_request_status,
                    cr.request_date,
                    cr.cancellation_reason,
                    cr.customer_notes,
                    cr.admin_notes,
                    cr.refund_amount,
                    cr.refund_status
                FROM bookings b
                LEFT JOIN customer_users c ON b.customer_user_id = c.id
                LEFT JOIN booking_cancellation_requests cr ON b.id = cr.booking_id
                WHERE b.id = ?
                ORDER BY cr.created_at DESC
                LIMIT 1
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([$bookingId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            return $result ?: null;

        } catch (PDOException $e) {
            throw new Exception("Database error while fetching booking with cancellation: " . $e->getMessage());
        }
    }

    /**
     * Check if booking is eligible for cancellation
     * 
     * @param int $bookingId Booking ID
     * @return array Eligibility status and reason
     */
    public function checkCancellationEligibility(int $bookingId): array
    {
        try {
            $booking = $this->getBookingById($bookingId);

            if (!$booking) {
                return [
                    'eligible' => false,
                    'reason' => 'Booking not found'
                ];
            }

            // Check if already cancelled
            if (in_array($booking['cancellation_status'], ['cancelled', 'approved'])) {
                return [
                    'eligible' => false,
                    'reason' => 'Booking is already cancelled or cancellation approved'
                ];
            }

            // Check if event date has passed
            if (!empty($booking['event_date'])) {
                $eventDate = strtotime($booking['event_date']);
                if ($eventDate < time()) {
                    return [
                        'eligible' => false,
                        'reason' => 'Event date has already passed'
                    ];
                }
            }

            // Check booking status
            if (!in_array($booking['status'], ['confirmed', 'pending'])) {
                return [
                    'eligible' => false,
                    'reason' => 'Booking status does not allow cancellation'
                ];
            }

            return [
                'eligible' => true,
                'reason' => null,
                'booking' => $booking
            ];

        } catch (PDOException $e) {
            throw new Exception("Database error while checking cancellation eligibility: " . $e->getMessage());
        }
    }

    /**
     * Update refund details for a booking
     * 
     * @param int $bookingId Booking ID
     * @param string $refundId Stripe refund ID (re_xxx)
     * @param float $refundAmount Amount refunded
     * @param string $refundReason Reason for refund
     * @param string $paymentStatus New payment status (refunded or partially_refunded)
     * @param string $adminNotes Admin notes about the refund
     * @return bool Success status
     */
    public function updateRefundDetails(
        int $bookingId,
        string $refundId,
        float $refundAmount,
        string $refundReason,
        string $paymentStatus,
        string $adminNotes = ''
    ): bool {
        try {
            $this->db->getConnection()->beginTransaction();

            // Get current refund amount if any
            $currentBooking = $this->findById($bookingId);
            $totalRefunded = ($currentBooking['refund_amount'] ?? 0) + $refundAmount;

            $sql = "UPDATE bookings 
                    SET refund_id = :refund_id,
                        refund_amount = :refund_amount,
                        refund_reason = :refund_reason,
                        refunded_at = NOW(),
                        payment_status = :payment_status,
                        admin_notes = CONCAT(COALESCE(admin_notes, ''), '\n[Refund] ', :admin_notes),
                        updated_at = NOW()
                    WHERE id = :booking_id";

            $stmt = $this->db->getConnection()->prepare($sql);
            $success = $stmt->execute([
                ':refund_id' => $refundId,
                ':refund_amount' => $totalRefunded,
                ':refund_reason' => $refundReason,
                ':payment_status' => $paymentStatus,
                ':admin_notes' => $adminNotes,
                ':booking_id' => $bookingId
            ]);

            if ($success && $stmt->rowCount() > 0) {
                $this->db->getConnection()->commit();
                return true;
            }

            $this->db->getConnection()->rollBack();
            return false;

        } catch (PDOException $e) {
            if ($this->db->getConnection()->inTransaction()) {
                $this->db->getConnection()->rollBack();
            }
            throw new Exception("Failed to update refund details: " . $e->getMessage());
        }
    }

    /**
     * Check if a booking is eligible for refund
     * 
     * @param int $bookingId Booking ID
     * @return array Eligibility status with reason
     */
    public function checkRefundEligibility(int $bookingId): array
    {
        try {
            $booking = $this->findById($bookingId);

            if (!$booking) {
                return [
                    'eligible' => false,
                    'reason' => 'Booking not found'
                ];
            }

            // Check if payment is completed
            if ($booking['payment_status'] !== 'completed' && $booking['payment_status'] !== 'partially_refunded') {
                return [
                    'eligible' => false,
                    'reason' => 'Payment not completed or already fully refunded'
                ];
            }

            // Check if already fully refunded
            if ($booking['payment_status'] === 'refunded') {
                return [
                    'eligible' => false,
                    'reason' => 'Booking already fully refunded'
                ];
            }

            // Check if payment intent exists
            if (empty($booking['payment_intent_id'])) {
                return [
                    'eligible' => false,
                    'reason' => 'No payment intent found for this booking'
                ];
            }

            // Calculate available refund amount
            $totalAmount = (float)$booking['total_amount'];
            $refundedAmount = (float)($booking['refund_amount'] ?? 0);
            $availableAmount = $totalAmount - $refundedAmount;

            if ($availableAmount <= 0) {
                return [
                    'eligible' => false,
                    'reason' => 'No amount available for refund'
                ];
            }

            return [
                'eligible' => true,
                'reason' => null,
                'booking' => $booking,
                'available_amount' => $availableAmount,
                'total_amount' => $totalAmount,
                'refunded_amount' => $refundedAmount
            ];

        } catch (PDOException $e) {
            throw new Exception("Database error while checking refund eligibility: " . $e->getMessage());
        }
    }

    /**
     * Update booking with refund data
     * 
     * @param int $bookingId Booking ID
     * @param array $refundData Refund data from Stripe
     * @return bool Success status
     */
    public function updateRefundData(int $bookingId, array $refundData): bool
    {
        try {
            $conn = $this->db->getConnection();
            
            // Get current refund amount
            $stmt = $conn->prepare("SELECT refund_amount FROM bookings WHERE id = ?");
            $stmt->execute([$bookingId]);
            $currentRefundAmount = (float)($stmt->fetchColumn() ?: 0);
            
            // Calculate new total refund amount
            $newRefundAmount = $currentRefundAmount + ($refundData['amount'] / 100); // Convert from cents
            
            // Determine new payment status
            $stmt = $conn->prepare("SELECT total_amount FROM bookings WHERE id = ?");
            $stmt->execute([$bookingId]);
            $totalAmount = (float)$stmt->fetchColumn();
            
            $paymentStatus = 'partially_refunded';
            if ($newRefundAmount >= $totalAmount) {
                $paymentStatus = 'refunded';
            }
            
            // Update booking with refund data
            $sql = "UPDATE bookings SET 
                    refund_id = ?,
                    refund_amount = ?,
                    refund_reason = ?,
                    refunded_at = NOW(),
                    payment_status = ?,
                    updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $conn->prepare($sql);
            $result = $stmt->execute([
                $refundData['id'],
                $newRefundAmount,
                $refundData['reason'] ?? null,
                $paymentStatus,
                $bookingId
            ]);
            
            return $result;
            
        } catch (PDOException $e) {
            throw new Exception("Database error while updating refund data: " . $e->getMessage());
        }
    }
}