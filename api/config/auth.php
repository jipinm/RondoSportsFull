<?php

declare(strict_types=1);

/**
 * Authentication Configuration
 * 
 * Centralized configuration for JWT authentication and security settings
 */

return [
    'jwt' => [
        'secret' => $_ENV['JWT_SECRET'] ?? 'your-secret-key-change-this',
        'access_expiry' => (int)($_ENV['JWT_ACCESS_EXPIRY'] ?? 3600), // 1 hour
        'refresh_expiry' => (int)($_ENV['JWT_REFRESH_EXPIRY'] ?? 86400), // 24 hours
        'algorithm' => 'HS256',
        'issuer' => $_ENV['APP_URL'] ?? 'https://api.example.com',
        'audience' => $_ENV['APP_URL'] ?? 'https://api.example.com',
    ],
    
    'security' => [
        'max_login_attempts' => (int)($_ENV['AUTH_MAX_LOGIN_ATTEMPTS'] ?? 5),
        'lockout_duration' => (int)($_ENV['AUTH_LOCKOUT_DURATION'] ?? 900), // 15 minutes
        'password_min_length' => (int)($_ENV['AUTH_PASSWORD_MIN_LENGTH'] ?? 8),
        'bcrypt_cost' => (int)($_ENV['BCRYPT_COST'] ?? 12),
        'require_password_confirmation' => true,
        'session_timeout' => (int)($_ENV['SESSION_TIMEOUT'] ?? 3600), // 1 hour
    ],
    
    'database' => [
        'host' => $_ENV['DB_HOST'] ?? 'localhost',
        'dbname' => $_ENV['DB_NAME'] ?? 'rondo_admin',
        'username' => $_ENV['DB_USER'] ?? 'root',
        'password' => $_ENV['DB_PASS'] ?? '',
        'port' => $_ENV['DB_PORT'] ?? '3306',
        'charset' => $_ENV['DB_CHARSET'] ?? 'utf8mb4',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ]
    ],
    
    'cors' => [
        'allowed_origins' => explode(',', $_ENV['CORS_ALLOWED_ORIGINS'] ?? '*'),
        'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        'allowed_headers' => [
            'Content-Type',
            'Authorization', 
            'Accept', 
            'Origin', 
            'X-Requested-With',
            'X-Api-Key'
        ],
        'allow_credentials' => filter_var($_ENV['CORS_ALLOW_CREDENTIALS'] ?? 'true', FILTER_VALIDATE_BOOLEAN),
        'max_age' => (int)($_ENV['CORS_MAX_AGE'] ?? 86400), // 24 hours
    ],
    
    'logging' => [
        'level' => $_ENV['LOG_LEVEL'] ?? 'info',
        'file' => $_ENV['LOG_FILE'] ?? 'logs/app.log',
        'max_files' => 30,
        'enable_activity_logging' => true,
        'log_failed_attempts' => true,
        'log_successful_logins' => true,
    ],
    
    'activity_cleanup' => [
        'enabled' => true,
        'days_to_keep' => 90,
        'run_cleanup_probability' => 0.01, // 1% chance per request
    ]
];