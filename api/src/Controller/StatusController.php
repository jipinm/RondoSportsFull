<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\ApiException;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use XS2EventProxy\Config\AppConfig;

class StatusController
{
    private LoggerInterface $logger;
    private Client $httpClient;
    private string $baseUrl;
    private string $apiKey;
    private AppConfig $appConfig;

    public function __construct(LoggerInterface $logger, Client $httpClient, AppConfig $appConfig, string $baseUrl = '', string $apiKey = '')
    {
        $this->logger = $logger;
        $this->httpClient = $httpClient;
        $this->appConfig = $appConfig;
        $this->baseUrl = $baseUrl ?: $appConfig->getBaseUrl();
        $this->apiKey = $apiKey ?: $appConfig->getApiKey();
    }

    /**
     * Get API status and health information
     */
    public function getStatus(Request $request, Response $response): Response
    {
        try {
            $status = [
                'status' => 'operational',
                'version' => $this->getAppVersion(),
                'timestamp' => (new \DateTimeImmutable())->format('c'),
                'services' => [
                    'database' => $this->checkDatabaseConnection(),
                    'cache' => $this->checkCacheConnection(),
                    'api' => $this->checkApiConnection()
                ],
                'maintenance' => [
                    'scheduled' => false,
                    'message' => null,
                    'start' => null,
                    'end' => null
                ],
                'resources' => [
                    'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB',
                    'memory_limit' => ini_get('memory_limit'),
                    'uptime' => $this->getUptime(),
                    'php_version' => PHP_VERSION,
                    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
                ]
            ];

            // Check if any service is down
            foreach ($status['services'] as $service) {
                if ($service['status'] !== 'operational') {
                    $status['status'] = 'degraded';
                    break;
                }
            }

            // If API is down, mark the entire service as down
            if ($status['services']['api']['status'] === 'down') {
                $status['status'] = 'down';
            }

            // Add maintenance information if any
            $this->checkMaintenance($status);

            $response->getBody()->write(json_encode($status, JSON_PRETTY_PRINT));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus($status['status'] === 'down' ? 503 : 200);
                
        } catch (\Exception $e) {
            $this->logger->error('Status check failed', ['error' => $e->getMessage()]);
            
            $errorResponse = [
                'status' => 'error',
                'error' => 'Failed to determine service status',
                'timestamp' => (new \DateTimeImmutable())->format('c')
            ];
            
            $response->getBody()->write(json_encode($errorResponse, JSON_PRETTY_PRINT));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(500);
        }
    }

