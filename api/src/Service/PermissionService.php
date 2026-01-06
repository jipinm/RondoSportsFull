<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use Psr\Log\LoggerInterface;

/**
 * Permission Service
 *
 * Handles role-based access control permissions with database integration
 */
class PermissionService
{
    private LoggerInterface $logger;
    private ?DatabaseService $database;

    // Define role hierarchy (higher number = more permissions)
    private const ROLE_HIERARCHY = [
        'super_admin' => 100,
        'admin' => 90,
        'manager' => 75,
        'staff' => 50,
        'viewer' => 25,
    ];

    // Define granular permissions for each role
    private const ROLE_PERMISSIONS = [
        'admin' => [
            // User Management
            'users.view',
            'users.create',
            'users.edit',
            'users.delete',
            'users.manage_roles',

            // Booking Management
            'bookings.view',
            'bookings.create',
            'bookings.edit',
            'bookings.delete',
            'bookings.approve',

            // Refund Management
            'refunds.view',
            'refunds.process',
            'refunds.approve',

            // Content Management
            'content.view',
            'content.create',
            'content.edit',
            'content.delete',
            'content.publish',

            // Reports & Analytics
            'reports.view',
            'reports.export',
            'analytics.view',

            // System Administration
            'system.settings',
            'system.logs',
            'system.backup',
        ],

        'manager' => [
            // User Management (limited)
            'users.view',

            // Booking Management
            'bookings.view',
            'bookings.create',
            'bookings.edit',
            'bookings.approve',

            // Refund Management
            'refunds.view',
            'refunds.process',

            // Content Management
            'content.view',
            'content.create',
            'content.edit',

            // Reports
            'reports.view',
        ],

        'staff' => [
            // Basic User Management
            'users.view',

            // Booking Management
            'bookings.view',
            'bookings.create',
            'bookings.edit',

            // Content Management (read-only)
            'content.view',
        ],

        'viewer' => [
            // Read-only access
            'users.view',
            'bookings.view',
            'content.view',
            'reports.view',
        ],
    ];

    public function __construct(LoggerInterface $logger, DatabaseService $database = null)
    {
        $this->logger = $logger;
        $this->database = $database;
    }

