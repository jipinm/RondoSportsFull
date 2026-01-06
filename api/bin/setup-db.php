<?php

/**
 * Simple Database Setup Script
 * Creates the essential tables for authentication
 */

require_once __DIR__ . '/../vendor/autoload.php';

// Load environment variables
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && !str_starts_with($line, '#')) {
            [$key, $value] = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

$host = $_ENV['DB_HOST'] ?? 'localhost';
$port = $_ENV['DB_PORT'] ?? '3306';
$username = $_ENV['DB_USER'] ?? 'root';
$password = $_ENV['DB_PASS'] ?? '';
$database = $_ENV['DB_NAME'] ?? 'rondo';
$charset = $_ENV['DB_CHARSET'] ?? 'utf8mb4';

echo "🔧 Setting up Authentication Tables...\n";
echo "📊 Database: {$database}\n";

try {
    $dsn = "mysql:host={$host};port={$port};charset={$charset}";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    // Create database if needed
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET {$charset} COLLATE {$charset}_unicode_ci");
    $pdo->exec("USE `{$database}`");
    
    echo "✅ Connected to database\n\n";
    
    // Create admin_users table first (no foreign keys)
    echo "Creating admin_users table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admin_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            role ENUM('admin', 'moderator', 'viewer') NOT NULL DEFAULT 'viewer',
            status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
            failed_login_attempts INT DEFAULT 0,
            locked_until TIMESTAMP NULL,
            last_login_at TIMESTAMP NULL,
            last_login_ip VARCHAR(45) NULL,
            password_changed_at TIMESTAMP NULL,
            must_change_password BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by INT NULL,
            updated_by INT NULL,
            INDEX idx_email (email),
            INDEX idx_status (status),
            INDEX idx_role (role),
            INDEX idx_last_login (last_login_at),
            INDEX idx_locked_until (locked_until)
        ) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✅ admin_users table created\n";
    
    // Create activity_logs table
    echo "Creating activity_logs table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS activity_logs (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            action VARCHAR(100) NOT NULL,
            description TEXT,
            metadata JSON,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_action (action),
            INDEX idx_created_at (created_at),
            INDEX idx_user_action (user_id, action),
            INDEX idx_ip_address (ip_address)
        ) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✅ activity_logs table created\n";
    
    // Create refresh_tokens table
    echo "Creating refresh_tokens table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token_hash VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            revoked_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45),
            user_agent TEXT,
            INDEX idx_user_id (user_id),
            INDEX idx_token_hash (token_hash),
            INDEX idx_expires_at (expires_at),
            INDEX idx_revoked_at (revoked_at)
        ) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✅ refresh_tokens table created\n";
    
    // Create admin_sessions table (simplified)
    echo "Creating admin_sessions table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admin_sessions (
            id VARCHAR(128) PRIMARY KEY,
            user_id INT NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            last_activity TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            INDEX idx_user_id (user_id),
            INDEX idx_expires_at (expires_at),
            INDEX idx_last_activity (last_activity)
        ) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✅ admin_sessions table created\n";
    
    // Insert default admin user
    echo "\nCreating default admin user...\n";
    $defaultPassword = password_hash('admin123', PASSWORD_DEFAULT);
    $pdo->exec("
        INSERT IGNORE INTO admin_users (
            email, 
            password_hash, 
            first_name, 
            last_name, 
            role, 
            status, 
            password_changed_at,
            must_change_password
        ) VALUES (
            'admin@example.com',
            '{$defaultPassword}',
            'System',
            'Administrator',
            'admin',
            'active',
            NOW(),
            TRUE
        )
    ");
    
    // Check if user was created
    $stmt = $pdo->query("SELECT id, email, first_name, last_name, role FROM admin_users WHERE email = 'admin@example.com'");
    $admin = $stmt->fetch();
    
    if ($admin) {
        echo "✅ Default admin user created:\n";
        echo "   Email: {$admin['email']}\n";
        echo "   Password: admin123 (⚠️  CHANGE THIS!)\n";
        echo "   Name: {$admin['first_name']} {$admin['last_name']}\n";
        echo "   Role: {$admin['role']}\n";
    }
    
    echo "\n🎉 Database setup completed successfully!\n";
    echo "\n🔐 Next steps:\n";
    echo "1. Start your API server\n";
    echo "2. Test login with: admin@example.com / admin123\n";
    echo "3. Change the default password immediately!\n";
    
} catch (Exception $e) {
    echo "\n❌ Setup failed: " . $e->getMessage() . "\n";
    exit(1);
}