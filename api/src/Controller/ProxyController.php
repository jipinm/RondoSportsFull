<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use XS2EventProxy\Exception\RateLimitExceededException;

class ProxyController
{
    private const MAX_RETRIES = 3;
    private const RETRY_DELAY_MS = 1000; // 1 second
    
    private Client $httpClient;
    private LoggerInterface $logger;
    private array $config;
    private int $retryCount = 0;

    public function __construct(Client $httpClient, LoggerInterface $logger, array $config)
    {
        $this->httpClient = $httpClient;
        $this->logger = $logger;
        $this->config = $config;
    }

    public function handleRequest(Request $request, Response $response, array $args): Response
    {
        $this->retryCount = 0;
        $maxRetries = $this->config['max_retries'] ?? self::MAX_RETRIES;
        $backoffMs = $this->config['backoff_ms'] ?? self::RETRY_DELAY_MS;
        
        do {
            try {
                $targetUri = $this->buildTargetUri($request, $args);
                $options = $this->prepareRequestOptions($request);

                // Log the outgoing request
                $this->logRequest($request, $targetUri);
                
                // Forward the request to the target API
                $apiResponse = $this->httpClient->request(
                    $request->getMethod(),
                    $targetUri,
                    $options
                );

                // Handle rate limiting (429)
                if ($apiResponse->getStatusCode() === 429) {
                    $retryAfter = $this->handleRateLimit($apiResponse, $maxRetries);
                    if ($retryAfter > 0) {
                        $this->retryCount++;
                        usleep($retryAfter * 1000); // Convert to microseconds
                        continue;
                    }
                    throw new RateLimitExceededException('Rate limit exceeded');
                }

                // Handle the API response and prepare the client response
                $response = $this->handleApiResponse($apiResponse, $response);
                
                return $response;
                
            } catch (ConnectException $e) {
                // Connection errors are retryable
                if ($this->shouldRetry($e, $maxRetries)) {
                    $this->retryCount++;
                    usleep($backoffMs * 1000); // Convert to microseconds
                    $backoffMs = min($backoffMs * 2, 10000); // Exponential backoff with max 10s
                    continue;
                }
                
                $this->logError('Connection error', $e);
                throw new ApiException('Unable to connect to XS2Event API', 502, $e);
                
            } catch (RequestException $e) {
                // Only retry on server errors (5xx) and certain client errors
                $statusCode = $e->getResponse() ? $e->getResponse()->getStatusCode() : 0;
                
                if ($this->shouldRetry($e, $maxRetries, $statusCode)) {
                    $this->retryCount++;
                    usleep($backoffMs * 1000);
                    $backoffMs = min($backoffMs * 2, 10000);
                    continue;
                }
                
                $this->logError('Request error', $e);
                throw new ApiException(
                    'Error communicating with XS2Event API',
                    $statusCode ?: 502,
                    $e
                );
                
            } catch (\Exception $e) {
                $this->logError('Unexpected error', $e);
                throw new ApiException('An unexpected error occurred', 500, $e);
            }
            
        } while ($this->retryCount < $maxRetries);
        
        throw new ApiException('Maximum number of retries exceeded', 503);
    }

    /**
     * Build the target URI for the XS2Event API
     */
    private function buildTargetUri(Request $request, array $args): string
    {
        $baseUrl = rtrim($this->config['base_url'], '/');
        $path = $request->getUri()->getPath();
        
        // Handle path parameters
        if (!empty($args['params'])) {
            $path = rtrim($path, '/') . '/' . ltrim($args['params'], '/');
        }
        
        // Normalize the path
        $path = '/' . ltrim($path, '/');
        
        // Build query string with filtering and pagination
        $queryParams = $request->getQueryParams();
        $query = http_build_query($queryParams);
        
        // Reconstruct the full target URL
        $targetUrl = $baseUrl . $path;
        
        if (!empty($query)) {
            $targetUrl .= '?' . $query;
        }
        
        return $targetUrl;
    }

