<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use XS2EventProxy\Repository\StaticPagesRepository;
use Psr\Log\LoggerInterface;

/**
 * Static Pages Controller
 * 
 * Handles CRUD operations for static pages content management
 */
class StaticPagesController
{
    private StaticPagesRepository $staticPagesRepo;
    private LoggerInterface $logger;

    public function __construct(StaticPagesRepository $staticPagesRepo, LoggerInterface $logger)
    {
        $this->staticPagesRepo = $staticPagesRepo;
        $this->logger = $logger;
    }

    /**
     * Get all static pages (Admin only)
     */
    public function getAllPages(Request $request, Response $response): Response
    {
        try {
            $pages = $this->staticPagesRepo->getAllPages();
            
            return $this->jsonResponse($response, [
                'success' => true,
                'data' => $pages,
                'count' => count($pages)
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get all static pages', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to retrieve static pages'
            ], 500);
        }
    }

    /**
     * Get a specific static page by key
     */
    public function getPageByKey(Request $request, Response $response, array $args): Response
    {
        try {
            $pageKey = $args['key'] ?? '';
            
            if (empty($pageKey)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Page key is required'
                ], 400);
            }
            
            $page = $this->staticPagesRepo->getPageByKey($pageKey);
            
            if (!$page) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Page not found'
                ], 404);
            }
            
            return $this->jsonResponse($response, [
                'success' => true,
                'data' => $page
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get static page by key', [
                'page_key' => $args['key'] ?? '',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to retrieve page'
            ], 500);
        }
    }

    /**
     * Get a specific static page by ID (Admin only)
     */
    public function getPageById(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int)($args['id'] ?? 0);
            
            if ($id <= 0) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Valid page ID is required'
                ], 400);
            }
            
            $page = $this->staticPagesRepo->getPageById($id);
            
            if (!$page) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Page not found'
                ], 404);
            }
            
            return $this->jsonResponse($response, [
                'success' => true,
                'data' => $page
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get static page by ID', [
                'id' => $args['id'] ?? '',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to retrieve page'
            ], 500);
        }
    }

    /**
     * Update a static page (Admin only)
     */
    public function updatePage(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int)($args['id'] ?? 0);
            
            if ($id <= 0) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Valid page ID is required'
                ], 400);
            }
            
            $data = $request->getParsedBody();
            
            if (empty($data)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'No data provided for update'
                ], 400);
            }
            
            // Get current user from middleware
            $user = $request->getAttribute('user');
            if (!$user) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'User not authenticated'
                ], 401);
            }
            
            // Validate required fields if provided
            if (isset($data['title']) && empty(trim($data['title']))) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Title cannot be empty'
                ], 400);
            }
            
            if (isset($data['content']) && empty(trim($data['content']))) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Content cannot be empty'
                ], 400);
            }
            
            // Check if page exists
            $existingPage = $this->staticPagesRepo->getPageById($id);
            if (!$existingPage) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Page not found'
                ], 404);
            }
            
            $updated = $this->staticPagesRepo->updatePage($id, $data, (int)$user['id']);
            
            if (!$updated) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Failed to update page'
                ], 500);
            }
            
            // Get updated page
            $updatedPage = $this->staticPagesRepo->getPageById($id);
            
            return $this->jsonResponse($response, [
                'success' => true,
                'message' => 'Page updated successfully',
                'data' => $updatedPage
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to update static page', [
                'id' => $args['id'] ?? '',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to update page'
            ], 500);
        }
    }

    /**
     * Create a new static page (Admin only)
     */
    public function createPage(Request $request, Response $response): Response
    {
        try {
            $data = $request->getParsedBody();
            
            // Validate required fields
            $requiredFields = ['page_key', 'title', 'content', 'slug'];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || empty(trim($data[$field]))) {
                    return $this->jsonResponse($response, [
                        'success' => false,
                        'error' => "Field '$field' is required"
                    ], 400);
                }
            }
            
            // Get current user from middleware
            $user = $request->getAttribute('user');
            if (!$user) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'User not authenticated'
                ], 401);
            }
            
            // Check if page key already exists
            $existingPage = $this->staticPagesRepo->getPageByKey($data['page_key']);
            if ($existingPage) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'A page with this key already exists'
                ], 409);
            }
            
            $pageId = $this->staticPagesRepo->createPage($data, (int)$user['id']);
            
            if (!$pageId) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Failed to create page'
                ], 500);
            }
            
            // Get created page
            $createdPage = $this->staticPagesRepo->getPageById($pageId);
            
            return $this->jsonResponse($response, [
                'success' => true,
                'message' => 'Page created successfully',
                'data' => $createdPage
            ], 201);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to create static page', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to create page'
            ], 500);
        }
    }

    /**
     * Delete a static page (Admin only)
     */
    public function deletePage(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int)($args['id'] ?? 0);
            
            if ($id <= 0) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Valid page ID is required'
                ], 400);
            }
            
            // Check if page exists
            $existingPage = $this->staticPagesRepo->getPageById($id);
            if (!$existingPage) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Page not found'
                ], 404);
            }
            
            $deleted = $this->staticPagesRepo->deletePage($id);
            
            if (!$deleted) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Failed to delete page'
                ], 500);
            }
            
            return $this->jsonResponse($response, [
                'success' => true,
                'message' => 'Page deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to delete static page', [
                'id' => $args['id'] ?? '',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to delete page'
            ], 500);
        }
    }

    /**
     * Get published pages (Public API)
     */
    public function getPublishedPages(Request $request, Response $response): Response
    {
        try {
            $pages = $this->staticPagesRepo->getPublishedPages();
            
            return $this->jsonResponse($response, [
                'success' => true,
                'data' => $pages,
                'count' => count($pages)
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get published static pages', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to retrieve pages'
            ], 500);
        }
    }

    /**
     * Helper method to create JSON responses
     */
    private function jsonResponse(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_PRETTY_PRINT));
        
        return $response
            ->withStatus($status)
            ->withHeader('Content-Type', 'application/json');
    }
}