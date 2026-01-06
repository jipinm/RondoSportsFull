<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use XS2EventProxy\Service\DatabaseService;
use Psr\Log\LoggerInterface;

class RoleValidationService
{
    private DatabaseService $database;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $database, LoggerInterface $logger)
    {
        $this->database = $database;
        $this->logger = $logger;
    }

    /**
     * Validate role creation data
     */
    public function validateRoleCreation(array $data): array
    {
        $errors = [];

        // Name validation
        if (empty($data['name'])) {
            $errors['name'] = 'Role name is required';
        } elseif (strlen($data['name']) < 2) {
            $errors['name'] = 'Role name must be at least 2 characters';
        } elseif (strlen($data['name']) > 50) {
            $errors['name'] = 'Role name must not exceed 50 characters';
        } elseif ($this->roleNameExists($data['name'])) {
            $errors['name'] = 'Role name already exists';
        }

        // Display name validation
        if (empty($data['display_name'])) {
            $errors['display_name'] = 'Display name is required';
        } elseif (strlen($data['display_name']) < 2) {
            $errors['display_name'] = 'Display name must be at least 2 characters';
        } elseif (strlen($data['display_name']) > 100) {
            $errors['display_name'] = 'Display name must not exceed 100 characters';
        }

        // Level validation
        if (isset($data['level'])) {
            if (!is_numeric($data['level']) || $data['level'] < 0 || $data['level'] > 100) {
                $errors['level'] = 'Level must be between 0 and 100';
            }
        }

        // Permission validation - check both 'permissions' and 'permission_ids'
        $permissionField = isset($data['permission_ids']) ? 'permission_ids' : 'permissions';
        if (isset($data[$permissionField]) && is_array($data[$permissionField])) {
            $invalidPermissions = $this->validatePermissions($data[$permissionField]);
            if (!empty($invalidPermissions)) {
                $errors[$permissionField] = 'Invalid permission IDs: ' . implode(', ', $invalidPermissions);
            }
        }

        return $errors;
    }

    /**
     * Validate role update data
     */
    public function validateRoleUpdate(int $roleId, array $data): array
    {
        $errors = [];

        // Check if role exists
        if (!$this->roleExists($roleId)) {
            $errors['role'] = 'Role not found';
            return $errors;
        }

        // Check if role is system role
        if ($this->isSystemRole($roleId)) {
            $errors['role'] = 'Cannot modify system roles';
            return $errors;
        }

        // Validate fields if provided
        if (isset($data['name'])) {
            if (!preg_match('/^[a-z_]+$/', $data['name'])) {
                $errors['name'] = 'Role name must contain only lowercase letters and underscores';
            } elseif ($this->roleNameExists($data['name'], $roleId)) {
                $errors['name'] = 'Role name already exists';
            }
        }

        if (isset($data['display_name'])) {
            if (strlen($data['display_name']) < 2 || strlen($data['display_name']) > 100) {
                $errors['display_name'] = 'Display name must be between 2 and 100 characters';
            }
        }

        if (isset($data['level'])) {
            if (!is_numeric($data['level']) || $data['level'] < 0 || $data['level'] > 100) {
                $errors['level'] = 'Level must be between 0 and 100';
            }
        }

        // Permission validation
        if (isset($data['permissions']) && is_array($data['permissions'])) {
            $invalidPermissions = $this->validatePermissions($data['permissions']);
            if (!empty($invalidPermissions)) {
                $errors['permissions'] = 'Invalid permission IDs: ' . implode(', ', $invalidPermissions);
            }
        }

        return $errors;
    }

    /**
     * Validate role deletion
     */
    public function validateRoleDeletion(int $roleId): array
    {
        $errors = [];

        if (!$this->roleExists($roleId)) {
            $errors['role'] = 'Role not found';
            return $errors;
        }

        if ($this->isSystemRole($roleId)) {
            $errors['role'] = 'Cannot delete system roles';
            return $errors;
        }

        $userCount = $this->getRoleUserCount($roleId);
        if ($userCount > 0) {
            $errors['users'] = "Cannot delete role. {$userCount} user(s) are assigned to this role";
        }

        return $errors;
    }

    /**
     * Check if role name exists
     */
    private function roleNameExists(string $name, int $excludeId = null): bool
    {
        try {
            $sql = "SELECT COUNT(*) as count FROM roles WHERE name = :name";
            $params = ['name' => $name];

            if ($excludeId) {
                $sql .= " AND id != :exclude_id";
                $params['exclude_id'] = $excludeId;
            }

            $stmt = $this->database->getConnection()->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch();
            return ($result['count'] ?? 0) > 0;
        } catch (\Exception $e) {
            $this->logger->error('Error checking role name existence', [
                'name' => $name,
                'exclude_id' => $excludeId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Check if role exists
     */
    private function roleExists(int $roleId): bool
    {
        try {
            $stmt = $this->database->getConnection()->prepare("SELECT COUNT(*) as count FROM roles WHERE id = :id");
            $stmt->execute(['id' => $roleId]);
            $result = $stmt->fetch();
            return ($result['count'] ?? 0) > 0;
        } catch (\Exception $e) {
            $this->logger->error('Error checking role existence', [
                'role_id' => $roleId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Check if role is system role
     */
    private function isSystemRole(int $roleId): bool
    {
        try {
            $stmt = $this->database->getConnection()->prepare("SELECT is_system FROM roles WHERE id = :id");
            $stmt->execute(['id' => $roleId]);
            $result = $stmt->fetch();
            return ($result['is_system'] ?? 0) == 1;
        } catch (\Exception $e) {
            $this->logger->error('Error checking if role is system role', [
                'role_id' => $roleId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get number of users assigned to role
     */
    private function getRoleUserCount(int $roleId): int
    {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT COUNT(*) as count 
                FROM admin_users au 
                INNER JOIN roles r ON au.role_id = r.id 
                WHERE r.id = :role_id
            ");
            $stmt->execute(['role_id' => $roleId]);
            $result = $stmt->fetch();
            return (int)($result['count'] ?? 0);
        } catch (\Exception $e) {
            $this->logger->error('Error getting role user count', [
                'role_id' => $roleId,
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * Validate permission IDs
     */
    private function validatePermissions(array $permissionIds): array
    {
        if (empty($permissionIds)) {
            return [];
        }

        try {
            $placeholders = str_repeat('?,', count($permissionIds) - 1) . '?';
            $stmt = $this->database->getConnection()->prepare("
                SELECT id FROM permissions WHERE id IN ({$placeholders})
            ");
            $stmt->execute($permissionIds);
            $validIds = array_column($stmt->fetchAll(), 'id');

            return array_diff($permissionIds, $validIds);
        } catch (\Exception $e) {
            $this->logger->error('Error validating permissions', [
                'permission_ids' => $permissionIds,
                'error' => $e->getMessage()
            ]);
            return $permissionIds; // Return all as invalid if error occurs
        }
    }

    /**
     * Get role details for validation
     */
    public function getRoleDetails(int $roleId): ?array
    {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT id, name, display_name, description, level, is_system, created_at, updated_at
                FROM roles 
                WHERE id = :id
            ");
            $stmt->execute(['id' => $roleId]);
            $role = $stmt->fetch();
            return $role ?: null;
        } catch (\Exception $e) {
            $this->logger->error('Error getting role details', [
                'role_id' => $roleId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Check if user can manage a specific role
     */
    public function canUserManageRole(string $userRole, int $targetRoleId): bool
    {
        // Super admin can manage all roles except system roles
        if ($userRole === 'super_admin') {
            return !$this->isSystemRole($targetRoleId);
        }

        // Admin can manage non-system roles with lower or equal level
        if ($userRole === 'admin') {
            if ($this->isSystemRole($targetRoleId)) {
                return false;
            }

            $targetRole = $this->getRoleDetails($targetRoleId);
            if (!$targetRole) {
                return false;
            }

            // Admin level is typically 90, can manage roles with level <= 85
            return $targetRole['level'] <= 85;
        }

        // Other roles cannot manage roles
        return false;
    }
}