    /**
     * Prepare request options for the Guzzle client
     */
    private function prepareRequestOptions(Request $request): array
    {
        // Get and filter headers
        $headers = $this->filterHeaders($request->getHeaders());
        
        // Ensure X-Api-Key is always included, even if it was in the original headers
        $headers = array_merge(
            [
                'X-Api-Key' => [$this->config['api_key']],
                'Accept' => ['application/json'],
                'Content-Type' => ['application/json']
            ],
            $headers
        );

        // Set up base options
        $options = [
            'headers' => $headers,
            'timeout' => $this->config['timeout'] / 1000, // Convert to seconds
            'connect_timeout' => 5, // 5 seconds connection timeout
            'http_errors' => false, // We'll handle errors manually
            'allow_redirects' => [
                'max' => 5,
                'strict' => true,
                'referer' => true,
                'protocols' => ['http', 'https'],
                'track_redirects' => true
            ]
        ];

        // Handle request body
        $body = $request->getBody();
        if ($body->getSize() > 0) {
            $contentType = $request->getHeaderLine('Content-Type');
            
            // Handle different content types
            if (strpos($contentType, 'application/json') !== false) {
                $options['json'] = json_decode($body->getContents(), true);
            } elseif (strpos($contentType, 'application/x-www-form-urlencoded') !== false) {
                parse_str($body->getContents(), $formData);
                $options['form_params'] = $formData;
            } else {
                $options['body'] = $body->getContents();
            }
            
            // Rewind the body stream for potential future use
            $body->rewind();
        }

        return $options;
    }

    private function shouldRetry(\Throwable $e, int $maxRetries, int $statusCode = 0): bool
    {
        // Don't retry if we've reached the maximum number of retries
        if ($this->retryCount >= $maxRetries) {
            return false;
        }
        
        // Always retry connection errors
        if ($e instanceof ConnectException) {
            return true;
        }
        
        // Retry on server errors (5xx) and certain client errors
        if ($statusCode >= 500 || $statusCode === 408 || $statusCode === 429) {
            return true;
        }
        
        return false;
    }
    
    private function handleRateLimit(Response $response, int $maxRetries): int
    {
        $retryAfter = (int) $response->getHeaderLine('Retry-After');
        
        // Default to exponential backoff if no Retry-After header
        if ($retryAfter <= 0) {
            $retryAfter = min(1000 * pow(2, $this->retryCount), 10000); // Max 10s
        }
        
        if ($this->retryCount < $maxRetries) {
            $this->logger->warning('Rate limit exceeded, retrying after {delay}ms', [
                'retry_count' => $this->retryCount + 1,
                'max_retries' => $maxRetries,
                'delay' => $retryAfter,
                'headers' => $response->getHeaders()
            ]);
            return $retryAfter;
        }
        
        return 0; // Don't retry
    }
    
    /**
     * Handle the API response and prepare the client response
     */
    private function handleApiResponse(Response $apiResponse, Response $response): Response
    {
        // Copy status code
        $response = $response->withStatus($apiResponse->getStatusCode());
        
        // Copy headers, but filter out some headers that should be handled by the proxy
        $headers = $apiResponse->getHeaders();
        $skipHeaders = [
            'connection', 'transfer-encoding', 'content-encoding', 'content-length',
            'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer',
            'upgrade', 'host', 'x-powered-by'
        ];
        
        foreach ($headers as $name => $values) {
            $normalized = strtolower($name);
            if (!in_array($normalized, $skipHeaders, true)) {
                $response = $response->withHeader($name, $values);
            }
        }
        
        // Handle different content types
        $contentType = $apiResponse->getHeaderLine('Content-Type');
        $contentLength = $apiResponse->getHeaderLine('Content-Length');
        
        // For large responses, stream the body
        $body = $apiResponse->getBody();
        $size = $body->getSize();
        
        if ($size > 1024 * 1024) { // If larger than 1MB, stream it
            $stream = new Stream(fopen('php://temp', 'r+'));
            while (!$body->eof()) {
                $stream->write($body->read(8192));
            }
            $body->close();
            $stream->rewind();
            $response = $response->withBody($stream);
        } else {
            // For smaller responses, read the whole body
            $response->getBody()->write((string) $body);
        }
        
        // Ensure proper content type
        if (!$response->hasHeader('Content-Type') && !empty($contentType)) {
            $response = $response->withHeader('Content-Type', $contentType);
        }
        
        return $response;
    }
    
