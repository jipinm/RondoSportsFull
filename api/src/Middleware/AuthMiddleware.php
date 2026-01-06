<?php

declare(strict_types=1);

namespace XS2EventProxy\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Service\JWTService;
use XS2EventProxy\Repository\AdminUserRepository;
use XS2EventProxy\Service\PermissionService;

/**
 * Authentication Middleware
 * 
 * Validates JWT tokens and protects admin routes
 */
class AuthMiddleware implements MiddlewareInterface
{
    private JWTService $jwtService;
    private AdminUserRepository $userRepo;
    private LoggerInterface $logger;

    public function __construct(
        JWTService $jwtService,
        AdminUserRepository $userRepo,
        LoggerInterface $logger
    ) {
        $this->jwtService = $jwtService;
        $this->userRepo = $userRepo;
        $this->logger = $logger;
    }

    /**
     * Process the middleware
     */
    public function process(Request $request, RequestHandler $handler): Response
    {
        try {
            $authHeader = $request->getHeaderLine('Authorization');
            
            if (empty($authHeader)) {
                $this->logger->warning('Missing Authorization header', [
                    'uri' => $request->getUri()->getPath(),
                    'method' => $request->getMethod()
                ]);
                
                return $this->unauthorizedResponse('Authorization header missing');
            }
            
            if (!str_starts_with($authHeader, 'Bearer ')) {
                $this->logger->warning('Invalid Authorization header format', [
                    'header' => substr($authHeader, 0, 20) . '...',
                    'uri' => $request->getUri()->getPath()
                ]);
                
                return $this->unauthorizedResponse('Invalid authorization header format');
            }
            
            $token = substr($authHeader, 7); // Remove "Bearer " prefix
            
            if (empty($token)) {
                return $this->unauthorizedResponse('Token is empty');
            }
            
            // Validate token
            $payload = $this->jwtService->validateToken($token);
            
            if (!$payload) {
                $this->logger->warning('Invalid or expired token', [
                    'uri' => $request->getUri()->getPath(),
                    'token_preview' => substr($token, 0, 20) . '...'
                ]);
                
                return $this->unauthorizedResponse('Invalid or expired token');
            }
            
            // Check token type
            if (($payload['type'] ?? '') !== 'access') {
                $this->logger->warning('Wrong token type used for authentication', [
                    'token_type' => $payload['type'] ?? 'unknown',
                    'uri' => $request->getUri()->getPath()
                ]);
                
                return $this->unauthorizedResponse('Invalid token type');
            }
            
            // Get user from database
            $user = $this->userRepo->findById($payload['user_id']);
            
            if (!$user) {
                $this->logger->warning('Token valid but user not found', [
                    'user_id' => $payload['user_id'],
                    'uri' => $request->getUri()->getPath()
                ]);
                
                return $this->unauthorizedResponse('User not found');
            }
            
            // Check user status
            if ($user['status'] !== 'active') {
                $this->logger->warning('Token valid but user is inactive', [
                    'user_id' => $user['id'],
                    'status' => $user['status'],
                    'uri' => $request->getUri()->getPath()
                ]);
                
                return $this->unauthorizedResponse('User account is not active');
            }
            
            // Check if account is locked
            if ($this->userRepo->isAccountLocked($user['id'])) {
                $this->logger->warning('Token valid but account is locked', [
                    'user_id' => $user['id'],
                    'uri' => $request->getUri()->getPath()
                ]);
                
                return $this->unauthorizedResponse('Account is temporarily locked');
            }
            
            // Add user to request attributes
            $request = $request->withAttribute('user', $user);
            $request = $request->withAttribute('user_id', $user['id']);
            $request = $request->withAttribute('token_payload', $payload);
            
            // Log successful authentication (debug level to avoid spam)
            $this->logger->debug('Successful authentication', [
                'user_id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'uri' => $request->getUri()->getPath(),
                'method' => $request->getMethod()
            ]);
            
            return $handler->handle($request);
            
        } catch (\Exception $e) {
            $this->logger->error('Authentication middleware error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'uri' => $request->getUri()->getPath()
            ]);
            
            return $this->unauthorizedResponse('Authentication error');
        }
    }

    /**
     * Create unauthorized response
     */
    private function unauthorizedResponse(string $message): Response
    {
        $response = new \Slim\Psr7\Response();
        
        $body = json_encode([
            'success' => false,
            'error' => $message,
            'code' => 'UNAUTHORIZED'
        ], JSON_PRETTY_PRINT);
        
        $response->getBody()->write($body);
        
        return $response
            ->withStatus(401)
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('WWW-Authenticate', 'Bearer realm="Admin API"');
    }
}

/**
 * Enhanced Role-based Authorization Middleware
 * 
 * Supports both role-based and granular permission-based access control
 */
class RoleMiddleware implements MiddlewareInterface
{
    private array $allowedRoles;
    private array $requiredPermissions;
    private ?PermissionService $permissionService;
    private LoggerInterface $logger;

    /**
     * Constructor for role-based access control
     */
    public function __construct(array $allowedRoles, LoggerInterface $logger, PermissionService $permissionService = null)
    {
        $this->allowedRoles = $allowedRoles;
        $this->requiredPermissions = [];
        $this->logger = $logger;
        $this->permissionService = $permissionService;
    }

    /**
     * Constructor for permission-based access control
     */
    public static function withPermissions(array $requiredPermissions, LoggerInterface $logger, PermissionService $permissionService): self
    {
        $instance = new self([], $logger, $permissionService);
        $instance->requiredPermissions = $requiredPermissions;
        return $instance;
    }

    /**
     * Process the middleware
     */
    public function process(Request $request, RequestHandler $handler): Response
    {
        $user = $request->getAttribute('user');

        if (!$user) {
            return $this->forbiddenResponse('User not authenticated');
        }

        $userRole = $user['role'] ?? '';

        // If specific permissions are required, check them
        if (!empty($this->requiredPermissions)) {
            if (!$this->permissionService) {
                $this->logger->error('PermissionService not available for permission check');
                return $this->forbiddenResponse('Permission service unavailable');
            }

            if (!$this->permissionService->hasAllPermissions($userRole, $this->requiredPermissions)) {
                $this->logger->warning('Permission-based access denied', [
                    'user_id' => $user['id'],
                    'user_role' => $userRole,
                    'required_permissions' => $this->requiredPermissions,
                    'uri' => $request->getUri()->getPath()
                ]);

                return $this->forbiddenResponse('Insufficient permissions');
            }

            return $handler->handle($request);
        }

        // Otherwise, check role-based access
        if (!in_array($userRole, $this->allowedRoles)) {
            $this->logger->warning('Role-based access denied', [
                'user_id' => $user['id'],
                'user_role' => $userRole,
                'allowed_roles' => $this->allowedRoles,
                'uri' => $request->getUri()->getPath()
            ]);

            return $this->forbiddenResponse('Insufficient permissions');
        }

        return $handler->handle($request);
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