    /**
     * Get permissions from database for a role
     */
    public function getDatabaseRolePermissions(int $roleId): array
    {
        if (!$this->database) {
            return [];
        }

        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT p.name, p.display_name, p.description, p.category
                FROM permissions p
                INNER JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = :role_id
                ORDER BY p.category, p.name
            ");
            $stmt->execute(['role_id' => $roleId]);
            return $stmt->fetchAll();
        } catch (\Exception $e) {
            $this->logger->error('Failed to get database role permissions', [
                'role_id' => $roleId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Check if user has permission based on database
     */
    public function hasDatabasePermission(int $userId, string $permission): bool
    {
        if (!$this->database) {
            return false;
        }

        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT COUNT(*) as count
                FROM admin_users au
                INNER JOIN roles r ON au.role_id = r.id
                INNER JOIN role_permissions rp ON r.id = rp.role_id
                INNER JOIN permissions p ON rp.permission_id = p.id
                WHERE au.id = :user_id AND p.name = :permission
            ");
            $stmt->execute(['user_id' => $userId, 'permission' => $permission]);
            $result = $stmt->fetch();
            return ($result['count'] ?? 0) > 0;
        } catch (\Exception $e) {
            $this->logger->error('Failed to check database permission', [
                'user_id' => $userId,
                'permission' => $permission,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get user role from database
     */
    public function getUserRoleFromDatabase(int $userId): ?array
    {
        if (!$this->database) {
            return null;
        }

        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT r.id, r.name, r.display_name, r.level, r.is_system
                FROM admin_users au
                INNER JOIN roles r ON au.role_id = r.id
                WHERE au.id = :user_id
            ");
            $stmt->execute(['user_id' => $userId]);
            return $stmt->fetch() ?: null;
        } catch (\Exception $e) {
            $this->logger->error('Failed to get user role from database', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Check if user has permission (database-first approach with fallback)
     */
    public function hasPermission(string $role, string $permission): bool
    {
        // Try database first if available
        if ($this->database) {
            try {
                $stmt = $this->database->getConnection()->prepare("
                    SELECT COUNT(*) as count
                    FROM roles r
                    INNER JOIN role_permissions rp ON r.id = rp.role_id
                    INNER JOIN permissions p ON rp.permission_id = p.id
                    WHERE r.name = :role AND p.name = :permission
                ");
                $stmt->execute(['role' => $role, 'permission' => $permission]);
                $result = $stmt->fetch();
                return ($result['count'] ?? 0) > 0;
            } catch (\Exception $e) {
                $this->logger->warning('Database permission check failed, falling back to hardcoded', [
                    'role' => $role,
                    'permission' => $permission,
                    'error' => $e->getMessage()
                ]);
            }
        }

        // Fallback to hardcoded permissions
        if (!isset(self::ROLE_PERMISSIONS[$role])) {
            $this->logger->warning('Unknown role in permission check', [
                'role' => $role,
                'permission' => $permission
            ]);
            return false;
        }

        return in_array($permission, self::ROLE_PERMISSIONS[$role]);
    }

    /**
     * Check if user has specific permission (legacy method)
     */

    /**
     * Check if user has any of the specified permissions
     */
    public function hasAnyPermission(string $role, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($role, $permission)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user has all of the specified permissions
     */
    public function hasAllPermissions(string $role, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!$this->hasPermission($role, $permission)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if user role is sufficient for minimum role requirement
     */
    public function hasMinimumRole(string $userRole, string $requiredRole): bool
    {
        if (!isset(self::ROLE_HIERARCHY[$userRole]) || !isset(self::ROLE_HIERARCHY[$requiredRole])) {
            return false;
        }

        return self::ROLE_HIERARCHY[$userRole] >= self::ROLE_HIERARCHY[$requiredRole];
    }

    /**
     * Get all permissions for a role
     */
    public function getRolePermissions(string $role): array
    {
        return self::ROLE_PERMISSIONS[$role] ?? [];
    }

    /**
     * Get all available roles
     */
    public function getAvailableRoles(): array
    {
        return array_keys(self::ROLE_HIERARCHY);
    }

    /**
     * Get role hierarchy level
     */
    public function getRoleLevel(string $role): int
    {
        return self::ROLE_HIERARCHY[$role] ?? 0;
    }

    /**
     * Check if role can manage other roles
     */
    public function canManageRole(string $managerRole, string $targetRole): bool
    {
        // Can only manage roles with lower or equal hierarchy
        return $this->getRoleLevel($managerRole) >= $this->getRoleLevel($targetRole);
    }

    /**
     * Get roles that a user can manage
     */
    public function getManageableRoles(string $userRole): array
    {
        $userLevel = $this->getRoleLevel($userRole);
        $manageableRoles = [];

        foreach (self::ROLE_HIERARCHY as $role => $level) {
            if ($level <= $userLevel) {
                $manageableRoles[] = $role;
            }
        }

        return $manageableRoles;
    }

    /**
     * Validate role exists
     */
    public function isValidRole(string $role): bool
    {
        return isset(self::ROLE_HIERARCHY[$role]);
    }

    /**
     * Get permission categories for UI display
     */
    public function getPermissionCategories(): array
    {
        return [
            'user_management' => [
                'title' => 'User Management',
                'permissions' => [
                    'users.view' => 'View Users',
                    'users.create' => 'Create Users',
                    'users.edit' => 'Edit Users',
                    'users.delete' => 'Delete Users',
                    'users.manage_roles' => 'Manage User Roles',
                ]
            ],
            'booking_management' => [
                'title' => 'Booking Management',
                'permissions' => [
                    'bookings.view' => 'View Bookings',
                    'bookings.create' => 'Create Bookings',
                    'bookings.edit' => 'Edit Bookings',
                    'bookings.delete' => 'Delete Bookings',
                    'bookings.approve' => 'Approve Bookings',
                ]
            ],
            'refund_management' => [
                'title' => 'Refund Management',
                'permissions' => [
                    'refunds.view' => 'View Refunds',
                    'refunds.process' => 'Process Refunds',
                    'refunds.approve' => 'Approve Refunds',
                ]
            ],
            'content_management' => [
                'title' => 'Content Management',
                'permissions' => [
                    'content.view' => 'View Content',
                    'content.create' => 'Create Content',
                    'content.edit' => 'Edit Content',
                    'content.delete' => 'Delete Content',
                    'content.publish' => 'Publish Content',
                ]
            ],
            'reports_analytics' => [
                'title' => 'Reports & Analytics',
                'permissions' => [
                    'reports.view' => 'View Reports',
                    'reports.export' => 'Export Reports',
                    'analytics.view' => 'View Analytics',
                ]
            ],
            'system_administration' => [
                'title' => 'System Administration',
                'permissions' => [
                    'system.settings' => 'System Settings',
                    'system.logs' => 'View System Logs',
                    'system.backup' => 'System Backup',
                ]
            ]
        ];
    }
}
