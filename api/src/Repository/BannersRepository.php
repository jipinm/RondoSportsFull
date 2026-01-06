<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use PDO;
use PDOException;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\DatabaseException;

/**
 * Repository for banner data operations
 */
class BannersRepository
{
    private PDO $pdo;
    private LoggerInterface $logger;

    public function __construct(PDO $pdo, LoggerInterface $logger)
    {
        $this->pdo = $pdo;
        $this->logger = $logger;
    }

    /**
     * Get all banners with filtering and pagination
     */
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        try {
            $offset = ($page - 1) * $limit;
            $whereConditions = [];
            $params = [];

            // Build WHERE conditions based on filters
            if (!empty($filters['status'])) {
                $whereConditions[] = 'b.status = :status';
                $params['status'] = $filters['status'];
            }

            if (!empty($filters['location'])) {
                $whereConditions[] = 'b.location = :location';
                $params['location'] = $filters['location'];
            }

            if (!empty($filters['search'])) {
                $whereConditions[] = '(b.title LIKE :search_title OR b.description LIKE :search_desc)';
                $params['search_title'] = '%' . $filters['search'] . '%';
                $params['search_desc'] = '%' . $filters['search'] . '%';
            }

            // Build the query
            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
            
            $sql = "
                SELECT 
                    b.*,
                    au.name as created_by_name
                FROM banners b
                LEFT JOIN admin_users au ON b.created_by = au.id
                {$whereClause}
                ORDER BY b.position_order ASC, b.created_at DESC
                LIMIT :limit OFFSET :offset
            ";

            // Log the query for debugging
            $this->logger->info('Generated SQL Query', [
                'sql' => $sql,
                'params' => $params,
                'limit' => $limit,
                'offset' => $offset
            ]);

            // Build executable SQL for logging (for SQL editor testing)
            $executableSql = $sql;
            foreach ($params as $key => $value) {
                $escapedValue = $this->pdo->quote($value);
                $executableSql = str_replace(':' . $key, $escapedValue, $executableSql);
            }
            $executableSql = str_replace(':limit', (string)$limit, $executableSql);
            $executableSql = str_replace(':offset', (string)$offset, $executableSql);
            
            $this->logger->info('Executable SQL for testing', [
                'executable_sql' => $executableSql
            ]);

            $stmt = $this->pdo->prepare($sql);
            
            // Bind parameters
            foreach ($params as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

            $stmt->execute();
            $banners = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count for pagination
            $countSql = "SELECT COUNT(*) FROM banners b {$whereClause}";
            $countStmt = $this->pdo->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue(':' . $key, $value);
            }
            $countStmt->execute();
            $totalCount = (int) $countStmt->fetchColumn();

            return [
                'data' => $banners,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $totalCount,
                    'total_pages' => (int) ceil($totalCount / $limit)
                ]
            ];

        } catch (PDOException $e) {
            $this->logger->error('Database error in BannersRepository::findAll', [
                'error' => $e->getMessage(),
                'filters' => $filters
            ]);
            throw new DatabaseException('Failed to retrieve banners: ' . $e->getMessage());
        }
    }

    /**
     * Find a banner by ID
     */
    public function findById(int $id): ?array
    {
        try {
            $sql = "
                SELECT 
                    b.*,
                    au.name as created_by_name
                FROM banners b
                LEFT JOIN admin_users au ON b.created_by = au.id
                WHERE b.id = :id
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            $banner = $stmt->fetch(PDO::FETCH_ASSOC);
            return $banner ?: null;

        } catch (PDOException $e) {
            $this->logger->error('Database error in BannersRepository::findById', [
                'error' => $e->getMessage(),
                'banner_id' => $id
            ]);
            throw new DatabaseException('Failed to retrieve banner: ' . $e->getMessage());
        }
    }

    /**
     * Create a new banner
     */
    public function create(array $data): array
    {
        try {
            $sql = "
                INSERT INTO banners (
                    title, description, image_url, mobile_image_url, link_url, link_target,
                    position_order, status, location, event_date, price_tag, created_by, created_at, updated_at
                ) VALUES (
                    :title, :description, :image_url, :mobile_image_url, :link_url, :link_target,
                    :position_order, :status, :location, :event_date, :price_tag, :created_by, NOW(), NOW()
                )
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'image_url' => $data['image_url'],
                'mobile_image_url' => $data['mobile_image_url'] ?? null,
                'link_url' => $data['link_url'] ?? null,
                'link_target' => $data['link_target'] ?? '_self',
                'position_order' => $data['position_order'] ?? 0,
                'status' => $data['status'] ?? 'active',
                'location' => $data['location'] ?? 'homepage_hero',
                'event_date' => $data['event_date'] ?? null,
                'price_tag' => $data['price_tag'] ?? null,
                'created_by' => $data['created_by']
            ]);

            $bannerId = (int) $this->pdo->lastInsertId();
            
            $this->logger->info('Banner created successfully', [
                'banner_id' => $bannerId,
                'title' => $data['title']
            ]);

            return $this->findById($bannerId);

        } catch (PDOException $e) {
            $this->logger->error('Database error in BannersRepository::create', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw new DatabaseException('Failed to create banner: ' . $e->getMessage());
        }
    }

    /**
     * Update an existing banner
     */
    public function update(int $id, array $data): array
    {
        try {
            // Check if banner exists
            $existing = $this->findById($id);
            if (!$existing) {
                throw new DatabaseException('Banner not found with ID: ' . $id);
            }

            $this->logger->info('DB_UPDATE: Starting banner update', [
                'banner_id' => $id,
                'data_keys' => array_keys($data),
                'existing_image_url' => $existing['image_url'],
                'existing_mobile_image_url' => $existing['mobile_image_url'],
                'new_image_url' => $data['image_url'] ?? 'not provided',
                'new_mobile_image_url' => $data['mobile_image_url'] ?? 'not provided'
            ]);

            $sql = "
                UPDATE banners 
                SET 
                    title = :title,
                    description = :description,
                    image_url = :image_url,
                    mobile_image_url = :mobile_image_url,
                    link_url = :link_url,
                    link_target = :link_target,
                    position_order = :position_order,
                    status = :status,
                    location = :location,
                    event_date = :event_date,
                    price_tag = :price_tag,
                    updated_at = NOW()
                WHERE id = :id
            ";

            $updateParams = [
                'id' => $id,
                'title' => array_key_exists('title', $data) ? $data['title'] : $existing['title'],
                'description' => array_key_exists('description', $data) ? $data['description'] : $existing['description'],
                // Only update image URLs if provided AND not empty/null
                'image_url' => (array_key_exists('image_url', $data) && !empty($data['image_url'])) ? $data['image_url'] : $existing['image_url'],
                'mobile_image_url' => (array_key_exists('mobile_image_url', $data) && !empty($data['mobile_image_url'])) ? $data['mobile_image_url'] : $existing['mobile_image_url'],
                'link_url' => array_key_exists('link_url', $data) ? $data['link_url'] : $existing['link_url'],
                'link_target' => array_key_exists('link_target', $data) ? $data['link_target'] : $existing['link_target'],
                'position_order' => array_key_exists('position_order', $data) ? $data['position_order'] : $existing['position_order'],
                'status' => array_key_exists('status', $data) ? $data['status'] : $existing['status'],
                'location' => array_key_exists('location', $data) ? $data['location'] : $existing['location'],
                'event_date' => array_key_exists('event_date', $data) ? $data['event_date'] : $existing['event_date'],
                'price_tag' => array_key_exists('price_tag', $data) ? $data['price_tag'] : $existing['price_tag']
            ];

            $this->logger->info('DB_UPDATE: Executing UPDATE query', [
                'banner_id' => $id,
                'image_url' => $updateParams['image_url'],
                'mobile_image_url' => $updateParams['mobile_image_url'],
                'sql' => $sql
            ]);

            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute($updateParams);

            if (!$result) {
                $errorInfo = $stmt->errorInfo();
                $this->logger->error('DB_UPDATE: Execute failed', [
                    'error_info' => $errorInfo,
                    'banner_id' => $id
                ]);
                throw new DatabaseException('Failed to execute update: ' . ($errorInfo[2] ?? 'Unknown error'));
            }

            $this->logger->info('DB_UPDATE: Query executed', [
                'banner_id' => $id,
                'success' => $result,
                'row_count' => $stmt->rowCount(),
                'error_info' => $stmt->errorInfo()
            ]);

            $updatedBanner = $this->findById($id);

            $this->logger->info('DB_UPDATE: Banner retrieved after update', [
                'banner_id' => $id,
                'title' => $updatedBanner['title'],
                'image_url' => $updatedBanner['image_url'],
                'mobile_image_url' => $updatedBanner['mobile_image_url']
            ]);

            return $updatedBanner;

        } catch (PDOException $e) {
            $this->logger->error('Database error in BannersRepository::update', [
                'error' => $e->getMessage(),
                'banner_id' => $id,
                'data' => $data
            ]);
            throw new DatabaseException('Failed to update banner: ' . $e->getMessage());
        }
    }

    /**
     * Delete a banner
     */
    public function delete(int $id): bool
    {
        try {
            // Check if banner exists
            $existing = $this->findById($id);
            if (!$existing) {
                throw new DatabaseException('Banner not found with ID: ' . $id);
            }

            $sql = "DELETE FROM banners WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $result = $stmt->execute();

            $this->logger->info('Banner deleted successfully', [
                'banner_id' => $id,
                'title' => $existing['title']
            ]);

            return $result;

        } catch (PDOException $e) {
            $this->logger->error('Database error in BannersRepository::delete', [
                'error' => $e->getMessage(),
                'banner_id' => $id
            ]);
            throw new DatabaseException('Failed to delete banner: ' . $e->getMessage());
        }
    }

    /**
     * Update banner click count
     */
    public function incrementClickCount(int $id): bool
    {
        try {
            $sql = "UPDATE banners SET click_count = click_count + 1 WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            
            return $stmt->execute();

        } catch (PDOException $e) {
            $this->logger->error('Database error in BannersRepository::incrementClickCount', [
                'error' => $e->getMessage(),
                'banner_id' => $id
            ]);
            return false;
        }
    }

    /**
     * Update banner impression count
     */
    public function incrementImpressionCount(int $id): bool
    {
        try {
            $sql = "UPDATE banners SET impression_count = impression_count + 1 WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            
            return $stmt->execute();

        } catch (PDOException $e) {
            $this->logger->error('Database error in BannersRepository::incrementImpressionCount', [
                'error' => $e->getMessage(),
                'banner_id' => $id
            ]);
            return false;
        }
    }

    /**
     * Get banners by location for public display
     * Only returns active banners
     */
    public function findByLocation(string $location, int $limit = 10): array
    {
        try {
            $sql = "
                SELECT 
                    id, title, description, image_url, mobile_image_url, 
                    link_url, link_target, position_order, price_tag, event_date
                FROM banners 
                WHERE location = :location 
                    AND status = 'active'
                ORDER BY position_order ASC, id ASC
                LIMIT :limit
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':location', $location);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            $this->logger->error('Database error in BannersRepository::findByLocation', [
                'error' => $e->getMessage(),
                'location' => $location
            ]);
            throw new DatabaseException('Failed to retrieve banners by location: ' . $e->getMessage());
        }
    }

    /**
     * Reorder banners
     */
    public function updatePositions(array $positions): bool
    {
        try {
            $this->pdo->beginTransaction();

            foreach ($positions as $bannerId => $position) {
                $sql = "UPDATE banners SET position_order = :position WHERE id = :id";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    'id' => $bannerId,
                    'position' => $position
                ]);
            }

            $this->pdo->commit();
            
            $this->logger->info('Banner positions updated successfully', [
                'positions' => $positions
            ]);

            return true;

        } catch (PDOException $e) {
            $this->pdo->rollBack();
            $this->logger->error('Database error in BannersRepository::updatePositions', [
                'error' => $e->getMessage(),
                'positions' => $positions
            ]);
            throw new DatabaseException('Failed to update banner positions: ' . $e->getMessage());
        }
    }
}