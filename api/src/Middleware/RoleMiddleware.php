<?php

declare(strict_types=1);

namespace XS2EventProxy\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response as SlimResponse;

class RoleMiddleware implements MiddlewareInterface
{
    private array $allowedRoles;
    private LoggerInterface $logger;

    public function __construct(array $allowedRoles, LoggerInterface $logger)
    {
        $this->allowedRoles = $allowedRoles;
        $this->logger = $logger;
    }

    public function process(Request $request, RequestHandler $handler): Response
    {
        $user = $request->getAttribute('user');
        
        if (!$user) {
            $this->logger->warning('Access denied - no user in request', [
                'endpoint' => $request->getUri()->getPath(),
                'method' => $request->getMethod()
            ]);
            return $this->unauthorizedResponse();
        }

        $userRole = $user['role'] ?? null;
        
        // Super admin has access to everything
        if ($userRole === 'super_admin') {
            return $handler->handle($request);
        }
        
        // Check if user role is in allowed roles
        if (!in_array($userRole, $this->allowedRoles)) {
            $this->logger->warning('Access denied - insufficient role', [
                'user_id' => $user['id'],
                'user_role' => $userRole,
                'required_roles' => $this->allowedRoles,
                'endpoint' => $request->getUri()->getPath(),
                'method' => $request->getMethod()
            ]);
            
            return $this->forbiddenResponse();
        }

        return $handler->handle($request);
    }

    private function unauthorizedResponse(): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => 'Authentication required',
            'code' => 'UNAUTHORIZED'
        ], JSON_PRETTY_PRINT));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    private function forbiddenResponse(): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => 'Insufficient permissions. Required roles: ' . implode(', ', $this->allowedRoles),
            'code' => 'FORBIDDEN'
        ], JSON_PRETTY_PRINT));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }
}