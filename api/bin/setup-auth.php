<?php

/**
 * Database Setup for Existing Schema
 * Works with the existing admin_users table structure
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

echo "🔧 Setting up Authentication for Existing Schema...\n";
echo "📊 Database: {$database}\n";

try {
    $dsn = "mysql:host={$host};port={$port}";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    $pdo->exec("USE `{$database}`");
    echo "✅ Connected to database\n\n";
    
    // Check existing admin_users table
    $stmt = $pdo->query("DESCRIBE admin_users");
    $columns = $stmt->fetchAll();
    $columnNames = array_column($columns, 'Field');
    
    echo "📋 Existing admin_users columns: " . implode(', ', $columnNames) . "\n\n";
    
    // The existing table has 'name' instead of 'first_name' and 'last_name'
    // Let's work with what we have
    
    // Create our additional tables that don't conflict
    echo "Creating additional authentication tables...\n";
    
    // First, drop our custom tables if they exist (to start fresh)
    $customTables = ['activity_logs', 'refresh_tokens', 'admin_sessions'];
    foreach ($customTables as $table) {
        $pdo->exec("DROP TABLE IF EXISTS `{$table}`");
    }
    
    // Recreate activity_logs table
    echo "Creating activity_logs table...\n";
    $pdo->exec("
        CREATE TABLE activity_logs (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT UNSIGNED NOT NULL,
            action VARCHAR(100) NOT NULL,
            description TEXT,
            metadata JSON,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_action (action),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✅ activity_logs table created\n";
    
    // Create refresh_tokens table
    echo "Creating refresh_tokens table...\n";
    $pdo->exec("
        CREATE TABLE refresh_tokens (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            revoked_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45),
            user_agent TEXT,
            FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_token_hash (token_hash),
            INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✅ refresh_tokens table created\n";
    
    // Create simplified admin_sessions table
    echo "Creating admin_sessions table...\n";
    $pdo->exec("
        CREATE TABLE admin_sessions (
            id VARCHAR(128) PRIMARY KEY,
            user_id BIGINT UNSIGNED NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            last_activity TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✅ admin_sessions table created\n";
    
    // Check if we have any admin users
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM admin_users WHERE role IN ('super_admin', 'admin')");
    $adminCount = $stmt->fetch()['count'];
    
    if ($adminCount == 0) {
        echo "\nCreating default admin user...\n";
        $defaultPassword = password_hash('admin123', PASSWORD_DEFAULT);
        $pdo->exec("
            INSERT INTO admin_users (
                name, 
                email, 
                password_hash, 
                role, 
                status, 
                password_changed_at,
                created_at,
                updated_at
            ) VALUES (
                'System Administrator',
                'admin@example.com',
                '{$defaultPassword}',
                'super_admin',
                'active',
                NOW(),
                NOW(),
                NOW()
            )
        ");
        echo "✅ Default admin user created\n";
    } else {
        echo "\n✅ Found {$adminCount} existing admin user(s)\n";
    }
    
    // Show current admin users
    $stmt = $pdo->query("SELECT id, name, email, role, status FROM admin_users WHERE role IN ('super_admin', 'admin') LIMIT 5");
    $admins = $stmt->fetchAll();
    
    echo "\n👥 Admin Users:\n";
    foreach ($admins as $admin) {
        echo "  - ID: {$admin['id']}, Email: {$admin['email']}, Name: {$admin['name']}, Role: {$admin['role']}, Status: {$admin['status']}\n";
    }
    
    if ($adminCount == 0) {
        echo "\n📧 Default login credentials:\n";
        echo "  Email: admin@example.com\n";
        echo "  Password: admin123\n";
        echo "  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!\n";
    }
    
    echo "\n🎉 Authentication setup completed!\n";
    echo "\n🚀 Next steps:\n";
    echo "1. Start your API server\n";
    echo "2. Test authentication endpoints\n";
    echo "3. Update AdminUserRepository to work with 'name' field\n";
    
} catch (Exception $e) {
    echo "\n❌ Setup failed: " . $e->getMessage() . "\n";
    exit(1);
}