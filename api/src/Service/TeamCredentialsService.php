<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use XS2EventProxy\Repository\TeamCredentialsRepository;
use XS2EventProxy\Service\ActivityLoggerService;
use Psr\Http\Message\UploadedFileInterface;
use GuzzleHttp\Client;
use Exception;
use InvalidArgumentException;

class TeamCredentialsService
{
    private TeamCredentialsRepository $repository;
    private ActivityLoggerService $activityLogger;
    private Client $httpClient;
    private string $xs2EventBaseUrl;
    private string $xs2EventApiKey;
    private string $uploadPath;
    private string $publicPath;
    private array $allowedImageTypes = [
        'image/png',
        'image/jpeg',
        'image/jpg'
    ];
    private array $allowedExtensions = ['jpg', 'jpeg', 'png'];
    private int $maxFileSize = 5242880; // 5MB in bytes

    public function __construct(
        TeamCredentialsRepository $repository,
        ActivityLoggerService $activityLogger,
        Client $httpClient,
        string $xs2EventBaseUrl,
        string $xs2EventApiKey,
        string $uploadPath = '/public/images/team',
        string $publicPath = '/images/team'
    ) {
        $this->repository = $repository;
        $this->activityLogger = $activityLogger;
        $this->httpClient = $httpClient;
        $this->xs2EventBaseUrl = rtrim($xs2EventBaseUrl, '/');
        $this->xs2EventApiKey = $xs2EventApiKey;
        $this->uploadPath = $uploadPath;
        $this->publicPath = $publicPath;
        
        // Debug: Log the upload paths
        error_log("TeamCredentialsService initialized with:");
        error_log("Upload path: " . $this->uploadPath);
        error_log("Public path: " . $this->publicPath);
        error_log("Upload path exists: " . (is_dir($this->uploadPath) ? 'YES' : 'NO'));
    }

    /**
     * Validate team credentials data
     */
    public function validateTeamCredentials(array $data, bool $isUpdate = false, ?int $excludeId = null): array
    {
        $errors = [];

        // Tournament ID validation
        if (empty($data['tournament_id']) && !$isUpdate) {
            $errors['tournament_id'] = 'Tournament ID is required';
        } elseif (!empty($data['tournament_id'])) {
            if (!is_string($data['tournament_id']) || strlen(trim($data['tournament_id'])) === 0) {
                $errors['tournament_id'] = 'Tournament ID must be a valid string';
            }
        }

        // Team ID validation
        if (empty($data['team_id']) && !$isUpdate) {
            $errors['team_id'] = 'Team ID is required';
        } elseif (!empty($data['team_id'])) {
            if (!is_string($data['team_id']) || strlen(trim($data['team_id'])) === 0) {
                $errors['team_id'] = 'Team ID must be a valid string';
            }
        }

        // Check for duplicate team credentials
        if (!empty($data['tournament_id']) && !empty($data['team_id'])) {
            if ($this->repository->teamCredentialExists($data['tournament_id'], $data['team_id'], $excludeId)) {
                $errors['duplicate'] = 'Team credentials already exist for this tournament and team combination';
            }
        }

        // Team name validation (optional but if provided, must be valid)
        if (isset($data['team_name'])) {
            if (!is_string($data['team_name'])) {
                $errors['team_name'] = 'Team name must be a string';
            } elseif (strlen($data['team_name']) > 255) {
                $errors['team_name'] = 'Team name must not exceed 255 characters';
            }
        }

        // Tournament name validation (optional but if provided, must be valid)
        if (isset($data['tournament_name'])) {
            if (!is_string($data['tournament_name'])) {
                $errors['tournament_name'] = 'Tournament name must be a string';
            } elseif (strlen($data['tournament_name']) > 255) {
                $errors['tournament_name'] = 'Tournament name must not exceed 255 characters';
            }
        }

        // Short description validation
        if (isset($data['short_description'])) {
            if (!is_string($data['short_description'])) {
                $errors['short_description'] = 'Short description must be a string';
            } elseif (strlen($data['short_description']) > 500) {
                $errors['short_description'] = 'Short description must not exceed 500 characters';
            }
        }

        // Status validation
        if (isset($data['status'])) {
            $allowedStatuses = ['active', 'inactive'];
            if (!in_array($data['status'], $allowedStatuses)) {
                $errors['status'] = 'Invalid status. Allowed values: ' . implode(', ', $allowedStatuses);
            }
        }

        return $errors;
    }

