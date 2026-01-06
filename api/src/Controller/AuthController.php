<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Service\JWTService;
use XS2EventProxy\Repository\AdminUserRepository;
use XS2EventProxy\Service\ActivityLoggerService;

/**
 * Authentication Controller
 * 
 * Handles admin authentication endpoints
 */
class AuthController
{
    private JWTService $jwtService;
    private AdminUserRepository $userRepo;
    private ActivityLoggerService $activityLogger;
    private LoggerInterface $logger;

    public function __construct(
        JWTService $jwtService,
        AdminUserRepository $userRepo,
        ActivityLoggerService $activityLogger,
        LoggerInterface $logger
    ) {
        $this->jwtService = $jwtService;
        $this->userRepo = $userRepo;
        $this->activityLogger = $activityLogger;
        $this->logger = $logger;
    }

    /**
     * Admin login endpoint
     */
    public function login(Request $request, Response $response): Response
    {
        try {
            $data = $request->getParsedBody();
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';
            
            // Validate input
            if (empty($email) || empty($password)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Email and password are required'
                ], 400);
            }
            
            // Validate email format
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid email format'
                ], 400);
            }
            
            // Find user by email
            $user = $this->userRepo->findByEmail($email);
            
            if (!$user) {
                $this->logger->warning('Login attempt with non-existent email', ['email' => $email]);
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid credentials'
                ], 401);
            }
            
            // Check if account is locked
            if ($this->userRepo->isAccountLocked($user['id'])) {
                $this->logger->warning('Login attempt on locked account', [
                    'user_id' => $user['id'],
                    'email' => $email
                ]);
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Account is temporarily locked due to multiple failed login attempts'
                ], 423);
            }
            
            // Verify password
            if (!password_verify($password, $user['password_hash'])) {
                // Increment failed attempts
                $this->userRepo->incrementFailedAttempts($user['id']);
                
                $this->logger->warning('Failed login attempt', [
                    'user_id' => $user['id'],
                    'email' => $email,
                    'ip' => $this->getClientIp($request)
                ]);
                
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid credentials'
                ], 401);
            }
            
            // Check account status
            if ($user['status'] !== 'active') {
                $this->logger->warning('Login attempt on inactive account', [
                    'user_id' => $user['id'],
                    'email' => $email,
                    'status' => $user['status']
                ]);
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Account is not active'
                ], 403);
            }
            
            // Generate tokens
            $accessToken = $this->jwtService->generateAccessToken([
                'user_id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'name' => $user['name']
            ]);
            
            $refreshToken = $this->jwtService->generateRefreshToken($user['id']);
            
            // Update last login
            $clientIp = $this->getClientIp($request);
            $this->userRepo->updateLastLogin($user['id'], $clientIp);
            
            // Log successful login
            $this->logger->info('Successful admin login', [
                'user_id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'ip' => $clientIp,
                'user_agent' => $request->getHeaderLine('User-Agent')
            ]);
            
            return $this->jsonResponse($response, [
                'success' => true,
                'data' => [
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'expires_in' => $this->jwtService->getAccessTokenExpiry(),
                    'user' => [
                        'id' => $user['id'],
                        'name' => $user['name'],
                        'email' => $user['email'],
                        'role' => $user['role'],
                        'last_login_at' => $user['last_login_at']
                    ]
                ]
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Login error', [
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
     * Token refresh endpoint
     */
    public function refresh(Request $request, Response $response): Response
    {
        try {
            $data = $request->getParsedBody();
            $refreshToken = $data['refresh_token'] ?? '';
            
            if (empty($refreshToken)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Refresh token is required'
                ], 400);
            }
            
            // Validate refresh token
            $payload = $this->jwtService->validateToken($refreshToken);
            
            if (!$payload || ($payload['type'] ?? '') !== 'refresh') {
                $this->logger->warning('Invalid refresh token used', [
                    'token_valid' => $payload !== null,
                    'token_type' => $payload['type'] ?? 'unknown'
                ]);
                
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Invalid refresh token'
                ], 401);
            }
            
            // Get user
            $user = $this->userRepo->findById($payload['user_id']);
            
            if (!$user || $user['status'] !== 'active') {
                $this->logger->warning('Refresh attempt for invalid/inactive user', [
                    'user_id' => $payload['user_id'],
                    'user_found' => $user !== null,
                    'user_status' => $user['status'] ?? 'not_found'
                ]);
                
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'User not found or inactive'
                ], 401);
            }
            
            // Generate new access token
            $accessToken = $this->jwtService->generateAccessToken([
                'user_id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'name' => $user['name']
            ]);
            
            $this->logger->info('Token refreshed', [
                'user_id' => $user['id'],
                'email' => $user['email']
            ]);
            
            return $this->jsonResponse($response, [
                'success' => true,
                'data' => [
                    'access_token' => $accessToken,
                    'expires_in' => $this->jwtService->getAccessTokenExpiry()
                ]
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Token refresh error', [
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
     * Get current user profile
     */
    public function me(Request $request, Response $response): Response
    {
        try {
            $user = $request->getAttribute('user');
            
            if (!$user) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'User not found in request'
                ], 401);
            }
            
            return $this->jsonResponse($response, [
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user['id'],
                        'name' => $user['name'],
                        'email' => $user['email'],
                        'role' => $user['role'],
                        'status' => $user['status'],
                        'two_fa_enabled' => (bool) ($user['two_fa_enabled'] ?? false),
                        'last_login_at' => $user['last_login_at'],
                        'created_at' => $user['created_at']
                    ]
                ]
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Get user profile error', [
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
     * Logout endpoint
     */
    public function logout(Request $request, Response $response): Response
    {
        try {
            $user = $request->getAttribute('user');
            
            if ($user) {
                $this->logger->info('Admin logout', [
                    'user_id' => $user['id'],
                    'email' => $user['email']
                ]);
            }
            
            return $this->jsonResponse($response, [
                'success' => true,
                'message' => 'Logged out successfully'
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Logout error', [
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
     * Get client IP address
     */
    private function getClientIp(Request $request): string
    {
        $headers = [
            'HTTP_CF_CONNECTING_IP',     // Cloudflare
            'HTTP_CLIENT_IP',            // Proxy
            'HTTP_X_FORWARDED_FOR',      // Load balancer/proxy
            'HTTP_X_FORWARDED',          // Proxy
            'HTTP_X_CLUSTER_CLIENT_IP',  // Cluster
            'HTTP_FORWARDED_FOR',        // Proxy
            'HTTP_FORWARDED',            // Proxy
            'REMOTE_ADDR'                // Standard
        ];
        
        foreach ($headers as $header) {
            if ($request->hasHeader($header)) {
                $ip = $request->getHeaderLine($header);
                if (!empty($ip) && $ip !== 'unknown') {
                    // Handle comma-separated IPs (first one is usually the real client IP)
                    if (strpos($ip, ',') !== false) {
                        $ip = trim(explode(',', $ip)[0]);
                    }
                    return $ip;
                }
            }
        }
        
        return 'unknown';
    }

    /**
     * Get current user permissions
     */
    public function permissions(Request $request, Response $response): Response
    {
        try {
            // Get user from request (set by AuthMiddleware)
            $user = $request->getAttribute('user');
            
            if (!$user) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'message' => 'User not found'
                ], 401);
            }
            
            // For super_admin users, return all permissions
            if (isset($user['role']) && $user['role'] === 'super_admin') {
                // Return a comprehensive list of all available permissions for super_admin
                $permissions = [
                    'role.create',
                    'role.read',
                    'role.update',
                    'role.delete',
                    'role.update_system',
                    'role.delete_system',
                    'user.create',
                    'user.read',
                    'user.update',
                    'user.delete',
                    'system.settings',
                    'system.configure',
                    'admin.access',
                    'admin.manage'
                ];
            } else {
                // For other users, get permissions from their role
                // This would need to be implemented based on your role-permission system
                $permissions = [];
            }
            
            return $this->jsonResponse($response, [
                'success' => true,
                'permissions' => $permissions
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error('Error fetching user permissions', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->jsonResponse($response, [
                'success' => false,
                'message' => 'Failed to fetch permissions'
            ], 500);
        }
    }

    /**
     * Change admin password
     */
    public function changePassword(Request $request, Response $response): Response
    {
        try {
            $data = $request->getParsedBody();
            $currentPassword = $data['currentPassword'] ?? '';
            $newPassword = $data['newPassword'] ?? '';
            
            // Validate input
            if (empty($currentPassword) || empty($newPassword)) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Current password and new password are required'
                ], 400);
            }

            // Get current user from request
            $user = $request->getAttribute('user');
            if (!$user) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'User not authenticated'
                ], 401);
            }

            // Verify current password
            if (!password_verify($currentPassword, $user['password_hash'])) {
                // $this->activityLogger->log(
                //     $user['id'],
                //     'change_password_failed',
                //     'Incorrect current password provided',
                //     $request->getServerParams()['REMOTE_ADDR'] ?? 'unknown'
                // );
                
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Current password is incorrect'
                ], 400);
            }

            // Validate new password strength (minimum 8 characters)
            if (strlen($newPassword) < 8) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'New password must be at least 8 characters long'
                ], 400);
            }

            // Update password in database
            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            $updated = $this->userRepo->updatePassword($user['id'], $hashedPassword);

            if (!$updated) {
                return $this->jsonResponse($response, [
                    'success' => false,
                    'error' => 'Failed to update password'
                ], 500);
            }

            // Log successful password change
            // $this->activityLogger->log(
            //     $user['id'],
            //     'password_changed',
            //     'Admin password changed successfully',
            //     $request->getServerParams()['REMOTE_ADDR'] ?? 'unknown'
            // );

            return $this->jsonResponse($response, [
                'success' => true,
                'message' => 'Password changed successfully'
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Password change failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->jsonResponse($response, [
                'success' => false,
                'error' => 'Failed to change password'
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
}