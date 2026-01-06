<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use Psr\Log\LoggerInterface;
use PDO;

/**
 * Static Pages Repository
 * 
 * Handles database operations for static pages content management
 */
class StaticPagesRepository
{
    private DatabaseService $database;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $database, LoggerInterface $logger)
    {
        $this->database = $database;
        $this->logger = $logger;
    }

    /**
     * Get all static pages
     * 
     * @return array List of all static pages
     */
    public function getAllPages(): array
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                SELECT 
                    id, page_key, title, content, meta_title, meta_description, 
                    meta_keywords, status, is_published, slug, created_by, updated_by,
                    created_at, updated_at
                FROM static_pages 
                ORDER BY page_key ASC
            ");
            
            $stmt->execute();
            $pages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->logger->info('Retrieved all static pages', [
                'count' => count($pages)
            ]);
            
            return $pages;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get all static pages', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get a static page by its key
     * 
     * @param string $pageKey The page key (terms, privacy, etc.)
     * @return array|null Page data or null if not found
     */
    public function getPageByKey(string $pageKey): ?array
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                SELECT 
                    id, page_key, title, content, meta_title, meta_description, 
                    meta_keywords, status, is_published, slug, created_by, updated_by,
                    created_at, updated_at
                FROM static_pages 
                WHERE page_key = ?
            ");
            
            $stmt->execute([$pageKey]);
            $page = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($page) {
                $this->logger->info('Retrieved static page by key', [
                    'page_key' => $pageKey,
                    'title' => $page['title']
                ]);
            } else {
                $this->logger->warning('Static page not found', [
                    'page_key' => $pageKey
                ]);
            }
            
            return $page ?: null;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get static page by key', [
                'page_key' => $pageKey,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get a static page by its ID
     * 
     * @param int $id The page ID
     * @return array|null Page data or null if not found
     */
    public function getPageById(int $id): ?array
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                SELECT 
                    id, page_key, title, content, meta_title, meta_description, 
                    meta_keywords, status, is_published, slug, created_by, updated_by,
                    created_at, updated_at
                FROM static_pages 
                WHERE id = ?
            ");
            
            $stmt->execute([$id]);
            $page = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($page) {
                $this->logger->info('Retrieved static page by ID', [
                    'id' => $id,
                    'page_key' => $page['page_key'],
                    'title' => $page['title']
                ]);
            } else {
                $this->logger->warning('Static page not found', [
                    'id' => $id
                ]);
            }
            
            return $page ?: null;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get static page by ID', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Update a static page
     * 
     * @param int $id Page ID to update
     * @param array $data Page data to update
     * @param int $updatedBy Admin user ID who is updating
     * @return bool Success status
     */
    public function updatePage(int $id, array $data, int $updatedBy): bool
    {
        try {
            $pdo = $this->database->getConnection();
            
            // Build the update query dynamically based on provided data
            $allowedFields = [
                'title', 'content', 'meta_title', 'meta_description', 
                'meta_keywords', 'status', 'is_published', 'slug'
            ];
            
            $updateFields = [];
            $values = [];
            
            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $data)) {
                    $updateFields[] = "$field = ?";
                    $values[] = $data[$field];
                }
            }
            
            if (empty($updateFields)) {
                $this->logger->warning('No valid fields to update', [
                    'id' => $id,
                    'provided_fields' => array_keys($data)
                ]);
                return false;
            }
            
            // Add updated_by and updated_at
            $updateFields[] = "updated_by = ?";
            $updateFields[] = "updated_at = CURRENT_TIMESTAMP";
            $values[] = $updatedBy;
            $values[] = $id; // For WHERE clause
            
            $sql = "UPDATE static_pages SET " . implode(', ', $updateFields) . " WHERE id = ?";
            
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute($values);
            
            if ($result && $stmt->rowCount() > 0) {
                $this->logger->info('Static page updated successfully', [
                    'id' => $id,
                    'updated_by' => $updatedBy,
                    'updated_fields' => array_keys(array_intersect_key($data, array_flip($allowedFields)))
                ]);
                return true;
            }
            
            $this->logger->warning('No rows were updated', [
                'id' => $id,
                'updated_by' => $updatedBy
            ]);
            return false;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to update static page', [
                'id' => $id,
                'updated_by' => $updatedBy,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Create a new static page
     * 
     * @param array $data Page data
     * @param int $createdBy Admin user ID who is creating
     * @return int|null Created page ID or null on failure
     */
    public function createPage(array $data, int $createdBy): ?int
    {
        try {
            $pdo = $this->database->getConnection();
            
            $requiredFields = ['page_key', 'title', 'content', 'slug'];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    throw new \InvalidArgumentException("Required field '$field' is missing or empty");
                }
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO static_pages 
                (page_key, title, content, meta_title, meta_description, meta_keywords, 
                 status, is_published, slug, created_by, updated_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ");
            
            $result = $stmt->execute([
                $data['page_key'],
                $data['title'],
                $data['content'],
                $data['meta_title'] ?? null,
                $data['meta_description'] ?? null,
                $data['meta_keywords'] ?? null,
                $data['status'] ?? 'active',
                isset($data['is_published']) ? (bool)$data['is_published'] : true,
                $data['slug'],
                $createdBy,
                $createdBy
            ]);
            
            if ($result) {
                $pageId = (int)$pdo->lastInsertId();
                
                $this->logger->info('Static page created successfully', [
                    'id' => $pageId,
                    'page_key' => $data['page_key'],
                    'title' => $data['title'],
                    'created_by' => $createdBy
                ]);
                
                return $pageId;
            }
            
            return null;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to create static page', [
                'data' => $data,
                'created_by' => $createdBy,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Delete a static page
     * 
     * @param int $id Page ID to delete
     * @return bool Success status
     */
    public function deletePage(int $id): bool
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("DELETE FROM static_pages WHERE id = ?");
            $result = $stmt->execute([$id]);
            
            if ($result && $stmt->rowCount() > 0) {
                $this->logger->info('Static page deleted successfully', [
                    'id' => $id
                ]);
                return true;
            }
            
            $this->logger->warning('No page was deleted', [
                'id' => $id
            ]);
            return false;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to delete static page', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get published pages for public API
     * 
     * @return array List of published pages
     */
    public function getPublishedPages(): array
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                SELECT 
                    page_key, title, content, meta_title, meta_description, 
                    meta_keywords, slug, updated_at
                FROM static_pages 
                WHERE status = 'active' AND is_published = 1
                ORDER BY page_key ASC
            ");
            
            $stmt->execute();
            $pages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->logger->info('Retrieved published static pages', [
                'count' => count($pages)
            ]);
            
            return $pages;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get published static pages', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
}