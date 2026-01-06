<?php

declare(strict_types=1);

use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware as GuzzleMiddleware;
use GuzzleHttp\RetryMiddleware;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use GuzzleHttp\Client;
use XS2EventProxy\Config\AppConfig;
use XS2EventProxy\Controller\ProxyController;
use XS2EventProxy\Middleware\CorsMiddleware;
use XS2EventProxy\Middleware\LoggingMiddleware;
use Slim\Psr7\Response;

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Create configuration
$config = new AppConfig($_ENV);

return [
    // Configuration
    AppConfig::class => $config,
    
    // Logger
    LoggerInterface::class => function (ContainerInterface $container) use ($config) {
        $logger = new Logger('xs2event-proxy');
        $logLevel = $container->get('log_level_constant')($config->getLogLevel());
        $logger->pushHandler(new StreamHandler(
            __DIR__ . '/../logs/app.log',
            $logLevel
        ));
        return $logger;
    },
    
    // Register HTTP client with retry middleware
    Client::class => function (ContainerInterface $c) {
        $stack = HandlerStack::create();
        
        // Add retry middleware
        $stack->push(RetryMiddleware::exponentialBackoff(
            $c->get(AppConfig::class)->getProxyMaxRetries(),
            [
                'delay' => function ($retries, $response) use ($c) {
                    // Use Retry-After header if available, otherwise use exponential backoff
                    if ($response && $response->hasHeader('Retry-After')) {
                        return (int) $response->getHeaderLine('Retry-After') * 1000; // Convert to ms
                    }
                    return min(
                        $c->get(AppConfig::class)->getProxyBackoffMs() * pow(2, $retries - 1),
                        10000 // Max 10 seconds
                    );
                },
                'max_retry_attempts' => $c->get(AppConfig::class)->getProxyMaxRetries(),
                'retry_enabled' => true,
            ]
        ));
        
        return new Client([
            'handler' => $stack,
            'timeout' => $c->get(AppConfig::class)->getProxyRequestTimeoutMs() / 1000, // Convert to seconds
            'connect_timeout' => 5, // 5 seconds connection timeout
            'http_errors' => true, // Throw exceptions for 4xx/5xx responses
            'headers' => [
                'User-Agent' => 'XS2Event-PHP-Proxy/1.0',
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'X-Api-Key' => $c->get(AppConfig::class)->getApiKey(),
            ],
            'base_uri' => $c->get(AppConfig::class)->getBaseUrl(),
        ]);
    },
    
    // CORS Middleware with configuration from AppConfig
    'cors' => function (ContainerInterface $container) {
        $config = $container->get(AppConfig::class);
        
        return new CorsMiddleware(
            $container->get(LoggerInterface::class),
            $config->getCorsAllowedOrigins(),
            $config->getCorsAllowedMethods(),
            $config->getCorsAllowedHeaders(),
            $config->isCorsSupportsCredentials(),
            $config->getCorsMaxAge()
        );
    },
    
    // Logging Middleware
    LoggingMiddleware::class => function (ContainerInterface $container) {
        return new LoggingMiddleware(
            $container->get(LoggerInterface::class)
        );
    },
    
    // Register ProxyController with configuration from AppConfig
    ProxyController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new ProxyController(
            $c->get(Client::class),
            $c->get(LoggerInterface::class),
            [
                'base_url' => $appConfig->getBaseUrl(),
                'api_key' => $appConfig->getApiKey(),
                'timeout' => $appConfig->getProxyRequestTimeoutMs(),
                'max_retries' => $appConfig->getProxyMaxRetries(),
                'backoff_ms' => $appConfig->getProxyBackoffMs(),
            ]
        );
    },
    
    // Register HealthController
    HealthController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new HealthController(
            $c->get(LoggerInterface::class),
            $c->get(Client::class),
            $appConfig->getBaseUrl(),
            $appConfig->getApiKey()
        );
    },
    
    // Register SportsController
    SportsController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new SportsController(
            $c->get(LoggerInterface::class),
            $c->get(Client::class),
            $appConfig->getBaseUrl(),
            $appConfig->getApiKey()
        );
    },
    
    // Register TournamentsController
    TournamentsController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new TournamentsController(
            $c->get(LoggerInterface::class),
            $c->get(Client::class),
            $appConfig->getBaseUrl(),
            $appConfig->getApiKey()
        );
    },
    
    // Register EventsController
    EventsController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new EventsController(
            $c->get(LoggerInterface::class),
            $c->get(Client::class),
            $appConfig->getBaseUrl(),
            $appConfig->getApiKey()
        );
    },
    
    // Register VenuesController
    VenuesController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new VenuesController(
            $c->get(LoggerInterface::class),
            $c->get(Client::class),
            $appConfig->getBaseUrl(),
            $appConfig->getApiKey()
        );
    },
    
    // Register CategoriesController
    CategoriesController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new CategoriesController(
            $c->get(LoggerInterface::class),
            $c->get(Client::class),
            $appConfig->getBaseUrl(),
            $appConfig->getApiKey()
        );
    },
    
    // Register TicketsController
    TicketsController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new TicketsController(
            $c->get(LoggerInterface::class),
            $c->get(Client::class),
            $appConfig->getBaseUrl(),
            $appConfig->getApiKey()
        );
    },
    
    // Register BookingsController
    BookingsController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new BookingsController(
            $c->get(LoggerInterface::class),
            $c->get(Client::class),
            $appConfig->getBaseUrl(),
            $appConfig->getApiKey()
        );
    },
    
    // Register ETicketsController
    ETicketsController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new ETicketsController(
            $c->get(LoggerInterface::class),
            $c->get(Client::class),
            $appConfig->getBaseUrl(),
            $appConfig->getApiKey()
        );
    },
    
    // Register SearchController
    SearchController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new SearchController(
            $c->get(LoggerInterface::class),
            $c->get(Client::class),
            $appConfig->getBaseUrl(),
            $appConfig->getApiKey()
        );
    },
    
    // Register StatusController
    StatusController::class => function (ContainerInterface $c) {
        $appConfig = $c->get(AppConfig::class);
        
        return new StatusController(
            $c->get(LoggerInterface::class),
            $c->get(Client::class),
            $appConfig,
            $appConfig->getBaseUrl(),
            $appConfig->getApiKey()
        );
    },
    
    // Helper function to get log level constant
    'log_level' => function (string $level) {
        return $this->getLogLevelConstant($level);
    },
    
    // Get log level constant from string
    'log_level_constant' => function (string $level) {
        return [
            'debug' => Logger::DEBUG,
            'info' => Logger::INFO,
            'notice' => Logger::NOTICE,
            'warning' => Logger::WARNING,
            'error' => Logger::ERROR,
            'critical' => Logger::CRITICAL,
            'alert' => Logger::ALERT,
            'emergency' => Logger::EMERGENCY,
        ][strtolower($level)] ?? Logger::INFO;
    },
    
    // Get log level constant (method)
    'getLogLevelConstant' => function (string $level) {
        return $this->get('log_level_constant')($level);
    }
];