    /**
     * Log the outgoing request details
     */
    private function logRequest(Request $request, string $targetUri): void
    {
        $logData = [
            'method' => $request->getMethod(),
            'uri' => (string) $request->getUri(),
            'target_uri' => $targetUri,
            'headers' => $this->filterSensitiveHeaders($request->getHeaders()),
            'query_params' => $request->getQueryParams(),
        ];
        
        // Add request body for non-GET requests if it's not too large
        if (!in_array($request->getMethod(), ['GET', 'HEAD', 'OPTIONS'])) {
            $body = $request->getBody();
            $size = $body->getSize();
            
            if ($size > 0 && $size < 1024 * 10) { // Only log if body is less than 10KB
                $body->rewind();
                $content = $body->getContents();
                $body->rewind();
                
                // Try to parse JSON for better logging
                if (strpos($request->getHeaderLine('Content-Type'), 'application/json') !== false) {
                    $logData['body'] = json_decode($content, true) ?: $content;
                } else {
                    $logData['body'] = $content;
                }
            } elseif ($size > 0) {
                $logData['body_size'] = $size . ' bytes';
            }
        }
        
        $this->logger->debug('Forwarding request', $logData);
    }
    
    /**
     * Log the incoming response details
     */
    private function logResponse(Response $response): void
    {
        $logData = [
            'status' => $response->getStatusCode(),
            'headers' => $this->filterSensitiveHeaders($response->getHeaders()),
        ];
        
        // For error responses, log the response body if it's not too large
        if ($response->getStatusCode() >= 400) {
            $body = $response->getBody();
            $size = $body->getSize();
            
            if ($size > 0 && $size < 1024 * 5) { // Only log if body is less than 5KB
                $body->rewind();
                $content = $body->getContents();
                $body->rewind();
                
                // Try to parse JSON for better logging
                if (strpos($response->getHeaderLine('Content-Type'), 'application/json') !== false) {
                    $logData['body'] = json_decode($content, true) ?: $content;
                } else {
                    $logData['body'] = $content;
                }
                
                // Try to parse error details if available
                $errorData = $this->parseErrorResponse($content);
                if ($errorData) {
                    $logData['error'] = $errorData;
                }
            } elseif ($size > 0) {
                $logData['body_size'] = $size . ' bytes';
            }
            
            $this->logger->error('API error response', $logData);
        } else {
            $this->logger->debug('API response', $logData);
        }
    }
    
    private function logError(string $message, \Throwable $e): void
    {
        $context = [
            'exception' => get_class($e),
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ];
        
        if ($e->getPrevious() !== null) {
            $context['previous'] = [
                'exception' => get_class($e->getPrevious()),
                'message' => $e->getPrevious()->getMessage(),
                'code' => $e->getPrevious()->getCode(),
            ];
        }
        
        $this->logger->error($message, $context);
    }
    
    private function filterSensitiveHeaders(array $headers): array
    {
        $sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];
        $filtered = [];
        
        foreach ($headers as $name => $values) {
            $normalized = strtolower($name);
            if (in_array($normalized, $sensitiveHeaders, true)) {
                $filtered[$name] = ['[REDACTED]'];
            } else {
                $filtered[$name] = $values;
            }
        }
        
        return $filtered;
    }
    
    private function parseErrorResponse(string $body): ?array
    {
        if (empty($body)) {
            return null;
        }
        
        $data = json_decode($body, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['raw' => $body];
        }
        
        // Extract common error fields
        $error = [];
        $commonFields = ['error', 'message', 'code', 'status', 'type'];
        
        foreach ($commonFields as $field) {
            if (isset($data[$field])) {
                $error[$field] = $data[$field];
            }
        }
        
        return empty($error) ? $data : $error;
    }
    
    private function filterHeaders(array $headers): array
    {
        // Remove headers that shouldn't be forwarded
        $filteredHeaders = [];
        $headersToRemove = [
            'host', 'content-length', 'connection', 'accept-encoding',
            'user-agent', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-port'
        ];

        foreach ($headers as $name => $values) {
            $normalized = strtolower($name);
            if (!in_array($normalized, $headersToRemove, true)) {
                $filteredHeaders[$name] = $values;
            }
        }

        return $filteredHeaders;
    }
}
