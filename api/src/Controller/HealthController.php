<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class HealthController
{
    private LoggerInterface $logger;
    private Client $httpClient;
    private string $baseUrl;
    private string $apiKey;

    public function __construct(LoggerInterface $logger, Client $httpClient, string $baseUrl, string $apiKey)
    {
        $this->logger = $logger;
        $this->httpClient = $httpClient;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }

    public function healthCheck(Request $request, Response $response): Response
    {
        $status = [
            'status' => 'ok',
            'timestamp' => time(),
            'version' => '1.0.0',
            'services' => [
                'database' => $this->checkDatabase(),
                'api' => $this->checkApiConnectivity()
            ]
        ];

        // If any critical service is down, return 503
        foreach ($status['services'] as $service) {
            if ($service['status'] === 'down') {
                $status['status'] = 'degraded';
                $response = $response->withStatus(503);
                break;
            }
        }

        $response->getBody()->write(json_encode($status, JSON_PRETTY_PRINT));
        return $response->withHeader('Content-Type', 'application/json');
    }

    private function checkDatabase(): array
    {
        // Placeholder for database health check
        // In a real application, this would check database connectivity
        return [
            'name' => 'database',
            'status' => 'ok',
            'message' => 'Database connection is healthy'
        ];
    }

    private function checkApiConnectivity(): array
    {
        try {
            $startTime = microtime(true);
            
            $response = $this->httpClient->get("$this->baseUrl/v1/sports", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json'
                ],
                'timeout' => 5 // 5 seconds timeout for health check
            ]);
            
            $statusCode = $response->getStatusCode();
            $responseTime = round((microtime(true) - $startTime) * 1000, 2); // in ms
            
            if ($statusCode >= 200 && $statusCode < 300) {
                return [
                    'name' => 'xs2event_api',
                    'status' => 'ok',
                    'message' => 'API is responding normally',
                    'response_time_ms' => $responseTime,
                    'status_code' => $statusCode
                ];
            }
            
            return [
                'name' => 'xs2event_api',
                'status' => 'down',
                'message' => 'API returned non-200 status',
                'response_time_ms' => $responseTime,
                'status_code' => $statusCode
            ];
            
        } catch (GuzzleException $e) {
            $this->logger->error('API health check failed', [
                'error' => $e->getMessage(),
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'name' => 'xs2event_api',
                'status' => 'down',
                'message' => 'API connection failed: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }
}
