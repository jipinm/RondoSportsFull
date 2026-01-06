<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Service\DatabaseService;
use XS2EventProxy\Service\ActivityLoggerService;
use XS2EventProxy\Service\RoleValidationService;
use XS2EventProxy\Exception\RoleManagementException;

class RolesManagementController
{
    private DatabaseService $db;
    private LoggerInterface $logger;
    private ActivityLoggerService $activityLogger;
    private RoleValidationService $roleValidator;

    public function __construct(
        DatabaseService $db, 
        LoggerInterface $logger, 
        ActivityLoggerService $activityLogger,
        RoleValidationService $roleValidator
    ) {
        $this->db = $db;
        $this->logger = $logger;
        $this->activityLogger = $activityLogger;
        $this->roleValidator = $roleValidator;
    }

    /**
     * Get all roles
     */
    public function getRoles(Request $request, Response $response): Response
    {
        try {
            $query = "
                SELECT 
                    r.id, r.name, r.display_name, r.description, r.level, r.is_system,
                    r.created_at, r.updated_at,
                    COUNT(DISTINCT rp.permission_id) as permission_count,
                    COUNT(DISTINCT au.id) as user_count
                FROM roles r
                LEFT JOIN role_permissions rp ON r.id = rp.role_id
                LEFT JOIN admin_users au ON r.name = au.role
                GROUP BY r.id
                ORDER BY r.level DESC, r.name ASC
            ";
            
            $stmt = $this->db->getConnection()->query($query);
            $roles = $stmt->fetchAll();
            
            $responseData = [
                'success' => true,
                'data' => $roles
            ];
            
            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            $this->logger->error('Error fetching roles', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, 'Failed to fetch roles', 500);
        }
    }

