<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use Psr\Log\LoggerInterface;
use PDO;
use Exception;

class CustomerRepository
{
    private DatabaseService $db;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $db, LoggerInterface $logger)
    {
        $this->db = $db;
        $this->logger = $logger;
    }

    /**
     * Find customer by email
     */
    public function findByEmail(string $email): ?array
    {
        try {
            $stmt = $this->db->getConnection()->prepare(
                "SELECT * FROM customer_users WHERE email = :email LIMIT 1"
            );
            $stmt->execute(['email' => $email]);
            
            $customer = $stmt->fetch(PDO::FETCH_ASSOC);
            return $customer ?: null;
        } catch (Exception $e) {
            $this->logger->error('Error finding customer by email', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Find customer by customer ID
     */
    public function findByCustomerId(string $customerId): ?array
    {
        try {
            $stmt = $this->db->getConnection()->prepare(
                "SELECT * FROM customer_users WHERE customer_id = :customer_id LIMIT 1"
            );
            $stmt->execute(['customer_id' => $customerId]);
            
            $customer = $stmt->fetch(PDO::FETCH_ASSOC);
            return $customer ?: null;
        } catch (Exception $e) {
            $this->logger->error('Error finding customer by customer ID', [
                'customer_id' => $customerId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Find customer by ID
     */
    public function findById(int $id): ?array
    {
        try {
            $stmt = $this->db->getConnection()->prepare(
                "SELECT * FROM customer_users WHERE id = :id LIMIT 1"
            );
            $stmt->execute(['id' => $id]);
            
            $customer = $stmt->fetch(PDO::FETCH_ASSOC);
            return $customer ?: null;
        } catch (Exception $e) {
            $this->logger->error('Error finding customer by ID', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Create new customer
     */
    public function create(array $customerData): int
    {
        try {
            // Generate unique customer ID
            $customerId = $this->generateCustomerId();

            $stmt = $this->db->getConnection()->prepare(
                "INSERT INTO customer_users (
                    customer_id, first_name, last_name, email, phone, password_hash, 
                    street, house_number, zipcode, city, country_code, 
                    status, email_verified, marketing_consent, created_at, updated_at
                ) VALUES (
                    :customer_id, :first_name, :last_name, :email, :phone, :password_hash,
                    :street, :house_number, :zipcode, :city, :country_code,
                    :status, :email_verified, :marketing_consent, NOW(), NOW()
                )"
            );

            $params = [
                'customer_id' => $customerId,
                'first_name' => $customerData['first_name'],
                'last_name' => $customerData['last_name'],
                'email' => $customerData['email'],
                'phone' => $customerData['phone'] ?? null,
                'password_hash' => $customerData['password_hash'],
                'street' => $customerData['street'] ?? null,
                'house_number' => $customerData['house_number'] ?? null,
                'zipcode' => $customerData['zipcode'] ?? null,
                'city' => $customerData['city'] ?? null,
                'country_code' => $customerData['country_code'] ?? null,
                'status' => $customerData['status'] ?? 'pending_verification',
                'email_verified' => ($customerData['email_verified'] ?? false) ? 1 : 0,
                'marketing_consent' => ($customerData['marketing_consent'] ?? false) ? 1 : 0
            ];

            $stmt->execute($params);
            $customerId = (int)$this->db->getConnection()->lastInsertId();

            $this->logger->info('Customer created successfully', [
                'customer_id' => $customerId,
                'email' => $customerData['email']
            ]);

            return $customerId;
        } catch (Exception $e) {
            $this->logger->error('Error creating customer', [
                'customer_data' => array_diff_key($customerData, ['password_hash' => '']),
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Update customer information
     */
    public function update(int $id, array $customerData): bool
    {
        try {
            $updateFields = [];
            $params = ['id' => $id];

            // Build dynamic update query based on provided fields (only existing database fields)
            $allowedFields = [
                'first_name', 'last_name', 'email', 'phone', 'street', 'house_number',
                'zipcode', 'city', 'country_code', 'status', 'email_verified', 
                'marketing_consent', 'notes', 'blocked_reason', 'blocked_by', 
                'blocked_at', 'last_login', 'failed_login_attempts', 'locked_until', 
                'email_verification_token', 'password_reset_token', 'password_reset_expires', 
                'password_hash', 'two_factor_enabled', 'two_factor_secret', 'date_of_birth', 'gender'
            ];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $customerData)) {
                    $updateFields[] = "$field = :$field";
                    
                    // Convert boolean fields to integers to avoid MySQL errors
                    if (in_array($field, ['email_verified', 'marketing_consent', 'two_factor_enabled'])) {
                        $params[$field] = $customerData[$field] ? 1 : 0;
                    } else {
                        $params[$field] = $customerData[$field];
                    }
                }
            }

            if (empty($updateFields)) {
                return true; // No fields to update
            }

            $updateFields[] = "updated_at = NOW()";

            $sql = "UPDATE customer_users SET " . implode(', ', $updateFields) . " WHERE id = :id";
            $stmt = $this->db->getConnection()->prepare($sql);
            
            $result = $stmt->execute($params);

            $this->logger->info('Customer updated successfully', [
                'customer_id' => $id,
                'updated_fields' => array_keys(array_diff_key($customerData, ['password_hash' => '']))
            ]);

            return $result;
        } catch (Exception $e) {
            $this->logger->error('Error updating customer', [
                'customer_id' => $id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get customers with pagination and filters
     */
    public function getCustomers(array $filters = [], int $page = 1, int $limit = 20): array
    {
        try {
            $offset = ($page - 1) * $limit;
            $whereConditions = [];
            $params = [];

            // Build WHERE conditions based on filters
            if (!empty($filters['search'])) {
                $whereConditions[] = "(CONCAT(first_name, ' ', last_name) LIKE :search OR email LIKE :search OR customer_id LIKE :search)";
                $params['search'] = '%' . $filters['search'] . '%';
            }

            if (!empty($filters['status'])) {
                $whereConditions[] = "status = :status";
                $params['status'] = $filters['status'];
            }

            if (!empty($filters['email_verified'])) {
                $whereConditions[] = "email_verified = :email_verified";
                $params['email_verified'] = $filters['email_verified'] === 'true' ? 1 : 0;
            }

            if (!empty($filters['created_from'])) {
                $whereConditions[] = "created_at >= :created_from";
                $params['created_from'] = $filters['created_from'];
            }

            if (!empty($filters['created_to'])) {
                $whereConditions[] = "created_at <= :created_to";
                $params['created_to'] = $filters['created_to'];
            }

            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
            
            // Order by
            $orderBy = 'ORDER BY created_at DESC';
            if (!empty($filters['sort_by'])) {
                $allowedSortFields = ['first_name', 'last_name', 'email', 'created_at', 'last_login', 'total_bookings', 'total_spent'];
                if (in_array($filters['sort_by'], $allowedSortFields)) {
                    $sortDirection = (!empty($filters['sort_direction']) && $filters['sort_direction'] === 'asc') ? 'ASC' : 'DESC';
                    $orderBy = "ORDER BY {$filters['sort_by']} $sortDirection";
                }
            }

            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM customer_users $whereClause";
            $countStmt = $this->db->getConnection()->prepare($countSql);
            $countStmt->execute($params);
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get customers
            $sql = "SELECT 
                        id, customer_id, first_name, last_name, email, phone, status, 
                        total_bookings, total_spent, average_booking_value,
                        last_booking_at, first_booking_at, email_verified,
                        marketing_consent, created_at, updated_at, last_login,
                        street, house_number, zipcode, city, country_code, failed_login_attempts
                    FROM customer_users 
                    $whereClause 
                    $orderBy 
                    LIMIT :limit OFFSET :offset";

            $params['limit'] = $limit;
            $params['offset'] = $offset;

            $stmt = $this->db->getConnection()->prepare($sql);
            
            // Bind parameters with correct types
            foreach ($params as $key => $value) {
                if (in_array($key, ['limit', 'offset'])) {
                    $stmt->bindValue(":$key", $value, PDO::PARAM_INT);
                } else {
                    $stmt->bindValue(":$key", $value);
                }
            }

            $stmt->execute();
            $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'customers' => $customers,
                'total' => (int)$totalCount,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($totalCount / $limit)
            ];
        } catch (Exception $e) {
            $this->logger->error('Error fetching customers', [
                'filters' => $filters,
                'page' => $page,
                'limit' => $limit,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Update customer status
     */
    public function updateStatus(int $id, string $status, ?int $adminId = null, ?string $reason = null): bool
    {
        try {
            $updateData = [
                'status' => $status,
                'updated_at' => date('Y-m-d H:i:s')
            ];

            if ($status === 'blocked' && $adminId) {
                $updateData['blocked_by'] = $adminId;
                $updateData['blocked_at'] = date('Y-m-d H:i:s');
                if ($reason) {
                    $updateData['blocked_reason'] = $reason;
                }
            } elseif ($status === 'active') {
                // Clear blocking information when activating
                $updateData['blocked_by'] = null;
                $updateData['blocked_at'] = null;
                $updateData['blocked_reason'] = null;
                $updateData['failed_login_attempts'] = 0;
                $updateData['locked_until'] = null;
            }

            return $this->update($id, $updateData);
        } catch (Exception $e) {
            $this->logger->error('Error updating customer status', [
                'customer_id' => $id,
                'status' => $status,
                'admin_id' => $adminId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get customer statistics for dashboard
     */
    public function getCustomerStats(): array
    {
        try {
            $stmt = $this->db->getConnection()->prepare(
                "SELECT 
                    COUNT(*) as total_customers,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_customers,
                    SUM(CASE WHEN status = 'pending_verification' THEN 1 ELSE 0 END) as pending_verification,
                    SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_customers,
                    SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_customers_30_days,
                    SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_customers_30_days,
                    AVG(total_spent) as average_customer_value,
                    SUM(total_spent) as total_revenue
                FROM customer_users 
                WHERE status != 'deleted'"
            );
            
            $stmt->execute();
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            return [
                'total_customers' => (int)$stats['total_customers'],
                'active_customers' => (int)$stats['active_customers'],
                'pending_verification' => (int)$stats['pending_verification'],
                'blocked_customers' => (int)$stats['blocked_customers'],
                'new_customers_30_days' => (int)$stats['new_customers_30_days'],
                'active_customers_30_days' => (int)$stats['active_customers_30_days'],
                'average_customer_value' => round((float)$stats['average_customer_value'], 2),
                'total_revenue' => round((float)$stats['total_revenue'], 2)
            ];
        } catch (Exception $e) {
            $this->logger->error('Error fetching customer statistics', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Generate unique customer ID
     */
    private function generateCustomerId(): string
    {
        do {
            $customerId = 'CUST' . str_pad((string)mt_rand(1, 99999999), 8, '0', STR_PAD_LEFT);
            $existing = $this->findByCustomerId($customerId);
        } while ($existing !== null);

        return $customerId;
    }

    /**
     * Record login attempt
     */
    public function recordLoginAttempt(string $email, bool $success, ?string $ipAddress = null): void
    {
        try {
            $customer = $this->findByEmail($email);
            if (!$customer) {
                return;
            }

            if ($success) {
                // Reset failed attempts and update last login
                $this->update((int)$customer['id'], [
                    'failed_login_attempts' => 0,
                    'locked_until' => null,
                    'last_login' => date('Y-m-d H:i:s')
                ]);
            } else {
                // Increment failed attempts
                $failedAttempts = (int)$customer['failed_login_attempts'] + 1;
                $updateData = ['failed_login_attempts' => $failedAttempts];

                // Lock account after 5 failed attempts
                if ($failedAttempts >= 5) {
                    $updateData['locked_until'] = date('Y-m-d H:i:s', strtotime('+1 hour'));
                }

                $this->update((int)$customer['id'], $updateData);
            }
        } catch (Exception $e) {
            $this->logger->error('Error recording login attempt', [
                'email' => $email,
                'success' => $success,
                'error' => $e->getMessage()
            ]);
            // Don't throw exception here as login attempts logging shouldn't break the main flow
        }
    }

    /**
     * Check if customer account is locked
     */
    public function isAccountLocked(string $email): bool
    {
        try {
            $customer = $this->findByEmail($email);
            if (!$customer) {
                return false;
            }

            if (!$customer['locked_until']) {
                return false;
            }

            return strtotime($customer['locked_until']) > time();
        } catch (Exception $e) {
            $this->logger->error('Error checking account lock status', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get country name by country code
     */
    public function getCountryName(string $countryCode): ?string
    {
        try {
            $stmt = $this->db->getConnection()->prepare(
                "SELECT country_name FROM countries WHERE country_code = ? AND country_status = 1 LIMIT 1"
            );
            $stmt->execute([$countryCode]);
            $country = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            return $country ? $country['country_name'] : null;
        } catch (Exception $e) {
            $this->logger->error('Error fetching country name', [
                'country_code' => $countryCode,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get all active countries
     */
    public function getAllCountries(): array
    {
        try {
            $stmt = $this->db->getConnection()->prepare(
                "SELECT country_code, country_name FROM countries WHERE country_status = 1 ORDER BY country_name ASC"
            );
            $stmt->execute();
            
            return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (Exception $e) {
            $this->logger->error('Error fetching countries', [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Get count of new customers in the last N days
     * 
     * @param int $days Number of days
     * @return int New customer count
     */
    public function getNewCustomersCount(int $days = 30): int
    {
        try {
            $sql = "
                SELECT COUNT(*) as new_customers
                FROM customer_users
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
                    AND status != 'deleted'
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->bindValue(':days', $days, \PDO::PARAM_INT);
            $stmt->execute();
            
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);
            return (int)$result['new_customers'];

        } catch (Exception $e) {
            $this->logger->error('Error fetching new customers count', [
                'error' => $e->getMessage(),
                'days' => $days
            ]);
            throw $e;
        }
    }

    /**
     * Get customer acquisition trend (monthly signups)
     * 
     * @param int $months Number of months to include
     * @return array Monthly signup data
     */
    public function getCustomerAcquisitionTrend(int $months = 6): array
    {
        try {
            $sql = "
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as date,
                    COUNT(*) as value
                FROM customer_users
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL :months MONTH)
                    AND status != 'deleted'
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY date ASC
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->bindValue(':months', $months, \PDO::PARAM_INT);
            $stmt->execute();
            
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            return array_map(function($row) {
                return [
                    'date' => $row['date'],
                    'value' => (int)$row['value']
                ];
            }, $results);

        } catch (Exception $e) {
            $this->logger->error('Error fetching customer acquisition trend', [
                'error' => $e->getMessage(),
                'months' => $months
            ]);
            throw $e;
        }
    }

    /**
     * Get customer booking frequency distribution
     * 
     * @return array Users grouped by booking count ranges
     */
    public function getCustomerBookingFrequency(): array
    {
        try {
            $sql = "
                SELECT 
                    CASE 
                        WHEN booking_count = 0 THEN 'No bookings'
                        WHEN booking_count = 1 THEN '1 booking'
                        WHEN booking_count BETWEEN 2 AND 3 THEN '2-3 bookings'
                        WHEN booking_count BETWEEN 4 AND 5 THEN '4-5 bookings'
                        ELSE '6+ bookings'
                    END as name,
                    COUNT(*) as value
                FROM (
                    SELECT 
                        c.id,
                        COUNT(b.id) as booking_count
                    FROM customer_users c
                    LEFT JOIN bookings b ON c.id = b.customer_user_id 
                        AND b.status IN ('confirmed', 'pending')
                    WHERE c.status != 'deleted'
                    GROUP BY c.id
                ) as customer_bookings
                GROUP BY name
                ORDER BY 
                    CASE name
                        WHEN 'No bookings' THEN 1
                        WHEN '1 booking' THEN 2
                        WHEN '2-3 bookings' THEN 3
                        WHEN '4-5 bookings' THEN 4
                        WHEN '6+ bookings' THEN 5
                    END
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute();
            
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            return array_map(function($row) {
                return [
                    'name' => $row['name'],
                    'value' => (int)$row['value']
                ];
            }, $results);

        } catch (Exception $e) {
            $this->logger->error('Error fetching customer booking frequency', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get customer statistics for a date range
     * 
     * @param string $startDate Start date
     * @param string $endDate End date
     * @return array Customer stats for date range
     */
    public function getCustomerStatsForDateRange(string $startDate, string $endDate): array
    {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
                    SUM(CASE WHEN status NOT IN ('active', 'deleted') THEN 1 ELSE 0 END) as inactive_users,
                    SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_users,
                    SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_users_30d,
                    SUM(CASE WHEN created_at BETWEEN :start_date_filter AND :end_date_filter THEN 1 ELSE 0 END) as new_users_in_period
                FROM customer_users
                WHERE created_at <= :end_date
                    AND status != 'deleted'
            ";

            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->execute([
                'start_date_filter' => $startDate,
                'end_date_filter' => $endDate,
                'end_date' => $endDate
            ]);
            
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            return [
                'total_users' => (int)$result['total_users'],
                'active_users' => (int)$result['active_users'],
                'inactive_users' => (int)$result['inactive_users'],
                'suspended_users' => (int)$result['suspended_users'],
                'new_users_30d' => (int)$result['new_users_30d'],
                'new_users_in_period' => (int)$result['new_users_in_period']
            ];

        } catch (Exception $e) {
            $this->logger->error('Error fetching customer stats for date range', [
                'error' => $e->getMessage(),
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            throw $e;
        }
    }
}