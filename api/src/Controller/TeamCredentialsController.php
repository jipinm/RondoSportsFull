<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use XS2EventProxy\Repository\TeamCredentialsRepository;
use XS2EventProxy\Service\TeamCredentialsService;
use XS2EventProxy\Service\ActivityLoggerService;
use Psr\Log\LoggerInterface;

class TeamCredentialsController
{
    private TeamCredentialsRepository $repository;
    private TeamCredentialsService $service;
    private ActivityLoggerService $activityLogger;
    private LoggerInterface $logger;

    public function __construct(
        TeamCredentialsRepository $repository,
        TeamCredentialsService $service,
        ActivityLoggerService $activityLogger,
        LoggerInterface $logger
    ) {
        $this->repository = $repository;
        $this->service = $service;
        $this->activityLogger = $activityLogger;
        $this->logger = $logger;
    }

    /**
     * Get team credentials list with filtering and pagination
     * GET /admin/team-credentials
     */
    public function getTeamCredentials(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $adminUser = $request->getAttribute('user');

            // Extract pagination parameters
            $page = max(1, (int)($queryParams['page'] ?? 1));
            $limit = min(100, max(1, (int)($queryParams['per_page'] ?? 20)));

            // Extract filters
            $filters = array_intersect_key($queryParams, array_flip([
                'search', 'status', 'tournament_id', 'team_id', 'start_date', 'end_date'
            ]));

            // Get team credentials
            $result = $this->repository->getTeamCredentials($filters, $page, $limit);

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'team_credentials.view_list',
                'Viewed team credentials list',
                [
                    'filters' => $filters,
                    'page' => $page,
                    'total_results' => $result['total']
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result['credentials'],
                'pagination' => [
                    'page' => $result['page'],
                    'per_page' => $result['limit'],
                    'total_items' => $result['total'],
                    'total_pages' => $result['pages']
                ]
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching team credentials', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch team credentials', null, 500);
        }
    }

    /**
     * Get single team credential by ID
     * GET /admin/team-credentials/{id}
     */
    public function getTeamCredentialById(Request $request, Response $response): ResponseInterface
    {
        try {
            $id = (int)$request->getAttribute('id');
            $adminUser = $request->getAttribute('user');

            if ($id <= 0) {
                return $this->errorResponse($response, 'Invalid team credential ID', null, 400);
            }

            $credential = $this->repository->getTeamCredentialById($id);

            if (!$credential) {
                return $this->errorResponse($response, 'Team credential not found', null, 404);
            }

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'team_credentials.view_single',
                "Viewed team credential: {$credential['team_name']} - {$credential['tournament_name']}",
                [
                    'credential_id' => $id,
                    'tournament_id' => $credential['tournament_id'],
                    'team_id' => $credential['team_id']
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $credential
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching team credential', [
                'error' => $e->getMessage(),
                'credential_id' => $id ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch team credential', null, 500);
        }
    }

    /**
     * Get team credential by tournament and team ID
     * GET /admin/team-credentials/tournament/{tournament_id}/team/{team_id}
     */
    public function getTeamCredentialByTeam(Request $request, Response $response): ResponseInterface
    {
        try {
            $tournamentId = (string)$request->getAttribute('tournament_id');
            $teamId = (string)$request->getAttribute('team_id');
            $adminUser = $request->getAttribute('user');

            if (empty($tournamentId) || empty($teamId)) {
                return $this->errorResponse($response, 'Tournament ID and Team ID are required', null, 400);
            }

            $credential = $this->repository->getTeamCredentialByTeam($tournamentId, $teamId);

            if (!$credential) {
                return $this->errorResponse($response, 'Team credential not found', null, 404);
            }

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'team_credentials.view_by_team',
                "Viewed team credential by team: {$tournamentId} - {$teamId}",
                [
                    'tournament_id' => $tournamentId,
                    'team_id' => $teamId,
                    'credential_id' => $credential['id']
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $credential
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching team credential by team', [
                'error' => $e->getMessage(),
                'tournament_id' => $tournamentId ?? null,
                'team_id' => $teamId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch team credential', null, 500);
        }
    }

    /**
     * Create new team credential
     * POST /admin/team-credentials
     */
    public function createTeamCredential(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $uploadedFiles = $request->getUploadedFiles();
            $adminUser = $request->getAttribute('user');

            // Basic validation
            if (empty($data)) {
                return $this->errorResponse($response, 'Request body is required', null, 400);
            }

            // Create team credential
            $result = $this->service->createTeamCredentials(
                $data,
                (int)$adminUser['id'],
                $uploadedFiles
            );

            if (!$result['success']) {
                return $this->errorResponse($response, 'Failed to create team credential', $result['errors'], 400);
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Team credential created successfully',
                'data' => $result['credential'],
                'uploads' => $result['uploads'] ?? null
            ]));

            return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

        } catch (\Exception $e) {
            $this->logger->error('Error creating team credential', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null,
                'request_data' => $data ?? null
            ]);

            return $this->errorResponse($response, 'Failed to create team credential', null, 500);
        }
    }

    /**
     * Update team credential
     * PUT /admin/team-credentials/{id}
     */
    public function updateTeamCredential(Request $request, Response $response): ResponseInterface
    {
        try {
            $id = (int)$request->getAttribute('id');
            $data = $request->getParsedBody();
            $uploadedFiles = $request->getUploadedFiles();
            $adminUser = $request->getAttribute('user');

            if ($id <= 0) {
                return $this->errorResponse($response, 'Invalid team credential ID', null, 400);
            }

            if (empty($data) && empty($uploadedFiles)) {
                return $this->errorResponse($response, 'Request body or files are required', null, 400);
            }

            // Update team credential
            $result = $this->service->updateTeamCredentials(
                $id,
                $data ?: [],
                (int)$adminUser['id'],
                $uploadedFiles
            );

            if (!$result['success']) {
                return $this->errorResponse($response, 'Failed to update team credential', $result['errors'], 400);
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Team credential updated successfully',
                'data' => $result['credential'],
                'uploads' => $result['uploads'] ?? null
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error updating team credential', [
                'error' => $e->getMessage(),
                'credential_id' => $id ?? null,
                'admin_user_id' => $adminUser['id'] ?? null,
                'request_data' => $data ?? null
            ]);

            return $this->errorResponse($response, 'Failed to update team credential', null, 500);
        }
    }

    /**
     * Delete team credential
     * DELETE /admin/team-credentials/{id}
     */
    public function deleteTeamCredential(Request $request, Response $response): ResponseInterface
    {
        try {
            $id = (int)$request->getAttribute('id');
            $adminUser = $request->getAttribute('user');

            error_log("=== DELETE TEAM CREDENTIAL REQUEST ===");
            error_log("Credential ID: " . $id);
            error_log("Admin User: " . print_r($adminUser, true));

            if ($id <= 0) {
                error_log("Invalid ID provided: " . $id);
                return $this->errorResponse($response, 'Invalid team credential ID', null, 400);
            }

            // Delete team credential
            $result = $this->service->deleteTeamCredentials($id, (int)$adminUser['id']);
            
            error_log("Delete result: " . print_r($result, true));

            if (!$result['success']) {
                error_log("Delete failed: " . print_r($result['errors'], true));
                return $this->errorResponse($response, 'Failed to delete team credential', $result['errors'], 400);
            }

            error_log("Delete successful");
            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Team credential deleted successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            error_log("Delete exception: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            
            $this->logger->error('Error deleting team credential', [
                'error' => $e->getMessage(),
                'credential_id' => $id ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to delete team credential', null, 500);
        }
    }

    /**
     * Toggle featured status for team credential
     * PATCH /admin/team-credentials/{id}/featured
     */
    public function toggleFeaturedStatus(Request $request, Response $response): ResponseInterface
    {
        try {
            $id = (int)$request->getAttribute('id');
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            // Debug logging
            $this->logger->info('Toggle featured status request', [
                'id' => $id,
                'data' => $data,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            if ($id <= 0) {
                $this->logger->warning('Invalid team credential ID', ['id' => $id]);
                return $this->errorResponse($response, 'Invalid team credential ID', null, 400);
            }

            // Validate is_featured value - accept boolean, 1, 0, "true", "false"
            if (!isset($data['is_featured'])) {
                $this->logger->warning('Missing is_featured field', ['data' => $data]);
                return $this->errorResponse($response, 'is_featured field is required', null, 400);
            }

            // Convert to boolean
            $isFeatured = filter_var($data['is_featured'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            
            if ($isFeatured === null) {
                $this->logger->warning('Invalid is_featured value', [
                    'value' => $data['is_featured'],
                    'type' => gettype($data['is_featured'])
                ]);
                return $this->errorResponse($response, 'is_featured must be a boolean value', null, 400);
            }

            $this->logger->info('Updating featured status', [
                'id' => $id,
                'is_featured' => $isFeatured,
                'admin_user_id' => $adminUser['id']
            ]);

            // Update featured status
            $result = $this->service->updateFeaturedStatus($id, $isFeatured, (int)$adminUser['id']);

            if (!$result['success']) {
                $this->logger->error('Service failed to update featured status', [
                    'id' => $id,
                    'errors' => $result['errors'] ?? null
                ]);
                return $this->errorResponse($response, 'Failed to update featured status', $result['errors'], 400);
            }

            $this->logger->info('Featured status updated successfully', [
                'id' => $id,
                'is_featured' => $isFeatured
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Featured status updated successfully',
                'data' => $result['credential']
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error updating featured status', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'credential_id' => $id ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to update featured status', null, 500);
        }
    }

    /**
     * Get teams for a specific tournament
     * GET /admin/team-credentials/tournament/{tournament_id}/teams
     */
    public function getTournamentTeams(Request $request, Response $response): ResponseInterface
    {
        try {
            $tournamentId = (string)$request->getAttribute('tournament_id');
            $adminUser = $request->getAttribute('user');

            if (empty($tournamentId)) {
                return $this->errorResponse($response, 'Tournament ID is required', null, 400);
            }

            $teams = $this->repository->getTournamentTeams($tournamentId);

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'team_credentials.view_tournament_teams',
                "Viewed teams for tournament: {$tournamentId}",
                [
                    'tournament_id' => $tournamentId,
                    'teams_count' => count($teams)
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $teams,
                'count' => count($teams)
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching tournament teams', [
                'error' => $e->getMessage(),
                'tournament_id' => $tournamentId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch tournament teams', null, 500);
        }
    }

    /**
     * Get team credentials statistics
     * GET /admin/team-credentials/stats
     */
    public function getTeamCredentialsStats(Request $request, Response $response): ResponseInterface
    {
        try {
            $adminUser = $request->getAttribute('user');

            $stats = $this->repository->getTeamCredentialsStats();

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'team_credentials.view_stats',
                'Viewed team credentials statistics',
                ['stats' => $stats]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $stats
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching team credentials stats', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch team credentials statistics', null, 500);
        }
    }

    /**
     * Get team data from XS2Event API
     * GET /admin/team-credentials/api/tournament/{tournament_id}/team/{team_id}
     */
    public function getTeamFromApi(Request $request, Response $response): ResponseInterface
    {
        try {
            $tournamentId = (string)$request->getAttribute('tournament_id');
            $teamId = (string)$request->getAttribute('team_id');
            $adminUser = $request->getAttribute('user');

            if (empty($tournamentId) || empty($teamId)) {
                return $this->errorResponse($response, 'Tournament ID and Team ID are required', null, 400);
            }

            $teamData = $this->service->getTeamFromApi($tournamentId, $teamId);
            $tournamentData = $this->service->getTournamentFromApi($tournamentId);

            if (!$teamData && !$tournamentData) {
                return $this->errorResponse($response, 'No data found from XS2Event API', null, 404);
            }

            // Log admin activity
            $this->logAdminActivity(
                (int)$adminUser['id'],
                'team_credentials.api_lookup',
                "Looked up API data for tournament: {$tournamentId}, team: {$teamId}",
                [
                    'tournament_id' => $tournamentId,
                    'team_id' => $teamId,
                    'has_team_data' => $teamData !== null,
                    'has_tournament_data' => $tournamentData !== null
                ]
            );

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => [
                    'team' => $teamData,
                    'tournament' => $tournamentData
                ]
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching team data from API', [
                'error' => $e->getMessage(),
                'tournament_id' => $tournamentId ?? null,
                'team_id' => $teamId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch team data from API', null, 500);
        }
    }

    /**
     * Update files for team credential
     * POST /admin/team-credentials/{id}/files
     */
    public function updateTeamCredentialFiles(Request $request, Response $response): ResponseInterface
    {
        try {
            // IMMEDIATE DEBUG - Check if we're getting here at all
            error_log("=== CONTROLLER ENTRY POINT ===");
            error_log("Request method: " . $request->getMethod());
            error_log("Request URI: " . $request->getUri()->getPath());
            error_log("Request headers: " . json_encode($request->getHeaders()));
            
            $id = (int)$request->getAttribute('id');
            $uploadedFiles = $request->getUploadedFiles();
            $adminUser = $request->getAttribute('user');

            error_log("=== UPDATE TEAM CREDENTIAL FILES DEBUG ===");
            error_log("ID: " . $id);
            error_log("Admin User: " . json_encode($adminUser));
            error_log("Uploaded Files keys: " . json_encode(array_keys($uploadedFiles)));
            error_log("Uploaded Files count: " . count($uploadedFiles));
            
            // Debug each uploaded file in detail
            if (empty($uploadedFiles)) {
                error_log("NO UPLOADED FILES DETECTED");
                error_log("Raw body size: " . strlen($request->getBody()->getContents()));
                $request->getBody()->rewind(); // Reset stream
                
                // Check if this is multipart data
                $contentType = $request->getHeaderLine('Content-Type');
                error_log("Content-Type header: " . $contentType);
                
                return $this->errorResponse($response, 'No files uploaded - check Content-Type and form data', null, 400);
            }
            
            foreach ($uploadedFiles as $key => $file) {
                error_log("=== FILE DEBUG: $key ===");
                error_log("Client filename: " . ($file->getClientFilename() ?? 'null'));
                error_log("Size: " . $file->getSize());
                error_log("Error code: " . $file->getError());
                error_log("Media type: " . ($file->getClientMediaType() ?? 'null'));
                error_log("Stream size: " . $file->getStream()->getSize());
                
                if ($file->getError() === UPLOAD_ERR_OK) {
                    error_log("File $key: " . $file->getClientFilename() . " (" . $file->getSize() . " bytes)");
                } else {
                    error_log("File $key error: " . $file->getError());
                    // Log upload error meanings
                    $errorMessages = [
                        UPLOAD_ERR_OK => 'No error',
                        UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
                        UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
                        UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                        UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                        UPLOAD_ERR_EXTENSION => 'PHP extension stopped the file upload'
                    ];
                    error_log("Error meaning: " . ($errorMessages[$file->getError()] ?? 'Unknown error'));
                }
            }

            if ($id <= 0) {
                error_log("Invalid team credential ID: " . $id);
                return $this->errorResponse($response, 'Invalid team credential ID', null, 400);
            }

            if (empty($uploadedFiles)) {
                error_log("No files uploaded");
                return $this->errorResponse($response, 'No files uploaded', null, 400);
            }

            // Validate that we only accept logo and/or banner files
            $allowedFileTypes = ['logo', 'banner'];
            $validFiles = [];
            
            foreach ($uploadedFiles as $key => $file) {
                if (in_array($key, $allowedFileTypes) && $file->getError() === UPLOAD_ERR_OK) {
                    $validFiles[$key] = $file;
                    error_log("Valid file added: $key");
                }
            }

            if (empty($validFiles)) {
                error_log("No valid logo or banner files uploaded");
                return $this->errorResponse($response, 'No valid logo or banner files uploaded', null, 400);
            }

            // Update files only
            error_log("Calling service updateTeamCredentialFiles");
            $result = $this->service->updateTeamCredentialFiles(
                $id,
                (int)$adminUser['id'],
                $validFiles
            );

            error_log("Service result: " . json_encode($result));

            if (!$result['success']) {
                error_log("Service failed: " . json_encode($result['errors']));
                return $this->errorResponse($response, 'Failed to update team credential files', $result['errors'], 400);
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Team credential files updated successfully',
                'data' => $result['credential'],
                'uploads' => $result['uploads'] ?? null
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Update team credential files error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->errorResponse($response, 'Failed to fetch team data from API', null, 500);
        }
    }

    /**
     * Get team credential data for public API (no authentication required)
     * GET /v1/team-credentials/tournament/{tournament_id}/team/{team_id}
     */
    public function getPublicTeamCredential(Request $request, Response $response): ResponseInterface
    {
        try {
            $tournamentId = (string)$request->getAttribute('tournament_id');
            $teamId = (string)$request->getAttribute('team_id');

            if (empty($tournamentId) || empty($teamId)) {
                return $this->errorResponse($response, 'Tournament ID and Team ID are required', null, 400);
            }

            $credential = $this->repository->getTeamCredentialByTeam($tournamentId, $teamId);

            if (!$credential) {
                return $this->errorResponse($response, 'Team credential not found', null, 404);
            }

            // Remove sensitive admin fields for public API
            $publicData = [
                'id' => $credential['id'],
                'tournament_id' => $credential['tournament_id'],
                'team_id' => $credential['team_id'],
                'team_name' => $credential['team_name'],
                'tournament_name' => $credential['tournament_name'],
                'short_description' => $credential['short_description'],
                'logo_filename' => $credential['logo_filename'],
                'banner_filename' => $credential['banner_filename'],
                'logo_url' => $credential['logo_url'],
                'banner_url' => $credential['banner_url'],
                'status' => $credential['status'],
                'created_at' => $credential['created_at'],
                'updated_at' => $credential['updated_at']
            ];

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $publicData
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching public team credential', [
                'error' => $e->getMessage(),
                'tournament_id' => $tournamentId ?? null,
                'team_id' => $teamId ?? null
            ]);

            return $this->errorResponse($response, 'Failed to fetch team credential', null, 500);
        }
    }

    /**
     * Get featured team credentials for public display
     * GET /v1/team-credentials/featured
     */
    public function getFeaturedTeamCredentials(Request $request, Response $response): ResponseInterface
    {
        try {
            $featuredTeams = $this->repository->getFeaturedTeamCredentials();

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $featuredTeams
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error fetching featured team credentials', [
                'error' => $e->getMessage()
            ]);

            return $this->errorResponse($response, 'Failed to fetch featured teams', null, 500);
        }
    }

    /**
     * Log admin activity
     */
    private function logAdminActivity(int $adminUserId, string $action, string $description, array $metadata = []): void
    {
        try {
            $this->activityLogger->logActivity($adminUserId, $action, $description, $metadata);
        } catch (\Exception $e) {
            $this->logger->warning('Failed to log admin activity', [
                'admin_user_id' => $adminUserId,
                'action' => $action,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Delete individual image (logo or banner)
     * DELETE /admin/team-credentials/{id}/image/{type}
     */
    public function deleteTeamCredentialImage(Request $request, Response $response): ResponseInterface
    {
        try {
            $id = (int)$request->getAttribute('id');
            $type = $request->getAttribute('type'); // 'logo' or 'banner'
            $adminUser = $request->getAttribute('user');

            error_log("=== DELETE TEAM CREDENTIAL IMAGE ===");
            error_log("Credential ID: " . $id);
            error_log("Image Type: " . $type);
            error_log("Admin User: " . print_r($adminUser, true));

            if ($id <= 0) {
                return $this->errorResponse($response, 'Invalid team credential ID', null, 400);
            }

            if (!in_array($type, ['logo', 'banner'])) {
                return $this->errorResponse($response, 'Invalid image type. Must be "logo" or "banner"', null, 400);
            }

            // Delete the image
            $result = $this->service->deleteTeamCredentialImage($id, $type, (int)$adminUser['id']);

            if (!$result['success']) {
                error_log("Delete image failed: " . print_r($result['errors'], true));
                return $this->errorResponse($response, 'Failed to delete image', $result['errors'], 400);
            }

            error_log("Delete image successful");
            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => ucfirst($type) . ' deleted successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            error_log("Delete image exception: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());

            $this->logger->error('Error deleting team credential image', [
                'error' => $e->getMessage(),
                'credential_id' => $id ?? null,
                'image_type' => $type ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            return $this->errorResponse($response, 'Failed to delete image', null, 500);
        }
    }

    /**
     * Return error response
     */
    private function errorResponse(Response $response, string $message, $errors = null, int $statusCode = 400): ResponseInterface
    {
        $data = [
            'success' => false,
            'error' => $message
        ];

        if ($errors !== null) {
            $data['errors'] = $errors;
        }

        $response->getBody()->write(json_encode($data));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($statusCode);
    }
}