    /**
     * Get single role with permissions
     */
    public function getRole(Request $request, Response $response, array $args): Response
    {
        try {
            $roleId = (int)$args['id'];
            
            // Get role details
            $stmt = $this->db->getConnection()->prepare("
                SELECT * FROM roles WHERE id = :id
            ");
            $stmt->execute(['id' => $roleId]);
            $role = $stmt->fetch();
            
            if (!$role) {
                return $this->errorResponse($response, 'Role not found', 404);
            }
            
            // Get role permissions
            $stmt = $this->db->getConnection()->prepare("
                SELECT p.*
                FROM permissions p
                INNER JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = :role_id
                ORDER BY p.category, p.name
            ");
            $stmt->execute(['role_id' => $roleId]);
            $permissions = $stmt->fetchAll();
            
            $role['permissions'] = $permissions;
            
            $responseData = [
                'success' => true,
                'data' => $role
            ];
            
            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            $this->logger->error('Error fetching role', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, 'Failed to fetch role', 500);
        }
    }

    /**
     * Create new role
     */
    public function createRole(Request $request, Response $response): Response
    {
        try {
            $data = $request->getParsedBody();
            $currentUser = $request->getAttribute('user');
            
            // Validation using the new validation service
            $errors = $this->roleValidator->validateRoleCreation($data);
            if (!empty($errors)) {
                throw RoleManagementException::validationFailed($errors);
            }
            
            // Insert role
            $query = "
                INSERT INTO roles (name, display_name, description, level, is_system, created_at, updated_at)
                VALUES (:name, :display_name, :description, :level, 0, NOW(), NOW())
            ";
            
            $stmt = $this->db->getConnection()->prepare($query);
            $stmt->execute([
                'name' => $data['name'],
                'display_name' => $data['display_name'],
                'description' => $data['description'] ?? null,
                'level' => $data['level'] ?? 50
            ]);
            
            $roleId = (int)$this->db->getConnection()->lastInsertId();
            
            // Assign permissions if provided
            if (!empty($data['permission_ids']) && is_array($data['permission_ids'])) {
                $this->assignPermissions($roleId, $data['permission_ids']);
            } elseif (!empty($data['permissions']) && is_array($data['permissions'])) {
                // Also support 'permissions' for backward compatibility
                $this->assignPermissions($roleId, $data['permissions']);
            } elseif (!empty($data['selectedPermissions']) && is_array($data['selectedPermissions'])) {
                // Support 'selectedPermissions' from frontend
                $this->assignPermissions($roleId, $data['selectedPermissions']);
            }
            
            // Enhanced activity logging
            $this->logActivity($currentUser['id'], 'role.created', "Created role: {$data['name']}", [
                'role_id' => $roleId,
                'name' => $data['name'],
                'display_name' => $data['display_name'],
                'level' => $data['level'] ?? 50,
                'permissions_count' => count($data['permission_ids'] ?? $data['permissions'] ?? [])
            ]);
            
            $responseData = [
                'success' => true,
                'message' => 'Role created successfully',
                'data' => ['id' => $roleId]
            ];
            
            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
            
        } catch (RoleManagementException $e) {
            return $this->handleRoleManagementException($response, $e);
        } catch (\Exception $e) {
            $this->logger->error('Error creating role', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, 'Failed to create role', 500);
        }
    }

    /**
     * Update role
     */
    public function updateRole(Request $request, Response $response, array $args): Response
    {
        try {
            $roleId = (int)$args['id'];
            $data = $request->getParsedBody();
            $currentUser = $request->getAttribute('user');
            
            // Validation using the new validation service
            $errors = $this->roleValidator->validateRoleUpdate($roleId, $data);
            if (!empty($errors)) {
                throw RoleManagementException::validationFailed($errors);
            }
            
            // Get existing role for logging
            $existingRole = $this->roleValidator->getRoleDetails($roleId);
            
            // Build update query
            $updates = [];
            $bindings = ['id' => $roleId];
            
            if (isset($data['name'])) {
                $updates[] = "name = :name";
                $bindings['name'] = $data['name'];
            }
            
            if (isset($data['display_name'])) {
                $updates[] = "display_name = :display_name";
                $bindings['display_name'] = $data['display_name'];
            }
            
            if (isset($data['description'])) {
                $updates[] = "description = :description";
                $bindings['description'] = $data['description'];
            }
            
            if (isset($data['level'])) {
                $updates[] = "level = :level";
                $bindings['level'] = $data['level'];
            }
            
            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $query = "UPDATE roles SET " . implode(', ', $updates) . " WHERE id = :id";
                $stmt = $this->db->getConnection()->prepare($query);
                $stmt->execute($bindings);
            }
            
            // Update permissions if provided
            if (isset($data['permission_ids']) && is_array($data['permission_ids'])) {
                // Remove existing permissions
                $stmt = $this->db->getConnection()->prepare("DELETE FROM role_permissions WHERE role_id = :role_id");
                $stmt->execute(['role_id' => $roleId]);
                
                // Assign new permissions
                $this->assignPermissions($roleId, $data['permission_ids']);
            } elseif (isset($data['permissions']) && is_array($data['permissions'])) {
                // Also support 'permissions' for backward compatibility
                // Remove existing permissions
                $stmt = $this->db->getConnection()->prepare("DELETE FROM role_permissions WHERE role_id = :role_id");
                $stmt->execute(['role_id' => $roleId]);
                
                // Assign new permissions
                $this->assignPermissions($roleId, $data['permissions']);
            } elseif (isset($data['selectedPermissions']) && is_array($data['selectedPermissions'])) {
                // Support 'selectedPermissions' from frontend
                // Remove existing permissions
                $stmt = $this->db->getConnection()->prepare("DELETE FROM role_permissions WHERE role_id = :role_id");
                $stmt->execute(['role_id' => $roleId]);
                
                // Assign new permissions
                $this->assignPermissions($roleId, $data['selectedPermissions']);
            }
            
            // Enhanced activity logging
            $this->logActivity($currentUser['id'], 'role.updated', "Updated role: {$existingRole['name']}", [
                'role_id' => $roleId,
                'changes' => array_keys($data),
                'old_values' => $existingRole,
                'new_values' => $data
            ]);
            
            $responseData = [
                'success' => true,
                'message' => 'Role updated successfully'
            ];
            
            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');
            
        } catch (RoleManagementException $e) {
            return $this->handleRoleManagementException($response, $e);
        } catch (\Exception $e) {
            $this->logger->error('Error updating role', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, 'Failed to update role', 500);
        }
    }

    /**
     * Delete role
     */
    public function deleteRole(Request $request, Response $response, array $args): Response
    {
        try {
            $roleId = (int)$args['id'];
            $currentUser = $request->getAttribute('user');
            
            // Validation using the new validation service
            $errors = $this->roleValidator->validateRoleDeletion($roleId);
            if (!empty($errors)) {
                throw RoleManagementException::validationFailed($errors);
            }
            
            // Get role details for logging
            $role = $this->roleValidator->getRoleDetails($roleId);
            
            // Delete role (cascade will delete role_permissions)
            $stmt = $this->db->getConnection()->prepare("DELETE FROM roles WHERE id = :id");
            $stmt->execute(['id' => $roleId]);
            
            // Enhanced activity logging
            $this->logActivity($currentUser['id'], 'role.deleted', "Deleted role: {$role['name']}", [
                'role_id' => $roleId,
                'deleted_role' => $role
            ]);
            
            $responseData = [
                'success' => true,
                'message' => 'Role deleted successfully'
            ];
            
            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');
            
        } catch (RoleManagementException $e) {
            return $this->handleRoleManagementException($response, $e);
        } catch (\Exception $e) {
            $this->logger->error('Error deleting role', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, 'Failed to delete role', 500);
        }
    }

    /**
     * Get all permissions grouped by category
     */
    public function getPermissions(Request $request, Response $response): Response
    {
        try {
            $query = "
                SELECT * FROM permissions 
                ORDER BY category, name
            ";
            
            $stmt = $this->db->getConnection()->query($query);
            $permissions = $stmt->fetchAll();
            
            // Group by category
            $grouped = [];
            foreach ($permissions as $permission) {
                $category = $permission['category'];
                if (!isset($grouped[$category])) {
                    $grouped[$category] = [];
                }
                $grouped[$category][] = $permission;
            }
            
            $responseData = [
                'success' => true,
                'data' => [
                    'permissions' => $permissions,
                    'grouped' => $grouped
                ]
            ];
            
            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            $this->logger->error('Error fetching permissions', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, 'Failed to fetch permissions', 500);
        }
    }

    /**
     * Validate role deletion (check for assigned users)
     */
    public function validateRoleDeletion(Request $request, Response $response, array $args): Response
    {
        try {
            $roleId = (int)$args['id'];
            
            // Check if role exists
            $stmt = $this->db->getConnection()->prepare("SELECT * FROM roles WHERE id = :id");
            $stmt->execute(['id' => $roleId]);
            $role = $stmt->fetch();
            
            if (!$role) {
                return $this->errorResponse($response, 'Role not found', 404);
            }
            
            // Check how many users are assigned to this role
            $stmt = $this->db->getConnection()->prepare("
                SELECT COUNT(*) as user_count 
                FROM admin_users 
                WHERE role = :role_name
            ");
            $stmt->execute(['role_name' => $role['name']]);
            $userCount = $stmt->fetchColumn();
            
            $warnings = [];
            $canDelete = true;
            
            if ($userCount > 0) {
                $warnings[] = "This role is assigned to {$userCount} user(s). Deleting it will affect these users.";
                // For now, allow deletion but show warning. You can set $canDelete = false to prevent deletion
            }
            
            if ($role['is_system']) {
                $warnings[] = "This is a system role. Deleting it may affect system functionality.";
                // Uncomment the next line to prevent deletion of system roles
                // $canDelete = false;
            }
            
            $responseData = [
                'success' => true,
                'data' => [
                    'can_delete' => $canDelete,
                    'user_count' => (int)$userCount,
                    'warnings' => $warnings
                ]
            ];
            
            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            $this->logger->error('Error validating role deletion', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, 'Failed to validate role deletion', 500);
        }
    }

    /**
     * Assign permissions to role
     */
    private function assignPermissions(int $roleId, array $permissionIds): void
    {
        if (empty($permissionIds)) {
            return;
        }
        
        try {
            $stmt = $this->db->getConnection()->prepare("
                INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
                VALUES (:role_id, :permission_id, NOW())
            ");
            
            foreach ($permissionIds as $permissionId) {
                $stmt->execute([
                    'role_id' => $roleId,
                    'permission_id' => (int)$permissionId
                ]);
            }
        } catch (\Exception $e) {
            // Log error but don't break the role creation
            $this->logger->error('Error assigning permissions', [
                'role_id' => $roleId,
                'permission_ids' => $permissionIds,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Enhanced activity logging
     */
    private function logActivity(int $userId, string $action, string $description, array $metadata = []): void
    {
        try {
            $this->activityLogger->logActivity(
                $userId,
                $action,
                $description,
                $metadata
            );
        } catch (\Exception $e) {
            $this->logger->error('Failed to log role management activity', [
                'user_id' => $userId,
                'action' => $action,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle RoleManagementException
     */
    private function handleRoleManagementException(Response $response, RoleManagementException $exception): Response
    {
        $this->logger->warning('Role management exception', [
            'error' => $exception->getMessage(),
            'code' => $exception->getStringCode(),
            'details' => $exception->getDetails()
        ]);

        $response->getBody()->write(json_encode($exception->toArray(), JSON_PRETTY_PRINT));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($exception->getCode());
    }

    /**
     * Error response helper
     */
    private function errorResponse(Response $response, string $message, int $status = 400, array $errors = []): Response
    {
        $data = [
            'success' => false,
            'error' => $message
        ];
        
        if ($errors) {
            $data['errors'] = $errors;
        }
        
        $response->getBody()->write(json_encode($data, JSON_PRETTY_PRINT));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
}
