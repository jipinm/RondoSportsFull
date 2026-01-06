<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use XS2EventProxy\Service\BannersService;
use XS2EventProxy\Exception\ValidationException;
use XS2EventProxy\Exception\ServiceException;
use Psr\Log\LoggerInterface;

/**
 * Controller for banner management operations
 */
class BannersController
{
    private BannersService $bannersService;
    private LoggerInterface $logger;

    public function __construct(BannersService $bannersService, LoggerInterface $logger)
    {
        $this->bannersService = $bannersService;
        $this->logger = $logger;
    }

    /**
     * Get all banners with filtering and pagination
     * GET /admin/banners
     */
    public function getBanners(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $adminUser = $request->getAttribute('user');

            // Extract pagination parameters
            $page = max(1, (int)($queryParams['page'] ?? 1));
            $limit = min(100, max(1, (int)($queryParams['per_page'] ?? 20)));

            // Extract filters
            $filters = array_intersect_key($queryParams, array_flip([
                'search', 'status', 'location'
            ]));

            $result = $this->bannersService->getAllBanners($filters, $page, $limit);

            $this->logger->info('Banners retrieved successfully', [
                'admin_user_id' => $adminUser['id'],
                'total_count' => $result['pagination']['total'],
                'filters' => $filters
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result['data'],
                'pagination' => $result['pagination'],
                'filters_applied' => $filters
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in getBanners', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in getBanners', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Get a single banner by ID
     * GET /admin/banners/{id}
     */
    public function getBanner(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bannerId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            $banner = $this->bannersService->getBannerById($bannerId);

            if (!$banner) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Banner not found'
                ]));

                return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
            }

            $this->logger->info('Banner retrieved successfully', [
                'banner_id' => $bannerId,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $banner
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in getBanner', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in getBanner', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Create a new banner
     * POST /admin/banners
     */
    public function createBanner(Request $request, Response $response): ResponseInterface
    {
        try {
            $adminUser = $request->getAttribute('user');
            $data = json_decode($request->getBody()->getContents(), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Invalid JSON in request body'
                ]));

                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $banner = $this->bannersService->createBanner($data, $adminUser['id']);

            $this->logger->info('Banner created successfully', [
                'banner_id' => $banner['id'],
                'title' => $banner['title'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $banner,
                'message' => 'Banner created successfully'
            ]));

            return $response->withStatus(201)->withHeader('Content-Type', 'application/json');

        } catch (ValidationException $e) {
            $this->logger->warning('Validation error in createBanner', [
                'errors' => $e->getFieldErrors(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Validation failed',
                'field_errors' => $e->getFieldErrors()
            ]));

            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in createBanner', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in createBanner', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Update an existing banner
     * PUT /admin/banners/{id}
     */
    public function updateBanner(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bannerId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');
            $data = json_decode($request->getBody()->getContents(), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Invalid JSON in request body'
                ]));

                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $banner = $this->bannersService->updateBanner($bannerId, $data);

            $this->logger->info('Banner updated successfully', [
                'banner_id' => $bannerId,
                'title' => $banner['title'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $banner,
                'message' => 'Banner updated successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (ValidationException $e) {
            $this->logger->warning('Validation error in updateBanner', [
                'errors' => $e->getFieldErrors(),
                'banner_id' => $bannerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Validation failed',
                'field_errors' => $e->getFieldErrors()
            ]));

            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in updateBanner', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in updateBanner', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Delete a banner
     * DELETE /admin/banners/{id}
     */
    public function deleteBanner(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bannerId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            $deleted = $this->bannersService->deleteBanner($bannerId);

            if ($deleted) {
                $this->logger->info('Banner deleted successfully', [
                    'banner_id' => $bannerId,
                    'admin_user_id' => $adminUser['id']
                ]);

                $response->getBody()->write(json_encode([
                    'success' => true,
                    'message' => 'Banner deleted successfully'
                ]));

                return $response->withHeader('Content-Type', 'application/json');
            } else {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Failed to delete banner'
                ]));

                return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
            }

        } catch (ServiceException $e) {
            $this->logger->error('Service error in deleteBanner', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in deleteBanner', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Upload banner image
     * POST /admin/banners/{id}/upload
     */
    public function uploadBannerImage(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bannerId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');
            $uploadedFiles = $request->getUploadedFiles();

            $this->logger->info('Banner image upload started', [
                'banner_id' => $bannerId,
                'admin_user_id' => $adminUser['id']
            ]);

            // Check if image file exists in request
            if (empty($uploadedFiles['image'])) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'No image file uploaded'
                ]));

                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $uploadedFile = $uploadedFiles['image'];

            // Check for upload errors
            if ($uploadedFile->getError() !== UPLOAD_ERR_OK) {
                $errorMessages = [
                    UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive',
                    UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
                    UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                    UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                    UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                    UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                    UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the upload'
                ];
                $errorMsg = $errorMessages[$uploadedFile->getError()] ?? 'Unknown upload error';
                
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Upload failed: ' . $errorMsg
                ]));

                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            // Upload the image
            $result = $this->bannersService->uploadBannerImage($bannerId, $uploadedFile);

            $this->logger->info('Banner image uploaded successfully', [
                'banner_id' => $bannerId,
                'filename' => $result['filename'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'message' => 'Image uploaded successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (ValidationException $e) {
            $this->logger->warning('Validation error in uploadBannerImage', [
                'errors' => $e->getFieldErrors(),
                'banner_id' => $bannerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'File validation failed',
                'field_errors' => $e->getFieldErrors()
            ]));

            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in uploadBannerImage', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in uploadBannerImage', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Get public banners by location (for frontend display)
     * GET /banners/{location}
     */
    public function getPublicBanners(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $location = $args['location'];
            $queryParams = $request->getQueryParams();
            $limit = min(50, max(1, (int)($queryParams['limit'] ?? 10)));

            $banners = $this->bannersService->getPublicBanners($location, $limit);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $banners,
                'location' => $location
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in getPublicBanners', [
                'error' => $e->getMessage(),
                'location' => $location ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in getPublicBanners', [
                'error' => $e->getMessage(),
                'location' => $location ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Track banner click
     * POST /banners/{id}/click
     */
    public function trackBannerClick(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bannerId = (int) $args['id'];
            
            $tracked = $this->bannersService->trackClick($bannerId);

            $response->getBody()->write(json_encode([
                'success' => $tracked,
                'message' => $tracked ? 'Click tracked successfully' : 'Failed to track click'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error in trackBannerClick', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Failed to track click'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Track banner impression
     * POST /banners/{id}/impression
     */
    public function trackBannerImpression(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $bannerId = (int) $args['id'];
            
            $tracked = $this->bannersService->trackImpression($bannerId);

            $response->getBody()->write(json_encode([
                'success' => $tracked,
                'message' => $tracked ? 'Impression tracked successfully' : 'Failed to track impression'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error in trackBannerImpression', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Failed to track impression'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Update banner positions
     * PUT /admin/banners/positions
     */
    public function updateBannerPositions(Request $request, Response $response): ResponseInterface
    {
        try {
            $adminUser = $request->getAttribute('user');
            $data = json_decode($request->getBody()->getContents(), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Invalid JSON in request body'
                ]));

                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            if (empty($data['positions']) || !is_array($data['positions'])) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Positions array is required'
                ]));

                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $updated = $this->bannersService->updateBannerPositions($data['positions']);

            $this->logger->info('Banner positions updated successfully', [
                'positions' => $data['positions'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Banner positions updated successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in updateBannerPositions', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in updateBannerPositions', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }
}