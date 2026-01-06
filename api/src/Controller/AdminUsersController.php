<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Service\DatabaseService;

class AdminUsersController
{
    private DatabaseService $db;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $db, LoggerInterface $logger)
    {
        $this->db = $db;
        $this->logger = $logger;
    }

    /**
     * Get all admin users with pagination
     */
    public function getUsers(Request $request, Response $response): Response
    {
        try {
            $params = $request->getQueryParams();
            $page = (int)($params['page'] ?? 1);
            $pageSize = (int)($params['page_size'] ?? 20);
            $search = $params['search'] ?? '';
            $role = $params['role'] ?? '';
            $status = $params['status'] ?? '';
            
            $offset = ($page - 1) * $pageSize;
            
            // Build query
            $where = [];
            $bindings = [];
            
            if ($search) {
                $where[] = "(name LIKE :search OR email LIKE :search)";
                $bindings['search'] = "%{$search}%";
            }
            
            if ($role) {
                $where[] = "role = :role";
                $bindings['role'] = $role;
            }
            
            if ($status) {
                $where[] = "status = :status";
                $bindings['status'] = $status;
            }
            
            $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
            
            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM admin_users {$whereClause}";
            $stmt = $this->db->getConnection()->prepare($countQuery);
            $stmt->execute($bindings);
            $total = $stmt->fetch()['total'];
            
            // Get users
            $query = "
                SELECT 
                    id, name, email, role, status, 
                    last_login_at, created_at, updated_at
                FROM admin_users 
                {$whereClause}
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            ";
            
            $stmt = $this->db->getConnection()->prepare($query);
            foreach ($bindings as $key => $value) {
                $stmt->bindValue(":{$key}", $value);
            }
            $stmt->bindValue(':limit', $pageSize, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
            $stmt->execute();
            
            $users = $stmt->fetchAll();
            
            $responseData = [
                'success' => true,
                'data' => $users,
                'pagination' => [
                    'page' => $page,
                    'page_size' => $pageSize,
                    'total' => $total,
                    'total_pages' => ceil($total / $pageSize)
                ]
            ];
            
            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            $this->logger->error('Error fetching users', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, 'Failed to fetch users', 500);
        }
    }

    /**
     * Get single admin user by ID
     */
    public function getUser(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = (int)$args['id'];
            
            $query = "
                SELECT 
                    id, name, email, role, status, 
                    last_login_at, created_at, updated_at
                FROM admin_users 
                WHERE id = :id
            ";
            
            $stmt = $this->db->getConnection()->prepare($query);
            $stmt->execute(['id' => $userId]);
            $user = $stmt->fetch();
            
            if (!$user) {
                return $this->errorResponse($response, 'User not found', 404);
            }
            
            $responseData = [
                'success' => true,
                'data' => $user
            ];
            
            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            $this->logger->error('Error fetching user', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, 'Failed to fetch user', 500);
        }
    }

    /**
     * Create new admin user
     */
    public function createUser(Request $request, Response $response): Response
    {
        try {
            $data = $request->getParsedBody();
            $currentUser = $request->getAttribute('user');

            // Validation
            $errors = $this->validateUserData($data, true);
            if ($errors) {
                return $this->errorResponse($response, 'Validation failed', 400, $errors);
            }

            // Check if email already exists
            $stmt = $this->db->getConnection()->prepare("SELECT id FROM admin_users WHERE email = :email");
            $stmt->execute(['email' => $data['email']]);
            if ($stmt->fetch()) {
                return $this->errorResponse($response, 'Email already exists', 400);
            }

            // Hash password
            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);

            // Insert user
            $query = "
                INSERT INTO admin_users (
                    name, email, password_hash, role, status,
                    password_changed_at, created_at, updated_at
                ) VALUES (
                    :name, :email, :password_hash, :role, :status,
                    NOW(), NOW(), NOW()
                )
            ";

            $stmt = $this->db->getConnection()->prepare($query);

            // Debug logging
            $this->logger->info("Executing insert query", [
                'query' => $query,
                'bindings' => [
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'role' => $data['role'],
                    'status' => $data['status'] ?? 'active'
                ]
            ]);

            $result = $stmt->execute([
                'name' => $data['name'],
                'email' => $data['email'],
                'password_hash' => $passwordHash,
                'role' => $data['role'],
                'status' => $data['status'] ?? 'active'
            ]);

            if (!$result) {
                $errorInfo = $stmt->errorInfo();
                $this->logger->error("Database insert failed", [
                    'error_info' => $errorInfo,
                    'data' => $data
                ]);
                throw new \Exception('Failed to insert user into database: ' . implode(', ', $errorInfo));
            }

            $userId = $this->db->getConnection()->lastInsertId();

            // Verify the role was saved correctly
            $verifyStmt = $this->db->getConnection()->prepare("SELECT role FROM admin_users WHERE id = :id");
            $verifyStmt->execute(['id' => $userId]);
            $savedRole = $verifyStmt->fetch()['role'];

            $this->logger->info("User created successfully - Role: {$data['role']}, Saved as: {$savedRole}, User ID: {$userId}");

            // Log activity
            $this->logActivity($currentUser['id'], 'user.created', "Created user: {$data['email']}", [
                'user_id' => $userId,
                'email' => $data['email'],
                'role' => $data['role']
            ]);

            $responseData = [
                'success' => true,
                'message' => 'User created successfully',
                'data' => ['id' => $userId]
            ];

            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

        } catch (\Exception $e) {
            $this->logger->error('Error creating user', [
                'error' => $e->getMessage(),
                'data' => $data ?? null,
                'trace' => $e->getTraceAsString()
            ]);
            return $this->errorResponse($response, 'Failed to create user', 500);
        }
    }

    /**
     * Update admin user
     */
    public function updateUser(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = (int)$args['id'];
            $data = $request->getParsedBody();
            $currentUser = $request->getAttribute('user');
            
            // Check if user exists
            $stmt = $this->db->getConnection()->prepare("SELECT * FROM admin_users WHERE id = :id");
            $stmt->execute(['id' => $userId]);
            $existingUser = $stmt->fetch();
            
            if (!$existingUser) {
                return $this->errorResponse($response, 'User not found', 404);
            }
            
            // Validation
            $errors = $this->validateUserData($data, false);
            if ($errors) {
                return $this->errorResponse($response, 'Validation failed', 400, $errors);
            }

            // Build update query
            $updates = [];
            $bindings = ['id' => $userId];

            if (isset($data['name'])) {
                $updates[] = "name = :name";
                $bindings['name'] = $data['name'];
            }

            if (isset($data['email']) && $data['email'] !== $existingUser['email']) {
                // Check if new email already exists
                $stmt = $this->db->getConnection()->prepare("SELECT id FROM admin_users WHERE email = :email AND id != :id");
                $stmt->execute(['email' => $data['email'], 'id' => $userId]);
                if ($stmt->fetch()) {
                    return $this->errorResponse($response, 'Email already exists', 400);
                }
                $updates[] = "email = :email";
                $bindings['email'] = $data['email'];
            }

            if (isset($data['role'])) {
                $updates[] = "role = :role";
                $bindings['role'] = $data['role'];
            }

            if (isset($data['status'])) {
                $updates[] = "status = :status";
                $bindings['status'] = $data['status'];
            }

            if (isset($data['password']) && !empty($data['password'])) {
                $updates[] = "password_hash = :password_hash";
                $updates[] = "password_changed_at = NOW()";
                $bindings['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
            }

            if (empty($updates)) {
                return $this->errorResponse($response, 'No fields to update', 400);
            }

            $updates[] = "updated_at = NOW()";

            $query = "UPDATE admin_users SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $this->db->getConnection()->prepare($query);

            // Debug logging
            $this->logger->info("Executing update query", [
                'query' => $query,
                'bindings' => $bindings,
                'updates' => $updates
            ]);

            $result = $stmt->execute($bindings);

            // Check if execution was successful
            if ($result === false) {
                $errorInfo = $stmt->errorInfo();
                $this->logger->error("Database update failed", [
                    'error_info' => $errorInfo,
                    'bindings' => $bindings
                ]);
                throw new \Exception('Failed to update user in database: ' . implode(', ', $errorInfo));
            }

            $affectedRows = $stmt->rowCount();
            $this->logger->info("Update completed", ['affected_rows' => $affectedRows]);

            // Verify the role was updated correctly
            if (isset($data['role'])) {
                $verifyStmt = $this->db->getConnection()->prepare("SELECT role FROM admin_users WHERE id = :id");
                $verifyStmt->execute(['id' => $userId]);
                $savedRole = $verifyStmt->fetch()['role'];

                $this->logger->info("User updated successfully - Role: {$data['role']}, Saved as: {$savedRole}, User ID: {$userId}");
            }

            // Log activity
            $this->logActivity($currentUser['id'], 'user.updated', "Updated user: {$existingUser['email']}", [
                'user_id' => $userId,
                'changes' => array_keys($data)
            ]);

            $responseData = [
                'success' => true,
                'message' => 'User updated successfully'
            ];

            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            $this->logger->error('Error updating user', [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'data' => $data ?? null,
                'trace' => $e->getTraceAsString()
            ]);
            return $this->errorResponse($response, 'Failed to update user', 500);
        }
    }

    /**
     * Delete admin user
     */
    public function deleteUser(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = (int)$args['id'];
            $currentUser = $request->getAttribute('user');
            
            // Prevent self-deletion
            if ($userId === $currentUser['id']) {
                return $this->errorResponse($response, 'Cannot delete your own account', 400);
            }
            
            // Check if user exists
            $stmt = $this->db->getConnection()->prepare("SELECT * FROM admin_users WHERE id = :id");
            $stmt->execute(['id' => $userId]);
            $user = $stmt->fetch();
            
            if (!$user) {
                return $this->errorResponse($response, 'User not found', 404);
            }
            
            // Delete user
            $stmt = $this->db->getConnection()->prepare("DELETE FROM admin_users WHERE id = :id");
            $stmt->execute(['id' => $userId]);
            
            // Log activity
            $this->logActivity($currentUser['id'], 'user.deleted', "Deleted user: {$user['email']}", [
                'user_id' => $userId,
                'email' => $user['email']
            ]);
            
            $responseData = [
                'success' => true,
                'message' => 'User deleted successfully'
            ];
            
            $response->getBody()->write(json_encode($responseData, JSON_PRETTY_PRINT));
            return $response->withHeader('Content-Type', 'application/json');
            
        } catch (\Exception $e) {
            $this->logger->error('Error deleting user', ['error' => $e->getMessage()]);
            return $this->errorResponse($response, 'Failed to delete user', 500);
        }
    }

    /**
     * Ensure role exists in roles table
     */
    private function ensureRoleExists(string $roleName): void
    {
        try {
            $stmt = $this->db->getConnection()->prepare("SELECT id FROM roles WHERE name = :name");
            $stmt->execute(['name' => $roleName]);

            if (!$stmt->fetch()) {
                // Role doesn't exist, create it
                $defaultRoles = [
                    'super_admin' => ['Super Administrator', 'Full system access with all permissions', 100, 1],
                    'admin' => ['Administrator', 'Administrative access with most permissions', 90, 1],
                    'manager' => ['Manager', 'Management access with limited permissions', 75, 1],
                    'staff' => ['Staff', 'Operational access with basic permissions', 50, 0],
                    'viewer' => ['Viewer', 'Read-only access to specific areas', 25, 0],
                ];

                if (isset($defaultRoles[$roleName])) {
                    $roleData = $defaultRoles[$roleName];
                    try {
                        $insertStmt = $this->db->getConnection()->prepare("
                            INSERT INTO roles (name, display_name, description, level, is_system)
                            VALUES (:name, :display_name, :description, :level, :is_system)
                        ");
                        $insertStmt->execute([
                            'name' => $roleName,
                            'display_name' => $roleData[0],
                            'description' => $roleData[1],
                            'level' => $roleData[2],
                            'is_system' => $roleData[3]
                        ]);

                        $this->logger->info("Auto-created role: {$roleName}");
                    } catch (\PDOException $e) {
                        // If roles table doesn't exist or has constraints, log but don't fail
                        $this->logger->warning("Could not create role {$roleName}: " . $e->getMessage());
                    }
                }
            }
        } catch (\PDOException $e) {
            // If roles table doesn't exist, log but don't fail the user creation
            $this->logger->warning("Could not check/create role {$roleName}: " . $e->getMessage());
        }
    }
    private function validateUserData(array $data, bool $isCreate): array
    {
        $errors = [];
        
        if ($isCreate || isset($data['name'])) {
            if (empty($data['name'])) {
                $errors['name'] = 'Name is required';
            } elseif (strlen($data['name']) < 2) {
                $errors['name'] = 'Name must be at least 2 characters';
            }
        }
        
        if ($isCreate || isset($data['email'])) {
            if (empty($data['email'])) {
                $errors['email'] = 'Email is required';
            } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                $errors['email'] = 'Invalid email format';
            }
        }
        
        if ($isCreate) {
            if (empty($data['password'])) {
                $errors['password'] = 'Password is required';
            } elseif (strlen($data['password']) < 8) {
                $errors['password'] = 'Password must be at least 8 characters';
            }
            
            if (empty($data['role'])) {
                $errors['role'] = 'Role is required';
            }
        }
        
        if (isset($data['role'])) {
            $validRoles = ['super_admin', 'admin', 'manager', 'staff', 'viewer'];
            if (!in_array($data['role'], $validRoles)) {
                $errors['role'] = 'Invalid role';
            }
        }
        
        if (isset($data['status'])) {
            $validStatuses = ['active', 'inactive', 'suspended'];
            if (!in_array($data['status'], $validStatuses)) {
                $errors['status'] = 'Invalid status';
            }
        }
        
        return $errors;
    }

    /**
     * Log activity
     */
    private function logActivity(int $userId, string $action, string $description, array $metadata = []): void
    {
        try {
            $stmt = $this->db->getConnection()->prepare("
                INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
                VALUES (:user_id, :action, :description, :metadata, NOW())
            ");
            $stmt->execute([
                'user_id' => $userId,
                'action' => $action,
                'description' => $description,
                'metadata' => json_encode($metadata)
            ]);
        } catch (\Exception $e) {
            $this->logger->error('Failed to log activity', ['error' => $e->getMessage()]);
        }
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
