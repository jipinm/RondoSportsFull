<?php

declare(strict_types=1);

namespace XS2EventProxy\Config;

class AppConfig
{
    private string $baseUrl;
    private string $appUrl;
    private string $apiKey;
    private string $corsAllowedOrigins;
    private bool $corsAllowCredentials;
    private int $corsMaxAge;
    private int $proxyRequestTimeoutMs;
    private int $proxyMaxRetries;
    private int $proxyBackoffMs;
    private string $logLevel;
    private string $environment;
    private bool $debug;

    public function __construct(array $env)
    {
        // Prefer API_BASE_URL if provided; fallback to BASE_URL; finally default to XS2Event test API
        $apiBaseFromEnv = $this->getString($env, 'API_BASE_URL', '');
        $fallbackBase = $this->getString($env, 'BASE_URL', 'https://testapi.xs2event.com');
        $this->baseUrl = $apiBaseFromEnv !== '' ? $apiBaseFromEnv : $fallbackBase;
        
        // Get APP_URL for public asset URLs
        $this->appUrl = $this->getString($env, 'APP_URL', 'http://rondoapi.local');
        
        $this->apiKey = $this->getString($env, 'API_KEY', 'e417f1be53494f5f9fbc5b350b1a5850');
        
        // CORS Configuration
        $this->corsAllowedOrigins = $this->getString($env, 'CORS_ALLOWED_ORIGINS', '*');
        $this->corsAllowCredentials = $this->getBool($env, 'CORS_ALLOW_CREDENTIALS', true);
        $this->corsMaxAge = $this->getInt($env, 'CORS_MAX_AGE', 86400);
        
        // Proxy Configuration
        $this->proxyRequestTimeoutMs = $this->getInt($env, 'PROXY_REQUEST_TIMEOUT_MS', 15000);
        $this->proxyMaxRetries = $this->getInt($env, 'PROXY_MAX_RETRIES', 2);
        $this->proxyBackoffMs = $this->getInt($env, 'PROXY_BACKOFF_MS', 250);
        $this->logLevel = $this->getString($env, 'LOG_LEVEL', 'info');
        $this->environment = $this->getString($env, 'APP_ENV', 'production');
        $this->debug = $this->getBool($env, 'APP_DEBUG', false);
    }

    private function getString(array $env, string $key, string $default = ''): string
    {
        return trim((string) ($env[$key] ?? $default));
    }

    private function getInt(array $env, string $key, int $default = 0): int
    {
        $value = $env[$key] ?? null;
        return $value !== null ? (int) $value : $default;
    }

    private function getBool(array $env, string $key, bool $default = false): bool
    {
        $value = $env[$key] ?? null;
        
        if ($value === null) {
            return $default;
        }
        
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    public function getBaseUrl(): string
    {
        return rtrim($this->baseUrl, '/');
    }

    public function getAppUrl(): string
    {
        return rtrim($this->appUrl, '/');
    }

    public function getApiKey(): string
    {
        return $this->apiKey;
    }

    /**
     * Get allowed CORS origins as an array
     * @return array
     */
    public function getCorsAllowedOrigins(): array
    {
        if ($this->corsAllowedOrigins === '*') {
            return ['*'];
        }
        return array_map('trim', explode(',', $this->corsAllowedOrigins));
    }
    
    /**
     * Get allowed CORS HTTP methods
     * @return array
     */
    public function getCorsAllowedMethods(): array
    {
        return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
    }
    
    /**
     * Get allowed CORS headers
     * @return array
     */
    public function getCorsAllowedHeaders(): array
    {
        return ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Api-Key', 'Accept', 'Origin'];
    }
    
    /**
     * Check if CORS supports credentials
     * @return bool
     */
    /**
     * Check if CORS supports credentials
     * @return bool
     */
    public function isCorsSupportsCredentials(): bool
    {
        return $this->corsAllowCredentials;
    }
    
    /**
     * Get CORS max age in seconds
     * @return int
     */
    public function getCorsMaxAge(): int
    {
        return $this->corsMaxAge;
    }

    public function getProxyRequestTimeoutMs(): int
    {
        return $this->proxyRequestTimeoutMs;
    }

    public function getProxyMaxRetries(): int
    {
        return $this->proxyMaxRetries;
    }

    public function getProxyBackoffMs(): int
    {
        return $this->proxyBackoffMs;
    }

    public function getLogLevel(): string
    {
        return strtolower($this->logLevel);
    }

    public function getEnvironment(): string
    {
        return $this->environment;
    }

    public function isDebug(): bool
    {
        return $this->debug;
    }

    public function isProduction(): bool
    {
        return $this->environment === 'production';
    }

    public function isDevelopment(): bool
    {
        return !$this->isProduction();
    }
}