    /**
     * Check database connection status
     */
    private function checkDatabaseConnection(): array
    {
        try {
            // Check if database environment variables are set
            if (empty($_ENV['DB_HOST']) || empty($_ENV['DB_NAME']) || !isset($_ENV['DB_USER'])) {
                return [
                    'status' => 'not_configured',
                    'message' => 'Database not configured (admin operations only)'
                ];
            }

            // Try to connect to the database
            $pdo = new \PDO(
                'mysql:host=' . $_ENV['DB_HOST'] . ';dbname=' . $_ENV['DB_NAME'],
                $_ENV['DB_USER'],
                $_ENV['DB_PASS'] ?? ''
            );
            
            // Test the connection
            $stmt = $pdo->query('SELECT 1');
            $result = $stmt->fetch(\PDO::FETCH_COLUMN);
            
            return [
                'status' => 'operational',
                'message' => 'Database connection successful',
                'version' => $pdo->getAttribute(\PDO::ATTR_SERVER_VERSION)
            ];
        } catch (\PDOException $e) {
            $this->logger->error('Database connection failed', ['error' => $e->getMessage()]);
            return [
                'status' => 'down',
                'message' => 'Database connection failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Check cache connection status
     */
    private function checkCacheConnection(): array
    {
        try {
            if (!extension_loaded('redis')) {
                return [
                    'status' => 'operational',
                    'message' => 'Redis extension not loaded, using file cache',
                    'type' => 'file'
                ];
            }

            if (empty($_ENV['REDIS_HOST'])) {
                return [
                    'status' => 'operational',
                    'message' => 'Redis not configured, using file cache',
                    'type' => 'file'
                ];
            }

            $redis = new \Redis();
            $connected = @$redis->connect(
                $_ENV['REDIS_HOST'],
                $_ENV['REDIS_PORT'] ?? 6379,
                1 // 1 second timeout
            );

            if (!$connected) {
                throw new \RuntimeException('Failed to connect to Redis');
            }

            // Test the connection
            $redis->ping();

            return [
                'status' => 'operational',
                'message' => 'Redis connection successful',
                'type' => 'redis',
                'version' => $redis->info()['redis_version'] ?? 'unknown'
            ];
        } catch (\Exception $e) {
            $this->logger->error('Cache connection failed', ['error' => $e->getMessage()]);
            return [
                'status' => 'degraded',
                'message' => 'Cache connection failed: ' . $e->getMessage(),
                'type' => 'file (fallback)'
            ];
        }
    }

    /**
     * Check XS2Event API connection
     */
    private function checkApiConnection(): array
    {
        try {
            $response = $this->httpClient->get("$this->baseUrl/v1/status", [
                'headers' => [
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                ],
                'timeout' => 5, // 5 seconds timeout
                'http_errors' => false // Don't throw exceptions on HTTP errors
            ]);

            $statusCode = $response->getStatusCode();
            
            if ($statusCode >= 200 && $statusCode < 300) {
                return [
                    'status' => 'operational',
                    'message' => 'API connection successful',
                    'response_time' => $response->getHeaderLine('X-Response-Time') . 'ms'
                ];
            } elseif ($statusCode === 401) {
                return [
                    'status' => 'degraded',
                    'message' => 'API authentication failed',
                    'response_code' => $statusCode
                ];
            } else {
                return [
                    'status' => 'down',
                    'message' => 'API returned error status',
                    'response_code' => $statusCode
                ];
            }
        } catch (GuzzleException $e) {
            $this->logger->error('API connection failed', ['error' => $e->getMessage()]);
            return [
                'status' => 'down',
                'message' => 'API connection failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Check for scheduled maintenance
     */
    private function checkMaintenance(array &$status): void
    {
        // Check if maintenance is scheduled in the environment
        if (isset($_ENV['MAINTENANCE_MODE']) && $_ENV['MAINTENANCE_MODE'] === 'true') {
            $status['maintenance'] = [
                'scheduled' => true,
                'message' => $_ENV['MAINTENANCE_MESSAGE'] ?? 'Scheduled maintenance in progress',
                'start' => $_ENV['MAINTENANCE_START'] ?? null,
                'end' => $_ENV['MAINTENANCE_END'] ?? null
            ];
            
            // If we're in maintenance mode, override the status
            if (strtotime($_ENV['MAINTENANCE_START'] ?? 'now') <= time() && 
                (empty($_ENV['MAINTENANCE_END']) || strtotime($_ENV['MAINTENANCE_END']) > time())) {
                $status['status'] = 'maintenance';
            }
        }
    }

    /**
     * Get application version from composer.json or constant
     */
    private function getAppVersion(): string
    {
        // Try to get version from constant first
        if (defined('APP_VERSION')) {
            return APP_VERSION;
        }

        // Try to get version from composer.json
        $composerFile = dirname(__DIR__, 2) . '/composer.json';
        if (file_exists($composerFile)) {
            $composerData = json_decode(file_get_contents($composerFile), true);
            if (isset($composerData['version'])) {
                return $composerData['version'];
            }
        }

        return 'dev';
    }

    /**
     * Get server uptime
     */
    private function getUptime(): string
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // Windows
            $uptime = shell_exec('net stats workstation');
            $uptime = explode("\n", $uptime)[2] ?? '';
            $uptime = trim(substr($uptime, strpos($uptime, 'since') + 5));
            return $uptime ?: 'unknown';
        } else {
            // Linux/Unix
            $uptime = @file_get_contents('/proc/uptime');
            if ($uptime === false) {
                return 'unknown';
            }
            
            $uptime = (float)explode(' ', $uptime)[0];
            $days = floor($uptime / 60 / 60 / 24);
            $hours = floor(($uptime - ($days * 60 * 60 * 24)) / 60 / 60);
            $minutes = floor(($uptime - ($days * 60 * 60 * 24) - ($hours * 60 * 60)) / 60);
            
            $parts = [];
            if ($days > 0) $parts[] = $days . 'd';
            if ($hours > 0) $parts[] = $hours . 'h';
            if ($minutes > 0 || empty($parts)) $parts[] = $minutes . 'm';
            
            return implode(' ', $parts);
        }
    }
}
