<?php

/**
 * Debug Database Script
 * Check current table structure
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

try {
    $dsn = "mysql:host={$host};port={$port}";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    $pdo->exec("USE `{$database}`");
    
    echo "🔍 Checking current database structure...\n\n";
    
    // Show all tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "📊 Tables found: " . implode(', ', $tables) . "\n\n";
    
    // Check admin_users table structure if it exists
    if (in_array('admin_users', $tables)) {
        echo "🔍 admin_users table structure:\n";
        $stmt = $pdo->query("DESCRIBE admin_users");
        $columns = $stmt->fetchAll();
        
        foreach ($columns as $column) {
            echo "  - {$column['Field']} ({$column['Type']}) {$column['Null']} {$column['Key']}\n";
        }
    } else {
        echo "❌ admin_users table not found\n";
    }
    
    echo "\n";
    
    // Drop tables to start fresh
    echo "🗑️  Dropping existing tables to start fresh...\n";
    $dropTables = ['admin_sessions', 'refresh_tokens', 'activity_logs', 'admin_users'];
    
    foreach ($dropTables as $table) {
        if (in_array($table, $tables)) {
            $pdo->exec("DROP TABLE `{$table}`");
            echo "  ✅ Dropped {$table}\n";
        }
    }
    
    echo "\n✨ Database cleaned. You can now run setup-db.php again.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}