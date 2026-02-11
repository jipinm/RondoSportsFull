<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use PDO;
use PDOException;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\DatabaseException;

/**
 * Repository for currency data operations
 */
class CurrencyRepository
{
    private PDO $pdo;
    private LoggerInterface $logger;

    public function __construct(PDO $pdo, LoggerInterface $logger)
    {
        $this->pdo = $pdo;
        $this->logger = $logger;
    }

    /**
     * Get all currencies with optional filtering
     */
    public function findAll(array $filters = [], int $page = 1, int $limit = 50): array
    {
        try {
            $offset = ($page - 1) * $limit;
            $whereConditions = [];
            $params = [];

            // Build WHERE conditions based on filters
            if (isset($filters['is_active'])) {
                $whereConditions[] = 'is_active = :is_active';
                $params['is_active'] = (int) $filters['is_active'];
            }

            if (!empty($filters['search'])) {
                $whereConditions[] = '(code LIKE :search_code OR name LIKE :search_name)';
                $params['search_code'] = '%' . $filters['search'] . '%';
                $params['search_name'] = '%' . $filters['search'] . '%';
            }

            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

            // Get currencies
            $sql = "
                SELECT *
                FROM currencies
                {$whereClause}
                ORDER BY sort_order ASC, code ASC
                LIMIT :limit OFFSET :offset
            ";

            $stmt = $this->pdo->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $currencies = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count
            $countSql = "SELECT COUNT(*) FROM currencies {$whereClause}";
            $countStmt = $this->pdo->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue(':' . $key, $value);
            }
            $countStmt->execute();
            $total = (int) $countStmt->fetchColumn();

            return [
                'data' => $currencies,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ];
        } catch (PDOException $e) {
            $this->logger->error('Failed to fetch currencies', ['error' => $e->getMessage()]);
            throw new DatabaseException('Failed to fetch currencies: ' . $e->getMessage());
        }
    }

    /**
     * Get all active currencies (for public API)
     */
    public function findActive(): array
    {
        try {
            $sql = "
                SELECT id, code, name, symbol, is_default, sort_order
                FROM currencies
                WHERE is_active = 1
                ORDER BY sort_order ASC, code ASC
            ";

            $stmt = $this->pdo->query($sql);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $this->logger->error('Failed to fetch active currencies', ['error' => $e->getMessage()]);
            throw new DatabaseException('Failed to fetch active currencies: ' . $e->getMessage());
        }
    }

    /**
     * Get the default currency
     */
    public function findDefault(): ?array
    {
        try {
            $sql = "SELECT * FROM currencies WHERE is_default = 1 LIMIT 1";
            $stmt = $this->pdo->query($sql);
            $currency = $stmt->fetch(PDO::FETCH_ASSOC);
            return $currency ?: null;
        } catch (PDOException $e) {
            $this->logger->error('Failed to fetch default currency', ['error' => $e->getMessage()]);
            throw new DatabaseException('Failed to fetch default currency: ' . $e->getMessage());
        }
    }

    /**
     * Find a currency by ID
     */
    public function findById(int $id): ?array
    {
        try {
            $sql = "SELECT * FROM currencies WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $currency = $stmt->fetch(PDO::FETCH_ASSOC);
            return $currency ?: null;
        } catch (PDOException $e) {
            $this->logger->error('Failed to fetch currency by ID', ['id' => $id, 'error' => $e->getMessage()]);
            throw new DatabaseException('Failed to fetch currency: ' . $e->getMessage());
        }
    }

    /**
     * Find a currency by code
     */
    public function findByCode(string $code): ?array
    {
        try {
            $sql = "SELECT * FROM currencies WHERE code = :code";
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':code', strtoupper($code));
            $stmt->execute();
            $currency = $stmt->fetch(PDO::FETCH_ASSOC);
            return $currency ?: null;
        } catch (PDOException $e) {
            $this->logger->error('Failed to fetch currency by code', ['code' => $code, 'error' => $e->getMessage()]);
            throw new DatabaseException('Failed to fetch currency: ' . $e->getMessage());
        }
    }

    /**
     * Create a new currency
     */
    public function create(array $data): array
    {
        try {
            $sql = "
                INSERT INTO currencies (code, name, symbol, is_active, is_default, sort_order, created_by)
                VALUES (:code, :name, :symbol, :is_active, :is_default, :sort_order, :created_by)
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                'code' => strtoupper($data['code']),
                'name' => $data['name'],
                'symbol' => $data['symbol'],
                'is_active' => $data['is_active'] ?? true,
                'is_default' => $data['is_default'] ?? false,
                'sort_order' => $data['sort_order'] ?? 0,
                'created_by' => $data['created_by'] ?? null
            ]);

            $id = (int) $this->pdo->lastInsertId();
            return $this->findById($id);
        } catch (PDOException $e) {
            $this->logger->error('Failed to create currency', ['data' => $data, 'error' => $e->getMessage()]);
            throw new DatabaseException('Failed to create currency: ' . $e->getMessage());
        }
    }

    /**
     * Update a currency
     */
    public function update(int $id, array $data): array
    {
        try {
            $fields = [];
            $params = ['id' => $id];

            $allowedFields = ['code', 'name', 'symbol', 'is_active', 'is_default', 'sort_order', 'updated_by'];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $data)) {
                    $fields[] = "{$field} = :{$field}";
                    $value = $data[$field];
                    if ($field === 'code') {
                        $value = strtoupper($value);
                    }
                    $params[$field] = $value;
                }
            }

            if (empty($fields)) {
                return $this->findById($id);
            }

            $sql = "UPDATE currencies SET " . implode(', ', $fields) . " WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);

            return $this->findById($id);
        } catch (PDOException $e) {
            $this->logger->error('Failed to update currency', ['id' => $id, 'data' => $data, 'error' => $e->getMessage()]);
            throw new DatabaseException('Failed to update currency: ' . $e->getMessage());
        }
    }

    /**
     * Delete a currency
     */
    public function delete(int $id): bool
    {
        try {
            // Check if this is the default currency
            $currency = $this->findById($id);
            if ($currency && $currency['is_default']) {
                throw new DatabaseException('Cannot delete the default currency');
            }

            $sql = "DELETE FROM currencies WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->rowCount() > 0;
        } catch (PDOException $e) {
            $this->logger->error('Failed to delete currency', ['id' => $id, 'error' => $e->getMessage()]);
            throw new DatabaseException('Failed to delete currency: ' . $e->getMessage());
        }
    }

    /**
     * Set a currency as the default
     */
    public function setAsDefault(int $id): array
    {
        try {
            $this->pdo->beginTransaction();

            // First, unset any existing default
            $this->pdo->exec("UPDATE currencies SET is_default = 0 WHERE is_default = 1");

            // Set the new default
            $stmt = $this->pdo->prepare("UPDATE currencies SET is_default = 1, is_active = 1 WHERE id = :id");
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            $this->pdo->commit();

            return $this->findById($id);
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            $this->logger->error('Failed to set default currency', ['id' => $id, 'error' => $e->getMessage()]);
            throw new DatabaseException('Failed to set default currency: ' . $e->getMessage());
        }
    }

    /**
     * Toggle active status of a currency
     */
    public function toggleActive(int $id): array
    {
        try {
            // Check if this is the default currency
            $currency = $this->findById($id);
            if (!$currency) {
                throw new DatabaseException('Currency not found');
            }

            if ($currency['is_default'] && $currency['is_active']) {
                throw new DatabaseException('Cannot deactivate the default currency');
            }

            $newStatus = $currency['is_active'] ? 0 : 1;
            $stmt = $this->pdo->prepare("UPDATE currencies SET is_active = :is_active WHERE id = :id");
            $stmt->execute(['is_active' => $newStatus, 'id' => $id]);

            return $this->findById($id);
        } catch (PDOException $e) {
            $this->logger->error('Failed to toggle currency status', ['id' => $id, 'error' => $e->getMessage()]);
            throw new DatabaseException('Failed to toggle currency status: ' . $e->getMessage());
        }
    }

    /**
     * Get currency statistics
     */
    public function getStats(): array
    {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_currencies,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_currencies,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_currencies
                FROM currencies
            ";
            $stmt = $this->pdo->query($sql);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $this->logger->error('Failed to get currency stats', ['error' => $e->getMessage()]);
            throw new DatabaseException('Failed to get currency stats: ' . $e->getMessage());
        }
    }
}
