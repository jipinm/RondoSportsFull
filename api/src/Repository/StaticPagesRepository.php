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
                    meta_keywords, 
                    CASE WHEN status = 'published' THEN 'active' ELSE 'inactive' END as status, 
                    CASE WHEN status = 'published' THEN 1 ELSE 0 END as is_published, 
                    slug, last_edited_by as created_by, last_edited_by as updated_by,
                    created_at, updated_at
                FROM cms_pages 
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
                    meta_keywords, 
                    CASE WHEN status = 'published' THEN 'active' ELSE 'inactive' END as status, 
                    CASE WHEN status = 'published' THEN 1 ELSE 0 END as is_published, 
                    slug, last_edited_by as created_by, last_edited_by as updated_by,
                    created_at, updated_at
                FROM cms_pages 
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
                    meta_keywords, 
                    CASE WHEN status = 'published' THEN 'active' ELSE 'inactive' END as status, 
                    CASE WHEN status = 'published' THEN 1 ELSE 0 END as is_published, 
                    slug, last_edited_by as created_by, last_edited_by as updated_by,
                    created_at, updated_at
                FROM cms_pages 
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
            // Map static_pages fields to cms_pages fields
            $fieldMapping = [
                'title' => 'title',
                'content' => 'content',
                'meta_title' => 'meta_title',
                'meta_description' => 'meta_description',
                'meta_keywords' => 'meta_keywords',
                'slug' => 'slug',
                'status' => 'status',
                'is_published' => null // Will be handled via status field
            ];
            
            $updateFields = [];
            $values = [];
            
            foreach ($fieldMapping as $inputField => $dbField) {
                if (array_key_exists($inputField, $data) && $dbField !== null) {
                    // Handle status field mapping
                    if ($inputField === 'status') {
                        $updateFields[] = "status = ?";
                        $values[] = ($data[$inputField] === 'active') ? 'published' : 'draft';
                    } else {
                        $updateFields[] = "$dbField = ?";
                        $values[] = $data[$inputField];
                    }
                }
            }
            
            // Handle is_published separately (maps to status)
            if (array_key_exists('is_published', $data) && !array_key_exists('status', $data)) {
                $updateFields[] = "status = ?";
                $values[] = $data['is_published'] ? 'published' : 'draft';
            }
            
            if (empty($updateFields)) {
                $this->logger->warning('No valid fields to update', [
                    'id' => $id,
                    'provided_fields' => array_keys($data)
                ]);
                return false;
            }
            
            // Add last_edited_by and updated_at
            $updateFields[] = "last_edited_by = ?";
            $updateFields[] = "updated_at = CURRENT_TIMESTAMP";
            $values[] = $updatedBy;
            $values[] = $id; // For WHERE clause
            
            $sql = "UPDATE cms_pages SET " . implode(', ', $updateFields) . " WHERE id = ?";
            
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute($values);
            
            if ($result && $stmt->rowCount() > 0) {
                $this->logger->info('Static page updated successfully', [
                    'id' => $id,
                    'updated_by' => $updatedBy,
                    'updated_fields' => array_keys($data)
                ]);
                return true;
            }
            
            // Check if row exists but no changes were made (rowCount = 0)
            if ($result) {
                // Verify the row exists
                $checkStmt = $pdo->prepare("SELECT id FROM cms_pages WHERE id = ?");
                $checkStmt->execute([$id]);
                if ($checkStmt->fetch()) {
                    $this->logger->info('Static page update - no changes needed', [
                        'id' => $id,
                        'updated_by' => $updatedBy
                    ]);
                    return true;
                }
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
            
            // Map status from static_pages format to cms_pages format
            $cmsStatus = 'published';
            if (isset($data['status'])) {
                $cmsStatus = ($data['status'] === 'active') ? 'published' : 'draft';
            } elseif (isset($data['is_published'])) {
                $cmsStatus = $data['is_published'] ? 'published' : 'draft';
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO cms_pages 
                (page_key, title, slug, content, meta_title, meta_description, meta_keywords, 
                 status, content_type, template, last_edited_by, published_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'rich_text', 'default', ?, NOW(), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ");
            
            $result = $stmt->execute([
                $data['page_key'],
                $data['title'],
                $data['slug'],
                $data['content'],
                $data['meta_title'] ?? null,
                $data['meta_description'] ?? null,
                $data['meta_keywords'] ?? null,
                $cmsStatus,
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
            
            $stmt = $pdo->prepare("DELETE FROM cms_pages WHERE id = ?");
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
                FROM cms_pages 
                WHERE status = 'published'
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