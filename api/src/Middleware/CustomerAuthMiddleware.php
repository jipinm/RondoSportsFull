<?php

declare(strict_types=1);

namespace XS2EventProxy\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use XS2EventProxy\Service\CustomerJWTService;
use XS2EventProxy\Repository\CustomerRepository;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;

class CustomerAuthMiddleware implements MiddlewareInterface
{
    private CustomerJWTService $jwtService;
    private CustomerRepository $customerRepository;
    private LoggerInterface $logger;

    public function __construct(
        CustomerJWTService $jwtService,
        CustomerRepository $customerRepository,
        LoggerInterface $logger
    ) {
        $this->jwtService = $jwtService;
        $this->customerRepository = $customerRepository;
        $this->logger = $logger;
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $authHeader = $request->getHeaderLine('Authorization');
        
        $this->logger->debug('CustomerAuthMiddleware processing request', [
            'uri' => (string)$request->getUri(),
            'method' => $request->getMethod(),
            'has_auth_header' => !empty($authHeader)
        ]);
        
        // Fallback: Check Apache environment variable (for shared hosting)
        if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        
        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            $this->logger->warning('Authorization header missing or invalid', [
                'uri' => (string)$request->getUri(),
                'auth_header_present' => !empty($authHeader),
                'auth_header_format' => !empty($authHeader) ? substr($authHeader, 0, 10) . '...' : 'none'
            ]);
            return $this->unauthorizedResponse('Authorization header missing or invalid');
        }

        $token = substr($authHeader, 7); // Remove 'Bearer ' prefix
        
        if (empty($token)) {
            return $this->unauthorizedResponse('Token not provided');
        }

        try {
            $customerData = $this->jwtService->validateAccessToken($token);
            
            if (!$customerData) {
                return $this->unauthorizedResponse('Invalid or expired token');
            }

            // Additional security checks
            $customer = $this->customerRepository->findById($customerData['id']);
            
            if (!$customer) {
                return $this->unauthorizedResponse('Customer not found');
            }

            // Check if customer account is still active
            if ($customer['status'] === 'blocked') {
                return $this->forbiddenResponse('Account is blocked');
            }

            if ($customer['status'] === 'deleted') {
                return $this->forbiddenResponse('Account is deactivated');
            }

            if ($customer['status'] === 'inactive') {
                return $this->forbiddenResponse('Account is inactive');
            }

            // Check if account is locked due to failed login attempts
            if ($this->customerRepository->isAccountLocked($customer['email'])) {
                return $this->forbiddenResponse('Account is temporarily locked due to failed login attempts');
            }

            // Add customer data to request attributes for use in controllers
            $request = $request->withAttribute('customer', $customerData);
            $request = $request->withAttribute('customer_id', $customerData['id']);
            $request = $request->withAttribute('customer_email', $customerData['email']);
            $request = $request->withAttribute('customer_full', $customer);

            $this->logger->debug('Customer authenticated successfully', [
                'customer_id' => $customerData['id'],
                'customer_email' => $customerData['email']
            ]);

            return $handler->handle($request);

        } catch (\Exception $e) {
            $this->logger->error('Customer authentication error', [
                'error' => $e->getMessage(),
                'token' => substr($token, 0, 20) . '...'
            ]);
            
            return $this->unauthorizedResponse('Authentication failed');
        }
    }

    private function unauthorizedResponse(string $message): ResponseInterface
    {
        $response = new Response();
        
        $errorData = [
            'success' => false,
            'error' => $message,
            'code' => 401,
            'error_type' => 'UNAUTHORIZED'
        ];

        $response->getBody()->write(json_encode($errorData, JSON_PRETTY_PRINT));
        
        return $response
            ->withStatus(401)
            ->withHeader('Content-Type', 'application/json');
    }

    private function forbiddenResponse(string $message): ResponseInterface
    {
        $response = new Response();
        
        $errorData = [
            'success' => false,
            'error' => $message,
            'code' => 403,
            'error_type' => 'FORBIDDEN'
        ];

        $response->getBody()->write(json_encode($errorData, JSON_PRETTY_PRINT));
        
        return $response
            ->withStatus(403)
            ->withHeader('Content-Type', 'application/json');
    }
}