    /**
     * Validate uploaded image file
     */
    public function validateImageFile(UploadedFileInterface $uploadedFile, string $type): array
    {
        $errors = [];
        
        error_log("Validating uploaded file for type: " . $type);
        error_log("File error: " . $uploadedFile->getError());
        error_log("File size: " . $uploadedFile->getSize());
        error_log("Client media type: " . ($uploadedFile->getClientMediaType() ?? 'null'));
        error_log("Client filename: " . ($uploadedFile->getClientFilename() ?? 'null'));

        // Check for upload errors
        if ($uploadedFile->getError() !== UPLOAD_ERR_OK) {
            error_log("Upload error detected: " . $uploadedFile->getError());
            switch ($uploadedFile->getError()) {
                case UPLOAD_ERR_INI_SIZE:
                case UPLOAD_ERR_FORM_SIZE:
                    $errors[$type] = 'File size exceeds maximum allowed size (5MB)';
                    break;
                case UPLOAD_ERR_PARTIAL:
                    $errors[$type] = 'File was only partially uploaded';
                    break;
                case UPLOAD_ERR_NO_FILE:
                    $errors[$type] = 'No file was uploaded';
                    break;
                default:
                    $errors[$type] = 'File upload failed';
                    break;
            }
            return $errors;
        }

        // Check file size
        if ($uploadedFile->getSize() > $this->maxFileSize) {
            $errors[$type] = 'File size must not exceed 5MB';
            return $errors;
        }

        // Check MIME type
        $clientMediaType = $uploadedFile->getClientMediaType();
        if (!in_array($clientMediaType, $this->allowedImageTypes)) {
            $errors[$type] = 'Invalid file type. Allowed formats: PNG, JPG, JPEG';
            return $errors;
        }

        // Validate actual file content
        $tmpName = $uploadedFile->getStream()->getMetadata('uri');
        if ($tmpName) {
            $actualMimeType = mime_content_type($tmpName);
            
            // Validate MIME type
            if (!in_array($actualMimeType, $this->allowedImageTypes)) {
                $errors[$type] = 'Invalid file content. File appears to be corrupted or not a valid image';
                return $errors;
            }

            // Check if it's actually an image using getimagesize
            $imageInfo = @getimagesize($tmpName);
            if ($imageInfo === false) {
                $errors[$type] = 'Invalid image file';
                return $errors;
            }
        }

        return $errors;
    }

    /**
     * Handle file upload for team credentials
     */
    public function handleFileUpload(
        UploadedFileInterface $uploadedFile,
        string $tournamentId,
        string $teamId,
        string $type // 'logo' or 'banner'
    ): array {
        try {
            // Validate the file
            $validationErrors = $this->validateImageFile($uploadedFile, $type);
            if (!empty($validationErrors)) {
                return ['success' => false, 'errors' => $validationErrors];
            }

            // Always use PNG extension - we'll convert the image
            $filename = "{$tournamentId}_{$teamId}_{$type}.png";

            // Create upload directory if it doesn't exist
            $typeDir = $this->uploadPath . '/' . $type;
            error_log("Attempting to create/use directory: " . $typeDir);
            error_log("Directory exists: " . (is_dir($typeDir) ? 'YES' : 'NO'));
            
            if (!is_dir($typeDir)) {
                error_log("Creating directory: " . $typeDir);
                if (!mkdir($typeDir, 0755, true)) {
                    error_log("Failed to create directory: " . $typeDir);
                    return ['success' => false, 'errors' => [$type => 'Failed to create upload directory']];
                }
                error_log("Successfully created directory: " . $typeDir);
            }

            // Convert image to PNG and save
            $targetPath = $typeDir . '/' . $filename;
            error_log("Converting and uploading file to: " . $targetPath);
            
            // Get the uploaded file's temporary path
            $tmpPath = $uploadedFile->getStream()->getMetadata('uri');
            
            // Convert to PNG
            $conversionResult = $this->convertToPNG($tmpPath, $targetPath);
            if (!$conversionResult) {
                error_log("Failed to convert image to PNG");
                return ['success' => false, 'errors' => [$type => 'Failed to process image']];
            }
            
            error_log("File uploaded and converted successfully to: " . $targetPath);
            error_log("File exists after upload: " . (file_exists($targetPath) ? 'YES' : 'NO'));

            // Generate public URL
            $publicUrl = $this->publicPath . '/' . $type . '/' . $filename;

            return [
                'success' => true,
                'filename' => $filename,
                'url' => $publicUrl,
                'path' => $targetPath
            ];

        } catch (Exception $e) {
            return ['success' => false, 'errors' => [$type => 'File upload failed: ' . $e->getMessage()]];
        }
    }

