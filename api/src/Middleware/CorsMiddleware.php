<?php

declare(strict_types=1);

namespace XS2EventProxy\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\InvalidOriginException;

class CorsMiddleware implements MiddlewareInterface
{
    private const DEFAULT_ALLOWED_METHODS = [
        'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'
    ];
    
    private const DEFAULT_ALLOWED_HEADERS = [
        'Content-Type', 'Authorization', 'X-Requested-With', 'X-Api-Key', 'Accept', 'Origin'
    ];
    
    private const DEFAULT_MAX_AGE = 86400; // 24 hours
    
    private LoggerInterface $logger;
    private array $allowedOrigins;
    private array $allowedMethods;
    private array $allowedHeaders;
    private bool $supportsCredentials;
    private int $maxAge;
    private bool $allowAnyOrigin;
    private bool $allowAnyMethod;
    private bool $allowAnyHeader;

    public function __construct(
        LoggerInterface $logger,
        array $allowedOrigins = ['*'],
        array $allowedMethods = self::DEFAULT_ALLOWED_METHODS,
        array $allowedHeaders = self::DEFAULT_ALLOWED_HEADERS,
        bool $supportsCredentials = false,
        int $maxAge = self::DEFAULT_MAX_AGE
    ) {
        $this->logger = $logger;
        $this->allowedOrigins = $this->normalizeOrigins($allowedOrigins);
        $this->allowedMethods = array_map('strtoupper', $allowedMethods);
        $this->allowedHeaders = array_map('strtolower', $allowedHeaders);
        $this->supportsCredentials = $supportsCredentials;
        $this->maxAge = $maxAge;
        $this->allowAnyOrigin = in_array('*', $this->allowedOrigins, true);
        $this->allowAnyMethod = in_array('*', $this->allowedMethods, true);
        $this->allowAnyHeader = in_array('*', $this->allowedHeaders, true);
    }

    public function process(Request $request, RequestHandler $handler): Response
    {
        // Handle preflight requests
        if ($request->getMethod() === 'OPTIONS') {
            return $this->handlePreflightRequest($request);
        }
        
        // Process the request
        $response = $handler->handle($request);
        
        // Add CORS headers to the response
        return $this->addCorsHeaders($request, $response);
    }
    
    private function handlePreflightRequest(Request $request): Response
    {
        $response = new \Slim\Psr7\Response();
        
        // Validate Origin
        $origin = $request->getHeaderLine('Origin');
        if (!$this->isOriginAllowed($origin)) {
            $this->logger->warning('CORS: Origin not allowed', ['origin' => $origin]);
            return $response->withStatus(403, 'Origin Not Allowed');
        }
        
        // Validate Request Method
        $requestMethod = $request->getHeaderLine('Access-Control-Request-Method');
        if (!empty($requestMethod) && !$this->allowAnyMethod && 
            !in_array(strtoupper($requestMethod), $this->allowedMethods, true)) {
            $this->logger->warning('CORS: Method not allowed', ['method' => $requestMethod]);
            return $response->withStatus(405, 'Method Not Allowed');
        }
        
        // Validate Request Headers
        $requestHeaders = $request->getHeaderLine('Access-Control-Request-Headers');
        if (!empty($requestHeaders)) {
            $headers = array_map('trim', explode(',', $requestHeaders));
            foreach ($headers as $header) {
                $header = strtolower($header);
                if (!$this->allowAnyHeader && !in_array($header, $this->allowedHeaders, true)) {
                    $this->logger->warning('CORS: Header not allowed', ['header' => $header]);
                    return $response->withStatus(400, 'Request Header Not Allowed');
                }
            }
        }
        
        // Build the preflight response
        $response = $response->withStatus(204); // No Content
        
        // Add CORS headers
        return $this->addCorsHeaders($request, $response, true);
    }
    
    private function addCorsHeaders(Request $request, Response $response, bool $isPreflight = false): Response
    {
        $origin = $request->getHeaderLine('Origin');
        
        // Determine which origin to use in the response
        if (empty($origin)) {
            // No origin header - use first allowed origin or wildcard
            $allowedOrigin = $this->allowAnyOrigin ? '*' : ($this->allowedOrigins[0] ?? '*');
        } elseif ($this->isOriginAllowed($origin)) {
            // Origin is allowed - use the exact origin from request
            $allowedOrigin = $origin;
        } else {
            // Origin not allowed - log and use first allowed origin as fallback
            $this->logger->warning('CORS: Request from non-allowed origin', [
                'origin' => $origin,
                'allowed_origins' => $this->allowedOrigins
            ]);
            $allowedOrigin = $this->allowAnyOrigin ? '*' : ($this->allowedOrigins[0] ?? '*');
        }
        
        // Add CORS headers
        $response = $response
            ->withHeader('Access-Control-Allow-Origin', $allowedOrigin);
            
        if ($this->supportsCredentials) {
            $response = $response->withHeader('Access-Control-Allow-Credentials', 'true');
        }
        
        // For preflight requests, add additional headers
        if ($isPreflight) {
            $response = $response
                ->withHeader('Access-Control-Allow-Methods', $this->allowAnyMethod ? '*' : implode(', ', $this->allowedMethods))
                ->withHeader('Access-Control-Allow-Headers', $this->allowAnyHeader ? '*' : implode(', ', $this->allowedHeaders))
                ->withHeader('Access-Control-Max-Age', (string) $this->maxAge);
                
            // Add exposed headers if needed
            if (!$this->allowAnyHeader) {
                $response = $response->withHeader('Access-Control-Expose-Headers', implode(', ', $this->allowedHeaders));
            }
        }
        
        // Add Vary header to prevent caching of CORS responses
        if (!$this->allowAnyOrigin) {
            $vary = $response->getHeaderLine('Vary');
            $vary = $vary ? $vary . ', Origin' : 'Origin';
            $response = $response->withHeader('Vary', $vary);
        }
        
        return $response;
    }
    
    private function isOriginAllowed(string $origin): bool
    {
        if ($this->allowAnyOrigin) {
            return true;
        }
        
        $origin = strtolower(trim($origin));
        
        // Check against allowed origins
        foreach ($this->allowedOrigins as $allowedOrigin) {
            $allowedOrigin = strtolower(trim($allowedOrigin));
            
            // Exact match
            if ($allowedOrigin === $origin) {
                return true;
            }
            
            // Wildcard subdomain matching (e.g., *.example.com)
            if (strpos($allowedOrigin, '*') === 0) {
                $pattern = '/^' . str_replace('\*', '.*', preg_quote($allowedOrigin, '/')) . '$/';
                if (preg_match($pattern, $origin)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    private function normalizeOrigins(array $origins): array
    {
        return array_values(array_unique(array_filter(array_map(function ($origin) {
            $origin = trim($origin);
            return $origin === '' ? null : $origin;
        }, $origins))));
    }
}
