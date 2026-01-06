<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Service\PermissionService;
use XS2EventProxy\Repository\AdminUserRepository;

/**
 * Roles and Permissions Management Controller
 *
 * Handles role-based access control administration
 */
class RolesController
{
    private PermissionService $permissionService;
    private AdminUserRepository $userRepo;
    private LoggerInterface $logger;

    public function __construct(
        PermissionService $permissionService,
        AdminUserRepository $userRepo,
        LoggerInterface $logger
    ) {
        $this->permissionService = $permissionService;
        $this->userRepo = $userRepo;
        $this->logger = $logger;
    }

    /**
     * Get all available roles
     */
    public function getRoles(Request $request, Response $response): Response
    {
        try {
            $user = $request->getAttribute('user');

            if (!$user) {
                return $this->forbiddenResponse('User not authenticated');
            }

            // Only admins can view roles
            if (!$this->permissionService->hasPermission($user['role'], 'users.manage_roles')) {
                return $this->forbiddenResponse('Insufficient permissions to view roles');
            }

            $roles = [];
            foreach ($this->permissionService->getAvailableRoles() as $role) {
                $roles[] = [
                    'name' => $role,
                    'level' => $this->permissionService->getRoleLevel($role),
                    'permissions' => $this->permissionService->getRolePermissions($role),
                    'manageable_by' => $this->permissionService->getManageableRoles($role)
                ];
            }

            return $this->jsonResponse($response, [
                'success' => true,
                'data' => [
                    'roles' => $roles,
                    'total' => count($roles)
                ]
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Get roles error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get permissions for a specific role
     */
    public function getRolePermissions(Request $request, Response $response, array $args): Response
    {
        try {
            $user = $request->getAttribute('user');
            $role = $args['role'] ?? '';

            if (!$user) {
                return $this->forbiddenResponse('User not authenticated');
            }

            if (!$this->permissionService->isValidRole($role)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid role specified'
                ], 400);
            }

            // Check if user can manage this role
            if (!$this->permissionService->canManageRole($user['role'], $role)) {
                return $this->forbiddenResponse('Insufficient permissions to view this role');
            }

            return $this->jsonResponse($response, [
                'success' => true,
                'data' => [
                    'role' => $role,
                    'level' => $this->permissionService->getRoleLevel($role),
                    'permissions' => $this->permissionService->getRolePermissions($role),
                    'categories' => $this->permissionService->getPermissionCategories()
                ]
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Get role permissions error', [
                'role' => $role,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get current user permissions
     */
    public function getCurrentUserPermissions(Request $request, Response $response): Response
    {
        try {
            $user = $request->getAttribute('user');

            if (!$user) {
                return $this->forbiddenResponse('User not authenticated');
            }

            $userRole = $user['role'];

            return $this->jsonResponse($response, [
                'success' => true,
                'data' => [
                    'role' => $userRole,
                    'level' => $this->permissionService->getRoleLevel($userRole),
                    'permissions' => $this->permissionService->getRolePermissions($userRole),
                    'categories' => $this->permissionService->getPermissionCategories()
                ]
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Get current user permissions error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update user role
     */
    public function updateUserRole(Request $request, Response $response, array $args): Response
    {
        try {
            $user = $request->getAttribute('user');
            $data = $request->getParsedBody();
            $targetUserId = (int)($args['userId'] ?? 0);
            $newRole = $data['role'] ?? '';

            if (!$user) {
                return $this->forbiddenResponse('User not authenticated');
            }

            // Only admins can manage roles
            if (!$this->permissionService->hasPermission($user['role'], 'users.manage_roles')) {
                return $this->forbiddenResponse('Insufficient permissions to manage roles');
            }

            if (!$this->permissionService->isValidRole($newRole)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid role specified'
                ], 400);
            }

            // Check if current user can manage the target role
            if (!$this->permissionService->canManageRole($user['role'], $newRole)) {
                return $this->forbiddenResponse('Cannot assign role with higher privileges');
            }

            // Get target user
            $targetUser = $this->userRepo->findById($targetUserId);
            if (!$targetUser) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Target user not found'
                ], 404);
            }

            // Prevent self-demotion
            if ($targetUser['id'] === $user['id'] && !$this->permissionService->hasPermission($newRole, 'users.manage_roles')) {
                return $this->forbiddenResponse('Cannot demote yourself from admin role');
            }

            // Update user role
            $pdo = $this->userRepo->getConnection();
            $stmt = $pdo->prepare("UPDATE admin_users SET role = ? WHERE id = ?");
            $result = $stmt->execute([$newRole, $targetUserId]);

            if ($result) {
                $this->logger->info('User role updated', [
                    'admin_user_id' => $user['id'],
                    'target_user_id' => $targetUserId,
                    'old_role' => $targetUser['role'],
                    'new_role' => $newRole
                ]);

                return $this->jsonResponse($response, [
                    'success' => true,
                    'message' => 'User role updated successfully',
                    'data' => [
                        'user_id' => $targetUserId,
                        'new_role' => $newRole
                    ]
                ]);
            } else {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Failed to update user role'
                ], 500);
            }

        } catch (\Exception $e) {
            $this->logger->error('Update user role error', [
                'user_id' => $user['id'] ?? null,
                'target_user_id' => $targetUserId ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get users by role
     */
    public function getUsersByRole(Request $request, Response $response, array $args): Response
    {
        try {
            $user = $request->getAttribute('user');
            $role = $args['role'] ?? '';

            if (!$user) {
                return $this->forbiddenResponse('User not authenticated');
            }

            // Only admins can view users by role
            if (!$this->permissionService->hasPermission($user['role'], 'users.view')) {
                return $this->forbiddenResponse('Insufficient permissions to view users');
            }

            if (!$this->permissionService->isValidRole($role)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid role specified'
                ], 400);
            }

            // Check if user can view this role's users
            if (!$this->permissionService->canManageRole($user['role'], $role)) {
                return $this->forbiddenResponse('Insufficient permissions to view this role');
            }

            $pdo = $this->userRepo->getConnection();
            $stmt = $pdo->prepare("
                SELECT id, email, name, status, last_login_at, created_at
                FROM admin_users
                WHERE role = ? AND status = 'active'
                ORDER BY created_at DESC
            ");
            $stmt->execute([$role]);
            $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return $this->jsonResponse($response, [
                'success' => true,
                'data' => [
                    'role' => $role,
                    'users' => $users,
                    'count' => count($users)
                ]
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Get users by role error', [
                'role' => $role,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Check if current user has specific permission
     */
    public function checkPermission(Request $request, Response $response): Response
    {
        try {
            $user = $request->getAttribute('user');
            $data = $request->getParsedBody();
            $permission = $data['permission'] ?? '';

            if (!$user) {
                return $this->forbiddenResponse('User not authenticated');
            }

            if (empty($permission)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Permission is required'
                ], 400);
            }

            $hasPermission = $this->permissionService->hasPermission($user['role'], $permission);

            return $this->jsonResponse($response, [
                'success' => true,
                'data' => [
                    'permission' => $permission,
                    'has_permission' => $hasPermission,
                    'user_role' => $user['role']
                ]
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Check permission error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Create JSON response
     */
    private function jsonResponse(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_PRETTY_PRINT));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }

    /**
     * Create forbidden response
     */
    private function forbiddenResponse(string $message): Response
    {
        $response = new \Slim\Psr7\Response();

        $body = json_encode([
            'success' => false,
            'error' => $message,
            'code' => 'FORBIDDEN'
        ], JSON_PRETTY_PRINT);

        $response->getBody()->write($body);

        return $response
            ->withStatus(403)
            ->withHeader('Content-Type', 'application/json');
    }
}