    /**
     * Delete uploaded file
     */
    public function deleteFile(string $filename, string $type): bool
    {
        try {
            $filePath = $this->uploadPath . '/' . $type . '/' . $filename;
            error_log("Attempting to delete file: " . $filePath);
            error_log("File exists: " . (file_exists($filePath) ? 'YES' : 'NO'));
            
            if (file_exists($filePath)) {
                $result = unlink($filePath);
                error_log("File deletion result: " . ($result ? 'SUCCESS' : 'FAILED'));
                return $result;
            }
            
            error_log("File doesn't exist, considering as deleted");
            return true; // File doesn't exist, consider it deleted
        } catch (Exception $e) {
            error_log("Error deleting file: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get team information from XS2Event API
     */
    public function getTeamFromApi(string $tournamentId, string $teamId): ?array
    {
        try {
            $url = $this->xs2EventBaseUrl . "/api/v1/tournaments/{$tournamentId}/teams/{$teamId}";
            
            $response = $this->httpClient->request('GET', $url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->xs2EventApiKey,
                    'Accept' => 'application/json',
                ],
                'timeout' => 10,
            ]);

            if ($response->getStatusCode() === 200) {
                $data = json_decode($response->getBody()->getContents(), true);
                return $data['data'] ?? $data;
            }

            return null;

        } catch (Exception $e) {
            // Log the error but don't throw - API data is optional
            error_log("Failed to fetch team data from XS2Event API: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get tournament information from XS2Event API
     */
    public function getTournamentFromApi(string $tournamentId): ?array
    {
        try {
            $url = $this->xs2EventBaseUrl . "/api/v1/tournaments/{$tournamentId}";
            
            $response = $this->httpClient->request('GET', $url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->xs2EventApiKey,
                    'Accept' => 'application/json',
                ],
                'timeout' => 10,
            ]);

            if ($response->getStatusCode() === 200) {
                $data = json_decode($response->getBody()->getContents(), true);
                return $data['data'] ?? $data;
            }

            return null;

        } catch (Exception $e) {
            // Log the error but don't throw - API data is optional
            error_log("Failed to fetch tournament data from XS2Event API: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Create team credentials with optional file uploads
     */
    public function createTeamCredentials(array $data, int $adminUserId, ?array $files = null): array
    {
        try {
            // Validate the data
            $validationErrors = $this->validateTeamCredentials($data);
            if (!empty($validationErrors)) {
                return ['success' => false, 'errors' => $validationErrors];
            }

            // Try to get team and tournament info from API
            $teamData = $this->getTeamFromApi($data['tournament_id'], $data['team_id']);
            $tournamentData = $this->getTournamentFromApi($data['tournament_id']);

            // Auto-populate names from API if not provided
            if (empty($data['team_name']) && $teamData && !empty($teamData['name'])) {
                $data['team_name'] = $teamData['name'];
            }

            if (empty($data['tournament_name']) && $tournamentData && !empty($tournamentData['name'])) {
                $data['tournament_name'] = $tournamentData['name'];
            }

            // Handle file uploads
            $uploadResults = [];
            if ($files) {
                foreach (['logo', 'banner'] as $type) {
                    if (isset($files[$type]) && $files[$type]->getError() === UPLOAD_ERR_OK) {
                        $result = $this->handleFileUpload(
                            $files[$type],
                            $data['tournament_id'],
                            $data['team_id'],
                            $type
                        );

                        if ($result['success']) {
                            $data[$type . '_filename'] = $result['filename'];
                            $data[$type . '_url'] = $result['url'];
                            $uploadResults[$type] = $result;
                        } else {
                            return ['success' => false, 'errors' => $result['errors']];
                        }
                    }
                }
            }

            // Set admin user
            $data['created_by'] = $adminUserId;

            // Create the credential
            $credentialId = $this->repository->createTeamCredential($data);

            // Log activity
            $this->activityLogger->logActivity(
                $adminUserId,
                'team_credentials_created',
                'Team credentials created',
                [
                    'credential_id' => $credentialId,
                    'tournament_id' => $data['tournament_id'],
                    'team_id' => $data['team_id'],
                    'has_logo' => !empty($data['logo_filename']),
                    'has_banner' => !empty($data['banner_filename'])
                ]
            );

            // Get the created credential
            $credential = $this->repository->getTeamCredentialById($credentialId);

            return [
                'success' => true,
                'credential' => $credential,
                'uploads' => $uploadResults
            ];

        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['general' => 'Failed to create team credentials: ' . $e->getMessage()]];
        }
    }

    /**
     * Update team credentials with optional file uploads
     */
    public function updateTeamCredentials(int $id, array $data, int $adminUserId, ?array $files = null): array
    {
        try {
            // Get existing credential
            $existingCredential = $this->repository->getTeamCredentialById($id);
            if (!$existingCredential) {
                return ['success' => false, 'errors' => ['general' => 'Team credential not found']];
            }

            // Validate the data
            $validationErrors = $this->validateTeamCredentials($data, true, $id);
            if (!empty($validationErrors)) {
                return ['success' => false, 'errors' => $validationErrors];
            }

            // Handle file uploads
            $uploadResults = [];
            $filesToDelete = [];

            if ($files) {
                foreach (['logo', 'banner'] as $type) {
                    if (isset($files[$type]) && $files[$type]->getError() === UPLOAD_ERR_OK) {
                        // Delete old file if exists
                        $oldFilename = $existingCredential[$type . '_filename'];
                        if ($oldFilename) {
                            $filesToDelete[] = ['filename' => $oldFilename, 'type' => $type];
                        }

                        // Upload new file
                        $result = $this->handleFileUpload(
                            $files[$type],
                            $existingCredential['tournament_id'],
                            $existingCredential['team_id'],
                            $type
                        );

                        if ($result['success']) {
                            $data[$type . '_filename'] = $result['filename'];
                            $data[$type . '_url'] = $result['url'];
                            $uploadResults[$type] = $result;
                        } else {
                            return ['success' => false, 'errors' => $result['errors']];
                        }
                    }
                }
            }

            // Update the credential
            $updateResult = $this->repository->updateTeamCredential($id, $data, $adminUserId);

            if (!$updateResult) {
                return ['success' => false, 'errors' => ['general' => 'Failed to update team credential']];
            }

            // Delete old files after successful update
            foreach ($filesToDelete as $fileInfo) {
                $this->deleteFile($fileInfo['filename'], $fileInfo['type']);
            }

            // Log activity
            $this->activityLogger->logActivity(
                $adminUserId,
                'team_credentials_updated',
                'Team credentials updated',
                [
                    'credential_id' => $id,
                    'tournament_id' => $existingCredential['tournament_id'],
                    'team_id' => $existingCredential['team_id'],
                    'updated_fields' => array_keys($data)
                ]
            );

            // Get the updated credential
            $credential = $this->repository->getTeamCredentialById($id);

            return [
                'success' => true,
                'credential' => $credential,
                'uploads' => $uploadResults
            ];

        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['general' => 'Failed to update team credentials: ' . $e->getMessage()]];
        }
    }

    /**
     * Update team credential files only
     */
    public function updateTeamCredentialFiles(int $id, int $adminUserId, array $files): array
    {
        try {
            error_log("=== SERVICE updateTeamCredentialFiles ===");
            error_log("ID: $id, Admin User: $adminUserId");
            error_log("Files: " . json_encode(array_keys($files)));

            // Get existing credential
            $existingCredential = $this->repository->getTeamCredentialById($id);
            if (!$existingCredential) {
                error_log("Team credential not found: $id");
                return ['success' => false, 'errors' => ['general' => 'Team credential not found']];
            }

            error_log("Existing credential found: " . $existingCredential['team_name']);

            // Handle file uploads
            $uploadResults = [];
            $filesToDelete = [];
            $updateData = [];

            foreach (['logo', 'banner'] as $type) {
                if (isset($files[$type]) && $files[$type]->getError() === UPLOAD_ERR_OK) {
                    error_log("Processing $type file upload");
                    
                    // Get old filename for potential deletion
                    $oldFilename = $existingCredential[$type . '_filename'];
                    
                    // Upload new file
                    error_log("Calling handleFileUpload for $type");
                    $result = $this->handleFileUpload(
                        $files[$type],
                        $existingCredential['tournament_id'],
                        $existingCredential['team_id'],
                        $type
                    );

                    error_log("File upload result for $type: " . json_encode($result));

                    if ($result['success']) {
                        $newFilename = $result['filename'];
                        
                        // Only add to deletion list if the filename is different
                        if ($oldFilename && $oldFilename !== $newFilename) {
                            $filesToDelete[] = ['filename' => $oldFilename, 'type' => $type];
                            error_log("Will delete old $type file: $oldFilename (different from new: $newFilename)");
                        } else {
                            error_log("Skipping deletion for $type - same filename or no old file");
                        }
                        
                        $updateData[$type . '_filename'] = $result['filename'];
                        $updateData[$type . '_url'] = $result['url'];
                        $uploadResults[$type] = $result;
                        error_log("File upload successful for $type: " . $result['filename']);
                    } else {
                        error_log("File upload failed for $type: " . json_encode($result['errors']));
                        return ['success' => false, 'errors' => $result['errors']];
                    }
                }
            }

            // Update the credential with new file info (only if we actually have new file data)
            if (!empty($updateData)) {
                error_log("Updating credential with new file data: " . json_encode($updateData));
                $updateResult = $this->repository->updateTeamCredential($id, $updateData, $adminUserId);

                if (!$updateResult) {
                    error_log("Database update returned false, but for file uploads this might be OK if values are unchanged");
                    // For file uploads, we don't treat this as an error since the files were uploaded successfully
                    // The database might return false if the new values are identical to existing ones
                }

                error_log("File upload operation completed - treating as successful");

                // Delete old files after successful update
                foreach ($filesToDelete as $fileInfo) {
                    error_log("Deleting old file: " . $fileInfo['filename']);
                    $this->deleteFile($fileInfo['filename'], $fileInfo['type']);
                }

                // Log activity
                $this->activityLogger->logActivity(
                    $adminUserId,
                    'team_credentials_files_updated',
                    'Team credential files updated',
                    [
                        'credential_id' => $id,
                        'tournament_id' => $existingCredential['tournament_id'],
                        'team_id' => $existingCredential['team_id'],
                        'updated_files' => array_keys($uploadResults)
                    ]
                );
            } else {
                error_log("No update data - no files processed");
            }

            // Get the updated credential
            $credential = $this->repository->getTeamCredentialById($id);
            error_log("Returning success with updated credential");

            return [
                'success' => true,
                'credential' => $credential,
                'uploads' => $uploadResults
            ];

        } catch (Exception $e) {
            error_log("Exception in updateTeamCredentialFiles: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return ['success' => false, 'errors' => ['general' => 'Failed to update team credential files: ' . $e->getMessage()]];
        }
    }

    /**
     * Update featured status for team credential
     */
    public function updateFeaturedStatus(int $id, bool $isFeatured, int $adminUserId): array
    {
        try {
            error_log("=== Service: updateFeaturedStatus ===");
            error_log("ID: " . $id);
            error_log("isFeatured: " . ($isFeatured ? 'true' : 'false'));
            error_log("adminUserId: " . $adminUserId);

            // Get existing credential
            $existingCredential = $this->repository->getTeamCredentialById($id);
            if (!$existingCredential) {
                error_log("Team credential not found for ID: " . $id);
                return ['success' => false, 'errors' => ['general' => 'Team credential not found']];
            }

            error_log("Existing credential found: " . json_encode($existingCredential));

            // Update featured status
            $updateData = [
                'is_featured' => $isFeatured ? 1 : 0,
                'updated_by' => $adminUserId
            ];

            error_log("Update data: " . json_encode($updateData));

            $updateResult = $this->repository->updateTeamCredential($id, $updateData, $adminUserId);

            error_log("Update result: " . ($updateResult ? 'SUCCESS' : 'FAILED'));

            if (!$updateResult) {
                error_log("Repository update failed for ID: " . $id);
                return ['success' => false, 'errors' => ['general' => 'Failed to update featured status']];
            }

            // Log activity
            try {
                $this->activityLogger->logActivity(
                    $adminUserId,
                    'team_credentials_featured_updated',
                    'Team credential featured status updated',
                    [
                        'credential_id' => $id,
                        'tournament_id' => $existingCredential['tournament_id'],
                        'team_id' => $existingCredential['team_id'],
                        'team_name' => $existingCredential['team_name'],
                        'is_featured' => $isFeatured
                    ]
                );
            } catch (Exception $logError) {
                error_log("Failed to log activity: " . $logError->getMessage());
                // Don't fail the whole operation if activity logging fails
            }

            // Get the updated credential
            $credential = $this->repository->getTeamCredentialById($id);

            error_log("Featured status updated successfully for ID: " . $id);

            return [
                'success' => true,
                'credential' => $credential
            ];

        } catch (Exception $e) {
            error_log("Exception in updateFeaturedStatus: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return ['success' => false, 'errors' => ['general' => 'Failed to update featured status: ' . $e->getMessage()]];
        }
    }

    /**
     * Delete team credentials and associated files
     */
    public function deleteTeamCredentials(int $id, int $adminUserId): array
    {
        try {
            // Get existing credential
            $credential = $this->repository->getTeamCredentialById($id);
            if (!$credential) {
                return ['success' => false, 'errors' => ['general' => 'Team credential not found']];
            }

            // Soft delete the credential
            $deleteResult = $this->repository->deleteTeamCredential($id, $adminUserId);

            if (!$deleteResult) {
                return ['success' => false, 'errors' => ['general' => 'Failed to delete team credential']];
            }

            // Delete associated files
            error_log("Deleting associated files for credential ID: " . $id);
            if ($credential['logo_filename']) {
                error_log("Deleting logo file: " . $credential['logo_filename']);
                $logoDeleted = $this->deleteFile($credential['logo_filename'], 'logo');
                error_log("Logo deletion result: " . ($logoDeleted ? 'SUCCESS' : 'FAILED'));
            }
            if ($credential['banner_filename']) {
                error_log("Deleting banner file: " . $credential['banner_filename']);
                $bannerDeleted = $this->deleteFile($credential['banner_filename'], 'banner');
                error_log("Banner deletion result: " . ($bannerDeleted ? 'SUCCESS' : 'FAILED'));
            }

            // Log activity
            $this->activityLogger->logActivity(
                $adminUserId,
                'team_credentials_deleted',
                'Team credentials deleted',
                [
                    'credential_id' => $id,
                    'tournament_id' => $credential['tournament_id'],
                    'team_id' => $credential['team_id'],
                    'team_name' => $credential['team_name']
                ]
            );

            return ['success' => true];

        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['general' => 'Failed to delete team credentials: ' . $e->getMessage()]];
        }
    }

    /**
     * Delete individual image (logo or banner) from a team credential
     */
    public function deleteTeamCredentialImage(int $id, string $type, int $adminUserId): array
    {
        try {
            // Validate type
            if (!in_array($type, ['logo', 'banner'])) {
                return ['success' => false, 'errors' => ['type' => 'Invalid image type']];
            }

            // Get existing credential
            $credential = $this->repository->getTeamCredentialById($id);
            if (!$credential) {
                return ['success' => false, 'errors' => ['general' => 'Team credential not found']];
            }

            $filenameField = $type . '_filename';
            $urlField = $type . '_url';

            if (empty($credential[$filenameField])) {
                return ['success' => false, 'errors' => ['general' => ucfirst($type) . ' not found']];
            }

            // Delete the file from disk
            error_log("=== DELETE IMAGE DEBUG ===");
            error_log("Deleting {$type} file: " . $credential[$filenameField]);
            $fileDeleted = $this->deleteFile($credential[$filenameField], $type);
            error_log(ucfirst($type) . " file deletion result: " . ($fileDeleted ? 'SUCCESS' : 'FAILED'));

            // Update database to remove filename and URL
            $updateData = [
                $filenameField => null,
                $urlField => null
            ];
            
            error_log("Updating database with: " . json_encode($updateData));
            $updateResult = $this->repository->updateTeamCredential($id, $updateData, $adminUserId);
            error_log("Database update result: " . ($updateResult ? 'SUCCESS' : 'FAILED'));

            if (!$updateResult) {
                return ['success' => false, 'errors' => ['general' => 'Failed to update database']];
            }

            // Log activity
            $this->activityLogger->logActivity(
                $adminUserId,
                'team_credentials_image_deleted',
                ucfirst($type) . ' deleted from team credentials',
                [
                    'credential_id' => $id,
                    'image_type' => $type,
                    'filename' => $credential[$filenameField],
                    'team_name' => $credential['team_name']
                ]
            );

            return ['success' => true];

        } catch (Exception $e) {
            return ['success' => false, 'errors' => ['general' => 'Failed to delete image: ' . $e->getMessage()]];
        }
    }

    /**
     * Convert image to PNG format
     */
    private function convertToPNG(string $sourcePath, string $targetPath): bool
    {
        try {
            // Check if GD library is available
            if (!function_exists('imagecreatefromjpeg')) {
                error_log("GD library not available - imagecreatefromjpeg function does not exist");
                // Fallback: just copy the file
                return copy($sourcePath, $targetPath);
            }

            // Get image info to determine the source type
            $imageInfo = @getimagesize($sourcePath);
            if ($imageInfo === false) {
                error_log("Failed to get image size from: " . $sourcePath);
                // Fallback: just copy the file
                return copy($sourcePath, $targetPath);
            }

            $mimeType = $imageInfo['mime'];
            $sourceImage = null;

            // Create image resource based on source type
            switch ($mimeType) {
                case 'image/jpeg':
                case 'image/jpg':
                    $sourceImage = @imagecreatefromjpeg($sourcePath);
                    if ($sourceImage === false) {
                        error_log("imagecreatefromjpeg failed for: " . $sourcePath);
                    }
                    break;
                case 'image/png':
                    $sourceImage = @imagecreatefrompng($sourcePath);
                    if ($sourceImage === false) {
                        error_log("imagecreatefrompng failed for: " . $sourcePath);
                    }
                    break;
                default:
                    error_log("Unsupported image type: " . $mimeType);
                    // Fallback: just copy the file
                    return copy($sourcePath, $targetPath);
            }

            if ($sourceImage === false) {
                error_log("Failed to create image resource from: " . $sourcePath);
                // Fallback: just copy the file
                return copy($sourcePath, $targetPath);
            }

            // Preserve transparency for PNG
            imagealphablending($sourceImage, false);
            imagesavealpha($sourceImage, true);

            // Save as PNG
            $result = @imagepng($sourceImage, $targetPath, 9); // 9 = maximum compression

            // Free up memory
            imagedestroy($sourceImage);

            if ($result === false) {
                error_log("Failed to save PNG image to: " . $targetPath);
                // Fallback: just copy the file
                return copy($sourcePath, $targetPath);
            }

            error_log("Successfully converted image to PNG: " . $targetPath);
            return true;

        } catch (Exception $e) {
            error_log("Error converting image to PNG: " . $e->getMessage());
            // Fallback: just copy the file
            return copy($sourcePath, $targetPath);
        } catch (\Throwable $e) {
            error_log("Fatal error converting image to PNG: " . $e->getMessage());
            // Fallback: just copy the file
            return copy($sourcePath, $targetPath);
        }
    }

    /**
     * Get file extension from filename
     */
    private function getFileExtension(string $filename): string
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($extension, $this->allowedExtensions) ? $extension : 'png';
    }
}