<?php

declare(strict_types=1);

namespace XS2EventProxy\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Psr\Log\LoggerInterface;

class LoggingMiddleware implements MiddlewareInterface
{
    private LoggerInterface $logger;
    private array $sensitiveHeaders = ['authorization', 'x-api-key'];

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }

    public function process(Request $request, RequestHandler $handler): Response
    {
        $startTime = microtime(true);
        
        // Log request
        $this->logRequest($request);
        
        // Handle the request
        $response = $handler->handle($request);
        
        // Calculate processing time
        $duration = (int) ((microtime(true) - $startTime) * 1000); // in milliseconds
        
        // Log response
        $this->logResponse($response, $duration);
        
        return $response;
    }
    
    private function logRequest(Request $request): void
    {
        $headers = $request->getHeaders();
        
        // Redact sensitive headers
        foreach ($this->sensitiveHeaders as $header) {
            if (isset($headers[$header])) {
                $headers[$header] = ['[REDACTED]'];
            }
        }
        
        $context = [
            'method' => $request->getMethod(),
            'uri' => (string) $request->getUri(),
            'headers' => $headers,
            'query_params' => $request->getQueryParams(),
        ];
        
        $this->logger->info('Incoming request', $context);
    }
    
    private function logResponse(Response $response, int $duration): void
    {
        $context = [
            'status' => $response->getStatusCode(),
            'duration_ms' => $duration,
            'headers' => $response->getHeaders(),
        ];
        
        $this->logger->info('Outgoing response', $context);
    }
}
